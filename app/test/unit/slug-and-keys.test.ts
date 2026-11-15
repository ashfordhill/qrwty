import { describe, expect, it } from "vitest";
import {
	keyHash,
	requestHash,
	scopeHash,
	validGuestHandle,
	validKey,
} from "../../src/modules/link-api/link-operations/idempotency.ts";
import {
	parseKeyRing,
	seal,
	unseal,
} from "../../src/modules/link-api/link-operations/replay-seal.ts";
import {
	isReservedSlug,
	MAX_COLLISION_RETRIES,
	RESERVED_PATHS,
	randomSlug,
	SLUG_PATTERN,
	slugCandidates,
} from "../../src/modules/link-api/link-operations/slug.ts";

describe("slugs", () => {
	it("are 10 base62 characters, all distinct over 10,000 draws", () => {
		const slugs = Array.from({ length: 10_000 }, () => randomSlug());
		expect(slugs.every((s) => SLUG_PATTERN.test(s))).toBe(true);
		expect(new Set(slugs).size).toBe(slugs.length);
	});
	it("use every base62 character, with no byte bias", () => {
		const counts = new Map<string, number>();
		for (let i = 0; i < 20_000; i++)
			for (const c of randomSlug()) counts.set(c, (counts.get(c) ?? 0) + 1);
		expect(counts.size).toBe(62);
		const expected = 200_000 / 62;
		for (const n of counts.values()) expect(Math.abs(n - expected) / expected).toBeLessThan(0.1);
	});
	it("discard bytes at or above 248 instead of wrapping them", () => {
		// 61, 123, 185 and 247 are 'z'; 0, 62, 124 and 186 are '0'; 248..255 are skipped.
		const bytes = [255, 248, 247, 0, 61, 62, 123, 124, 185, 186, 10, 9];
		const random = (size: number) => Uint8Array.from({ length: size }, (_, i) => bytes[i] ?? 1);
		expect(randomSlug(random)).toBe("z0z0z0z0A9");
	});
	it("never match a reserved path, in any case", () => {
		for (const path of RESERVED_PATHS) {
			expect(isReservedSlug(path)).toBe(true);
			expect(isReservedSlug(path.toUpperCase())).toBe(true);
		}
		expect(isReservedSlug("AbCdEfGhIj")).toBe(false);
	});
	it("give at most 1 + 5 candidates, forced ones first", () => {
		expect([...slugCandidates()]).toHaveLength(1 + MAX_COLLISION_RETRIES);
		const forced = [...slugCandidates(["AAAAAAAAAA"])];
		expect(forced).toHaveLength(6);
		expect(forced[0]).toBe("AAAAAAAAAA");
		expect(new Set(forced.slice(1)).size).toBe(5);
		expect([...slugCandidates(Array(9).fill("BBBBBBBBBB"))]).toHaveLength(6);
	});
});

describe("idempotency keys and scopes", () => {
	it("accept 1–255 visible ASCII characters only", () => {
		expect(validKey("a")).toBe(true);
		expect(validKey("x".repeat(255))).toBe(true);
		for (const bad of [undefined, "", "x".repeat(256), "a b", "ü", "a\tb"])
			expect(validKey(bad)).toBe(false);
	});
	it("accept an opaque guest handle only", () => {
		expect(validGuestHandle("A".repeat(43))).toBe(true);
		for (const bad of [undefined, "short", "A".repeat(129), `${"A".repeat(30)}=`])
			expect(validGuestHandle(bad)).toBe(false);
	});
	it("separate guests from accounts and keys from scopes", () => {
		expect(scopeHash({ kind: "guest", handle: "same" })).not.toEqual(
			scopeHash({ kind: "account", subject: "same" }),
		);
		expect(keyHash("k")).not.toEqual(scopeHash({ kind: "guest", handle: "k" }));
		expect(scopeHash({ kind: "guest", handle: "a" })).toHaveLength(32);
	});
	it("hash a request by operation and fields, independent of field order", () => {
		const a = requestHash("create-link", { destination: "https://e.com", expiresAt: null });
		const b = requestHash("create-link", { expiresAt: null, destination: "https://e.com" });
		expect(a).toEqual(b);
		expect(
			requestHash("create-link", { destination: "https://e.com/x", expiresAt: null }),
		).not.toEqual(a);
		expect(requestHash("claim", { destination: "https://e.com", expiresAt: null })).not.toEqual(a);
	});
});

describe("the sealed replay payload", () => {
	const key = (byte: number) => Buffer.alloc(32, byte).toString("base64url");
	const ring = parseKeyRing(`k2\t${key(2)}\nk1 ${key(1)}\n`);
	it("round-trips under its own link only", () => {
		const sealed = seal(ring, "proof-value", "link-1");
		expect(sealed.includes(Buffer.from("proof-value"))).toBe(false);
		expect(unseal(ring, sealed, "link-1")).toBe("proof-value");
		expect(unseal(ring, sealed, "link-2")).toBeUndefined();
	});
	it("detects a changed byte", () => {
		const sealed = seal(ring, "proof-value", "link-1");
		const last = sealed.length - 1;
		sealed[last] = (sealed[last] ?? 0) ^ 1;
		expect(unseal(ring, sealed, "link-1")).toBeUndefined();
	});
	it("seals with the first key and opens with any listed key", () => {
		const old = parseKeyRing(`k1 ${key(1)}`);
		const sealedOld = seal(old, "p", "l");
		expect(unseal(ring, sealedOld, "l")).toBe("p");
		const sealedNew = seal(ring, "p", "l");
		expect(sealedNew.subarray(2, 4).toString()).toBe("k2");
		expect(unseal(old, sealedNew, "l")).toBeUndefined();
	});
	it("refuses a malformed key ring", () => {
		for (const bad of ["", "k1", `k1 ${key(1)} extra`, "k1 c2hvcnQ", `K1 ${key(1)}`]) {
			expect(() => parseKeyRing(bad)).toThrow(/Invalid replay key ring/);
		}
		expect(() => parseKeyRing(`k1 ${key(1)}\nk1 ${key(2)}`)).toThrow(/twice/);
	});
});
