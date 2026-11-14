import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { decodePng } from "../src/browser/qr.ts";
import { BOT_AGENTS, HUMAN_AGENTS, isBotV1, knownStream } from "../src/fixtures/clicks.ts";
import { ACCEPTED, paddedUrl, rejected } from "../src/fixtures/destinations.ts";
import { poisonMessages } from "../src/fixtures/poison.ts";
import { startWebRisk } from "../src/fixtures/webrisk.ts";

describe("A09 corpus", () => {
	it("has the 10 accepted and 33 rejected entries of acceptance-oracle.md", () => {
		expect(ACCEPTED).toHaveLength(10);
		expect(rejected("http://qrwty.localhost:1")).toHaveLength(33);
		expect(Buffer.byteLength(paddedUrl(8192))).toBe(8192);
		expect(ACCEPTED.find((c) => c.note.includes("IDN"))?.expected).toBe(
			"https://xn--mnchen-3ya.example.com/oracle/a09/idn",
		);
		expect(rejected("http://o").filter((r) => /[\r\n\t\0]/.test(r))).toHaveLength(3);
	});
});

describe("click fixtures", () => {
	it("classifies filter-v1 bots", () => {
		expect(BOT_AGENTS.every(isBotV1)).toBe(true);
		expect(HUMAN_AGENTS.some(isBotV1)).toBe(false);
	});
	it("builds a deterministic stream of every kind", () => {
		const stream = knownStream({ human: 3, bot: 2, head: 1, synthetic: 1, probe: 1 });
		expect(stream).toHaveLength(8);
		expect(new Set(stream.map((s) => s.kind))).toEqual(
			new Set(["human", "bot", "head", "synthetic", "probe"]),
		);
	});
	it("has three poison messages", () => {
		const poison = poisonMessages("lnk_1");
		expect(poison.map((p) => p.name)).toEqual([
			"invalid-json",
			"schema-version-999",
			"missing-link-id",
		]);
		expect(() => JSON.parse(poison[0].data.toString())).toThrow();
		expect(JSON.parse(poison[2].data.toString()).linkId).toBeUndefined();
	});
});

describe("Web Risk fixture", () => {
	it("answers uris.search by path marker and records calls", async () => {
		const fixture = await startWebRisk();
		fixture.slowMs = 300;
		const search = async (uri: string) => {
			const url = new URL("/v1/uris:search", fixture.url);
			url.searchParams.set("uri", uri);
			for (const t of ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"])
				url.searchParams.append("threatTypes", t);
			url.searchParams.set("key", "not-a-real-key");
			const started = Date.now();
			const r = await fetch(url);
			return { status: r.status, body: await r.json(), ms: Date.now() - started };
		};
		expect((await search("https://example.com/ok")).body).toEqual({});
		const unsafe = await search("https://example.com/oracle/unsafe/x");
		expect(unsafe.body.threat.threatTypes).toEqual(["MALWARE"]);
		expect((await search("https://example.com/oracle/error/x")).status).toBe(500);
		expect((await search("https://example.com/oracle/slow/x")).ms).toBeGreaterThanOrEqual(290);
		expect(fixture.calls.map((c) => c.verdict)).toEqual(["clean", "threat", "error", "slow"]);
		expect(fixture.calls.every((c) => c.apiKeyPresent && c.threatTypes.length === 3)).toBe(true);
		await fixture.close();
	});
});

describe("QR decoding", () => {
	it("decodes a PNG with jsQR and pngjs", async () => {
		const png = await QRCode.toBuffer("http://qrwty.localhost:47100/AbCdEfGhIj", {
			type: "png",
			margin: 4,
			width: 300,
		});
		expect(decodePng(png)).toBe("http://qrwty.localhost:47100/AbCdEfGhIj");
	});
});
