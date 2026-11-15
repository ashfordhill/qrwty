import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSchema, ORACLE_ROOT } from "../src/adapter.ts";
import { UI_KEYS } from "../src/browser/names.ts";
import { FROZEN_UI_NAMES_PATH, loadUiNames } from "../src/runner.ts";
import { validate } from "../src/schema.ts";

// Q11's docs/design/accessible-names.json (QRWTY commit d67f5fe), copied by pack v1.5.
const Q11_VERSION = "q11-2026-11-14.1";
const Q11_SHA256 = "e88d47dc4f502037f9e05906e8c8a4a3f7b57aab579db049c6ffb90b4ba1be07";

describe("frozen UI names (pack v1.5)", () => {
	it("is the pack's copy of Q11's list, loaded by default", () => {
		expect(FROZEN_UI_NAMES_PATH).toBe(
			resolve(ORACLE_ROOT, "..", "files/docs/design/accessible-names.json"),
		);
		const loaded = loadUiNames();
		expect(loaded.version).toBe(Q11_VERSION);
		expect(loaded.sha256).toBe(Q11_SHA256);
	});

	it("validates against ui-names.schema.json", () => {
		const value = JSON.parse(readFileSync(FROZEN_UI_NAMES_PATH, "utf8"));
		expect(validate(loadSchema("ui-names.schema.json"), value)).toEqual([]);
	});

	it("names every logical control the browser rows drive", () => {
		const { names } = loadUiNames();
		expect(Object.keys(UI_KEYS).filter((key) => !names[key])).toEqual([]);
	});

	it("refuses a list that does not match the schema", () => {
		const dir = mkdtempSync(join(tmpdir(), "oracle-ui-names-"));
		const path = join(dir, "names.json");
		writeFileSync(
			path,
			JSON.stringify({ version: "x", names: { "create.submit": { role: "blink", name: "Go" } } }),
		);
		expect(() => loadUiNames(path)).toThrow(/names\.json/);
	});

	it("the CLI refuses --ui-names, so no arm supplies its own list", () => {
		const result = spawnSync(
			process.execPath,
			[
				resolve(ORACLE_ROOT, "src/cli.ts"),
				"run",
				"--adapter",
				"oracle-adapter.json",
				"--out",
				"out",
				"--ui-names",
				"names.json",
			],
			{ encoding: "utf8", cwd: tmpdir() },
		);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain("--ui-names was removed in pack v1.5");
	});
});
