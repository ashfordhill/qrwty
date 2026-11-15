// Link API's own configuration: its stub declares its settings (QL05), and the generated
// configuration pass reads them at startup; a missing or invalid one fails, naming it, never its
// value.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { settings } from "../../src/modules/link-api/link-api-link-operations.ts";
import { linkOperationsFor } from "../../src/modules/link-api/link-operations/service.ts";
import { publicOrigin } from "../../src/modules/link-api/link-operations/settings.ts";
import { readSettings } from "../../src/runtime/settings.ts";

const dir = mkdtempSync(join(tmpdir(), "qrwty-a1-config-"));
const ring = `k1 ${Buffer.alloc(32, 3).toString("base64url")}\n`;
const NAMES = [
	"SECRET_DIR",
	"JEEVES_SECRET_LINK_REPLAY_KEYS_FILE",
	"QRWTY_PUBLIC_ORIGIN_URL",
	"QRWTY_REPUTATION_CREDENTIALS",
	"QRWTY_TEST_HOOKS",
];
const saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]));
afterEach(() => {
	for (const name of NAMES)
		if (saved[name] === undefined) delete process.env[name];
		else process.env[name] = saved[name];
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Link API's configuration pass, for these variables and a key ring file (`null`: none). */
function read(env: Record<string, string>, ringText: string | null = ring) {
	for (const name of NAMES) delete process.env[name];
	const secrets = mkdtempSync(join(dir, "secrets-"));
	if (ringText !== null) writeFileSync(join(secrets, "link-replay-keys"), ringText);
	Object.assign(process.env, { SECRET_DIR: secrets }, env);
	return readSettings("link-api-link-operations", settings);
}
const origin = { QRWTY_PUBLIC_ORIGIN_URL: "https://qrwty.io" };

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
	it("fails startup when missing or not an origin", () => {
		expect(() => read({})).toThrow(/^Invalid setting QRWTY_PUBLIC_ORIGIN_URL$/);
		expect(() => read({ QRWTY_PUBLIC_ORIGIN_URL: "https://qrwty.io/x" })).toThrow(
			/^Invalid setting QRWTY_PUBLIC_ORIGIN_URL$/,
		);
	});
});

describe("startup", () => {
	it("needs the replay key ring, and names it without its value", () => {
		expect(() => read(origin, null)).toThrow(/^Invalid setting LINK_REPLAY_KEYS$/);
		expect(() => read(origin, "k1 short\n")).toThrow(/^Invalid setting LINK_REPLAY_KEYS$/);
	});
	it("reads the key ring from JEEVES_SECRET_LINK_REPLAY_KEYS_FILE when that is set (QG34)", () => {
		const file = join(dir, "own-file");
		writeFileSync(file, `k2 ${Buffer.alloc(32, 4).toString("base64url")}\n`);
		const values = read({ ...origin, JEEVES_SECRET_LINK_REPLAY_KEYS_FILE: file });
		expect(values.LINK_REPLAY_KEYS.current).toBe("k2");
		expect(() =>
			read({ ...origin, JEEVES_SECRET_LINK_REPLAY_KEYS_FILE: join(dir, "missing") }),
		).toThrow(/^Invalid setting LINK_REPLAY_KEYS$/);
	});
	it("starts with an origin and a key ring, and refuses a test-hook value other than on", () => {
		const values = read(origin);
		expect(values.QRWTY_PUBLIC_ORIGIN_URL.origin).toBe("https://qrwty.io");
		expect(values.LINK_REPLAY_KEYS.current).toBe("k1");
		expect(values.QRWTY_TEST_HOOKS).toBeUndefined();
		expect(typeof linkOperationsFor(values)).toBe("function");
		expect(linkOperationsFor(values)).toBe(linkOperationsFor(values));
		expect(read({ ...origin, QRWTY_TEST_HOOKS: "on" }).QRWTY_TEST_HOOKS).toBe("on");
		expect(() => read({ ...origin, QRWTY_TEST_HOOKS: "1" })).toThrow(
			/^Invalid setting QRWTY_TEST_HOOKS$/,
		);
	});
});
