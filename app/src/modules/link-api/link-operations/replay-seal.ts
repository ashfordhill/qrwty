// The sealed replay payload (product contract, "Anonymous creation and claiming"): a create's
// replay must return the claim proof, so the idempotency record keeps it encrypted with a rotated
// service key, AES-256-GCM, bound to its link. The database never holds the key.
//
// Key ring: the credential file `link-replay-keys`, one key per line, `<kid> <32 bytes base64url>`.
// The first line seals; every line opens. Rotate by adding a new first line and removing the old
// one after 24 hours (the replay window); a record sealed with a removed key can't be replayed.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = 1;
const KID = /^[a-z0-9][a-z0-9-]{0,31}$/;

export type KeyRing = { current: string; keys: ReadonlyMap<string, Buffer> };

export function parseKeyRing(text: string): KeyRing {
	const keys = new Map<string, Buffer>();
	let current: string | undefined;
	for (const line of text.split("\n").map((l) => l.trim())) {
		if (line === "" || line.startsWith("#")) continue;
		const [kid, encoded, extra] = line.split(/\s+/);
		if (!kid || !encoded || extra !== undefined || !KID.test(kid))
			throw new Error("Invalid replay key ring: each line is <kid> <key>");
		const key = Buffer.from(encoded, "base64url");
		if (key.length !== 32 || key.toString("base64url") !== encoded.replace(/=+$/, ""))
			throw new Error(`Invalid replay key ring: key ${kid} is not 32 bytes of base64url`);
		if (keys.has(kid)) throw new Error(`Invalid replay key ring: key ${kid} appears twice`);
		keys.set(kid, key);
		current ??= kid;
	}
	if (current === undefined) throw new Error("Invalid replay key ring: no key");
	return { current, keys };
}

/** `[version][kid length][kid][12-byte IV][ciphertext][16-byte tag]`. */
export function seal(ring: KeyRing, plaintext: string, aad: string): Buffer {
	const key = ring.keys.get(ring.current);
	if (!key) throw new Error("Replay key ring has no current key");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	cipher.setAAD(Buffer.from(aad, "utf8"));
	const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const kid = Buffer.from(ring.current, "ascii");
	return Buffer.concat([Buffer.from([VERSION, kid.length]), kid, iv, body, cipher.getAuthTag()]);
}

/** The plaintext, or undefined when the payload is malformed, its key is gone or it was altered. */
export function unseal(ring: KeyRing, sealed: Uint8Array, aad: string): string | undefined {
	const data = Buffer.from(sealed);
	if (data.length < 2 || data[0] !== VERSION) return undefined;
	const kidLength = data[1] ?? 0;
	const kid = data.subarray(2, 2 + kidLength).toString("ascii");
	const key = ring.keys.get(kid);
	const rest = data.subarray(2 + kidLength);
	if (!key || rest.length < 12 + 16) return undefined;
	try {
		const decipher = createDecipheriv("aes-256-gcm", key, rest.subarray(0, 12));
		decipher.setAAD(Buffer.from(aad, "utf8"));
		decipher.setAuthTag(rest.subarray(rest.length - 16));
		return Buffer.concat([
			decipher.update(rest.subarray(12, rest.length - 16)),
			decipher.final(),
		]).toString("utf8");
	} catch {
		return undefined;
	}
}
