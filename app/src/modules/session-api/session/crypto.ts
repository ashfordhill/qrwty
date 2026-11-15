// Session API's cryptography, all with the SESSION_KEYS ring (node:crypto only). Each purpose has
// its own subkey (HMAC-SHA-256 of the ring key and the purpose), so a MAC for one purpose never
// verifies as another. The first key signs and seals; every key verifies and opens, so the ring
// rotates by adding a new first key.
import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import type { KeyRing, RingKey } from "../../../runtime/settings.ts";

const subkey = (key: RingKey, purpose: string) =>
	createHmac("sha256", key.key).update(`qrwty-session-v1/${purpose}`).digest();

export const sha256 = (value: string | Uint8Array): Buffer =>
	createHash("sha256").update(value).digest();
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** A base64url HMAC of `value` for `purpose`, with the ring's first key. */
export function mac(ring: KeyRing, purpose: string, value: string): string {
	return createHmac("sha256", subkey(ring.current, `mac/${purpose}`))
		.update(value)
		.digest("base64url");
}

/** Whether `candidate` is the MAC of `value` for `purpose` under any key of the ring. */
export function verifyMac(ring: KeyRing, purpose: string, value: string, candidate: string) {
	const given = Buffer.from(candidate);
	return ring.entries.some((key) => {
		const expected = Buffer.from(
			createHmac("sha256", subkey(key, `mac/${purpose}`))
				.update(value)
				.digest("base64url"),
		);
		return expected.length === given.length && timingSafeEqual(expected, given);
	});
}

/** AES-256-GCM: [kid length][kid][iv 12][tag 16][ciphertext], bound to `aad`. */
export function seal(ring: KeyRing, plaintext: string, aad: string): Buffer {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", subkey(ring.current, "seal"), iv);
	cipher.setAAD(Buffer.from(aad));
	const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const kid = Buffer.from(ring.current.id);
	return Buffer.concat([Buffer.from([kid.length]), kid, iv, cipher.getAuthTag(), body]);
}

/** The sealed text, or undefined when no key of the ring opens it for `aad`. */
export function unseal(ring: KeyRing, sealed: Uint8Array, aad: string): string | undefined {
	const bytes = Buffer.from(sealed);
	const length = bytes[0] ?? 0;
	const kid = bytes.subarray(1, 1 + length).toString();
	const key = ring.entries.find((entry) => entry.id === kid);
	if (!key || bytes.length < 1 + length + 28) return undefined;
	const at = 1 + length;
	try {
		const decipher = createDecipheriv(
			"aes-256-gcm",
			subkey(key, "seal"),
			bytes.subarray(at, at + 12),
		);
		decipher.setAAD(Buffer.from(aad));
		decipher.setAuthTag(bytes.subarray(at + 12, at + 28));
		return Buffer.concat([decipher.update(bytes.subarray(at + 28)), decipher.final()]).toString(
			"utf8",
		);
	} catch {
		return undefined;
	}
}
