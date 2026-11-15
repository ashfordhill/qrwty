// The browser's network, for guest admission (Q09). The qrwty.io Worker is the only caller that
// knows the visitor's address (Cloudflare's CF-Connecting-IP), and Session API's run.app URL is also
// reachable without it, so an X-Forwarded-For header proves nothing. The Worker therefore sends
//   QRWTY-Client-Address    the address, as Cloudflare gives it
//   QRWTY-Client-Signature  v1.<unix seconds>.<base64url HMAC-SHA-256(key, "qrwty-client-v1\n" +
//                           seconds + "\n" + address)>
// with the client-address key (Secret Manager `qrwtya-client-address-key`, a Worker secret too), and
// drops any QRWTY-Client-* header a browser sent. Session API accepts a signature within 60 seconds
// of its clock, reduces the address to its network (IPv4 /32, IPv6 /64; an IPv4-mapped IPv6 address
// is IPv4) and sends Link API only a keyed hash of that network, `QRWTY-Admission-Key`. The address
// itself is never stored, logged or sent further. Anything unsigned, stale or malformed shares one
// key, `unverified`, which the same limit bounds.
import { createHmac, timingSafeEqual } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";

export const CLIENT_ADDRESS_HEADER = "qrwty-client-address";
export const CLIENT_SIGNATURE_HEADER = "qrwty-client-signature";
export const SIGNATURE_WINDOW_SECONDS = 60;
export const UNVERIFIED = "unverified";

/** The key file's text, trimmed (a newline at its end is not part of the key). */
export const clientKeyBytes = (key: Uint8Array) =>
	Buffer.from(Buffer.from(key).toString("utf8").trim(), "utf8");

export const clientSignature = (key: Uint8Array, seconds: number, address: string) =>
	createHmac("sha256", clientKeyBytes(key))
		.update(`qrwty-client-v1\n${seconds}\n${address}`)
		.digest("base64url");

/** The network an address belongs to for admission: `4:<a.b.c.d>` or `6:<first 4 groups>`. */
export function networkOf(address: string): string | undefined {
	if (isIPv4(address)) return `4:${address}`;
	if (!isIPv6(address) || address.includes("%")) return undefined;
	let text = address.toLowerCase();
	// An embedded IPv4 tail becomes two groups.
	const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
	if (tail?.[1]) {
		const octets = tail[1].split(".").map(Number);
		const [a = 0, b = 0, c = 0, d = 0] = octets;
		text = `${text.slice(0, -tail[1].length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
	}
	const [head = "", rest] = text.split("::");
	const left = head ? head.split(":") : [];
	const right = rest === undefined ? [] : rest ? rest.split(":") : [];
	const groups =
		rest === undefined
			? left
			: [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
	if (groups.length !== 8) return undefined;
	const full = groups.map((group) => group.padStart(4, "0"));
	// ::ffff:a.b.c.d is an IPv4 client.
	if (full.slice(0, 5).every((group) => group === "0000") && full[5] === "ffff") {
		const high = Number.parseInt(full[6] ?? "0", 16);
		const low = Number.parseInt(full[7] ?? "0", 16);
		return `4:${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
	}
	return `6:${full.slice(0, 4).join(":")}`;
}

const one = (headers: Record<string, string | string[] | undefined>, name: string) => {
	const value = headers[name];
	return typeof value === "string" ? value : undefined;
};

/** The Worker-signed address of this request, or undefined. */
export function verifiedAddress(
	headers: Record<string, string | string[] | undefined>,
	key: Uint8Array | undefined,
	nowSeconds = Math.floor(Date.now() / 1000),
): string | undefined {
	if (!key) return undefined;
	const address = one(headers, CLIENT_ADDRESS_HEADER);
	const signature = one(headers, CLIENT_SIGNATURE_HEADER);
	if (!address || address.length > 64 || !signature) return undefined;
	const m = /^v1\.([1-9][0-9]{0,11})\.([A-Za-z0-9_-]{43})$/.exec(signature);
	if (!m?.[1] || !m[2]) return undefined;
	const seconds = Number(m[1]);
	if (Math.abs(seconds - nowSeconds) > SIGNATURE_WINDOW_SECONDS) return undefined;
	const expected = Buffer.from(clientSignature(key, seconds, address));
	const given = Buffer.from(m[2]);
	return expected.length === given.length && timingSafeEqual(expected, given) ? address : undefined;
}

/** Link API's admission key for this request: a keyed hash of its verified network, else
 * `unverified`. */
export function admissionKeyFor(
	headers: Record<string, string | string[] | undefined>,
	key: Uint8Array | undefined,
	nowSeconds?: number,
): string {
	const address = verifiedAddress(headers, key, nowSeconds);
	const network = address === undefined ? undefined : networkOf(address);
	if (!key || network === undefined) return UNVERIFIED;
	const hashing = createHmac("sha256", clientKeyBytes(key))
		.update("qrwty-admission-key-v1")
		.digest();
	return createHmac("sha256", hashing).update(network).digest("base64url");
}
