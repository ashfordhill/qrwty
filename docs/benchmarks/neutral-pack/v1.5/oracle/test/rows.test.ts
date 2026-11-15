import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CASES } from "../selftest/cases.ts";
import { ALL_ROWS, selectRows } from "../src/rows/index.ts";
import { lastPerReplica, lateOld, sameJson, slugOf } from "../src/rows/lib/flows.ts";
import { signedToken, unsignedToken } from "../src/rows/lib/jwt.ts";

const IDS = [
	...Array.from({ length: 24 }, (_, i) => `A${String(i + 1).padStart(2, "0")}`),
	...Array.from({ length: 10 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`),
	...Array.from({ length: 6 }, (_, i) => `R${String(i + 1).padStart(2, "0")}`),
	...Array.from({ length: 7 }, (_, i) => `U${String(i + 2).padStart(2, "0")}`),
];

describe("row registry", () => {
	it("has one module per acceptance ID", () => {
		expect(ALL_ROWS.map((r) => r.id)).toEqual(IDS);
		expect(selectRows(["a09", "U08"]).map((r) => r.id)).toEqual(["A09", "U08"]);
		expect(() => selectRows(["Z99"])).toThrow(/unknown/);
	});
	it("states coverage honestly", () => {
		for (const row of ALL_ROWS) {
			expect(row.expected.length).toBeGreaterThan(20);
			if (row.coverage === "live-arm") expect(row.liveArmReason).toBeTruthy();
			if (row.coverage === "double")
				expect(CASES.some((c) => c.row === row.id && c.expect === "failed")).toBe(true);
		}
	});
	it("every self-test case names a row and a fault", () => {
		for (const c of CASES) {
			expect(IDS).toContain(c.row);
			expect(c.fault.length).toBeGreaterThan(3);
		}
		expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
	});
});

describe("row helpers", () => {
	it("finds late old results and the last observation per replica", () => {
		const obs = [
			{ replica: "r1", sentWallMs: 1000, sentMono: 10, status: 302, location: "a" },
			{ replica: "r2", sentWallMs: 1500, sentMono: 510, status: 302, location: "a" },
			{ replica: "r1", sentWallMs: 2500, sentMono: 1510, status: 410, location: null },
			{ replica: "r2", sentWallMs: 9600, sentMono: 1610, status: 302, location: "a" },
		];
		// lateOld compares monotonic send times: the wall-clock jump in obs[3] changes nothing.
		expect(lateOld(obs, 1000, (o) => o.status === 302)).toEqual([obs[3]]);
		expect(lateOld(obs, 1700, (o) => o.status === 302)).toEqual([]);
		expect(lastPerReplica(obs)).toEqual([obs[2], obs[3]]);
	});
	it("compares JSON independent of key order and extracts slugs", () => {
		expect(sameJson({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
		expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
		expect(slugOf("https://qrwty.io/AbCdEfGhIj")).toBe("AbCdEfGhIj");
	});
	it("forges tokens: alg none and a verifiable rogue signature", () => {
		const none = unsignedToken({ iss: "i", aud: "a" });
		expect(JSON.parse(Buffer.from(none.split(".")[0], "base64url").toString()).alg).toBe("none");
		expect(none.endsWith(".")).toBe(true);
		const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
		const token = signedToken(
			{ iss: "i", aud: "a" },
			privateKey.export({ format: "jwk" }),
			"rogue",
		);
		const [h, p, s] = token.split(".");
		expect(JSON.parse(Buffer.from(h, "base64url").toString())).toMatchObject({
			alg: "ES256",
			kid: "rogue",
		});
		expect(
			verify(
				"sha256",
				Buffer.from(`${h}.${p}`),
				{ key: createPublicKey(privateKey), dsaEncoding: "ieee-p1363" },
				Buffer.from(s, "base64url"),
			),
		).toBe(true);
	});
});
