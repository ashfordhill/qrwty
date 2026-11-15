// Link API's own configuration: read once at startup; a missing or invalid one fails, naming it.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	linkOperationsFromEnvironment,
	publicOrigin,
} from "../../src/modules/link-api/link-operations/service.ts";

const dir = mkdtempSync(join(tmpdir(), "qrwty-q06-config-"));
const ring = `k1 ${Buffer.alloc(32, 3).toString("base64url")}\n`;
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("QRWTY_PUBLIC_ORIGIN_URL", () => {
	it("is the origin itself", () => {
		expect(publicOrigin("https://qrwty.io").hostname).toBe("qrwty.io");
		expect(publicOrigin("http://127.0.0.1:47201").origin).toBe("http://127.0.0.1:47201");
		for (const bad of [
			undefined,
			"",
			"qrwty.io",
			"https://qrwty.io/",
			"https://qrwty.io/x",
			"ftp://qrwty.io",
		])
			expect(() => publicOrigin(bad)).toThrow(/^Invalid QRWTY_PUBLIC_ORIGIN_URL/);
	});
});

describe("startup", () => {
	const previous = process.env.SECRET_DIR;
	afterAll(() => {
		if (previous === undefined) delete process.env.SECRET_DIR;
		else process.env.SECRET_DIR = previous;
	});
	it("needs the replay key ring, and names it without its value", () => {
		process.env.SECRET_DIR = join(dir, "missing");
		expect(() =>
			linkOperationsFromEnvironment({ QRWTY_PUBLIC_ORIGIN_URL: "https://qrwty.io" }),
		).toThrow(/^Unreadable credential link-replay-keys$/);
		writeFileSync(join(dir, "link-replay-keys"), "k1 short\n");
		process.env.SECRET_DIR = dir;
		expect(() =>
			linkOperationsFromEnvironment({ QRWTY_PUBLIC_ORIGIN_URL: "https://qrwty.io" }),
		).toThrow(/^Unreadable credential link-replay-keys: Invalid replay key ring/);
	});
	it("starts with an origin and a key ring, and refuses a test-hook value other than on", () => {
		writeFileSync(join(dir, "link-replay-keys"), ring);
		process.env.SECRET_DIR = dir;
		expect(
			typeof linkOperationsFromEnvironment({ QRWTY_PUBLIC_ORIGIN_URL: "https://qrwty.io" }),
		).toBe("function");
		expect(() =>
			linkOperationsFromEnvironment({
				QRWTY_PUBLIC_ORIGIN_URL: "https://qrwty.io",
				QRWTY_TEST_HOOKS: "1",
			}),
		).toThrow(/QRWTY_TEST_HOOKS/);
		expect(() => linkOperationsFromEnvironment({})).toThrow(/QRWTY_PUBLIC_ORIGIN_URL/);
	});
});
