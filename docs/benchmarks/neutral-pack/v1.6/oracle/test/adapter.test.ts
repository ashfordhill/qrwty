import { describe, expect, it } from "vitest";
import { missingCapability, parseAdapter, proxiesFor } from "../src/adapter.ts";
import { DEFAULT_LOGINS, loginFor } from "../src/fixtures/accounts.ts";
import { validate } from "../src/schema.ts";
import { EXAMPLE_ADAPTER } from "./helpers.ts";

const parse = (value: unknown) => parseAdapter(JSON.stringify(value), "oracle-adapter.json");

describe("adapter manifest", () => {
	it("accepts a valid manifest and resolves proxies with a parent fallback", () => {
		const { adapter } = parse(EXAMPLE_ADAPTER);
		expect(adapter.arm).toBe("b");
		expect(proxiesFor(adapter, "postgres.billing")).toEqual(["qrwtyb-pg"]);
		expect(proxiesFor(adapter, "pubsub.publish")).toEqual(["qrwtyb-pubsub-pub"]);
		expect(proxiesFor(adapter, "valkey")).toEqual([]);
	});

	it("rejects unknown keys, missing fields, bad digests and unknown commands", () => {
		expect(() => parse({ ...EXAMPLE_ADAPTER, extra: 1 })).toThrow(/unknown key extra/);
		const { commit: _, ...noCommit } = EXAMPLE_ADAPTER;
		expect(() => parse(noCommit)).toThrow(/missing required commit/);
		expect(() => parse({ ...EXAMPLE_ADAPTER, images: { x: "latest" } })).toThrow(/does not match/);
		expect(() => parse({ ...EXAMPLE_ADAPTER, commands: { deploy: { argv: ["x"] } } })).toThrow(
			/unknown key deploy/,
		);
	});

	it("maps accounts to login identifiers with exactly one password source (v1.6)", () => {
		const base = { issuerUrl: "http://x", audience: "a" };
		const withIdentity = (identity: Record<string, unknown>) =>
			parse({ ...EXAMPLE_ADAPTER, identity }).adapter;
		// A v1.5 identity section still parses: the fixed names and one password variable.
		const v15 = withIdentity({
			...base,
			accounts: { alice: "oracle-alice", bob: "oracle-bob", operator: "oracle-operator" },
			passwordEnv: "ORACLE_TEST_PASSWORD",
		});
		expect(loginFor(v15.identity, "operator")).toBe("oracle-operator");
		// Without a map the default names are used; with one, a key it leaves out is not mapped.
		expect(loginFor(withIdentity({ ...base, passwordEnv: "P" }).identity, "bob")).toBe(
			DEFAULT_LOGINS.bob,
		);
		const staging = withIdentity({
			...base,
			accounts: { alice: "oracle-alice-a@example.test", bob: "oracle-bob-a@example.test" },
			passwordCommand: { argv: ["./oracle/password.sh", "{account}"], timeoutMs: 10000 },
		});
		expect(loginFor(staging.identity, "alice")).toBe("oracle-alice-a@example.test");
		expect(loginFor(staging.identity, "operator")).toBeNull();
		delete process.env.ORACLE_TEST_PASSWORD;
		expect(missingCapability(staging, "identity")).toBeNull();
		expect(missingCapability(v15, "identity")).toMatch(/ORACLE_TEST_PASSWORD is unset/);
		const command = { argv: ["./p.sh", "{account}"] };
		expect(() => withIdentity({ ...base, passwordEnv: "P", passwordCommand: command })).toThrow(
			/exactly one of passwordEnv and passwordCommand/,
		);
		expect(() => withIdentity(base)).toThrow(/exactly one of passwordEnv and passwordCommand/);
		expect(() =>
			withIdentity({ ...base, passwordEnv: "P", accounts: { alice: "x@e.test", bob: "x@e.test" } }),
		).toThrow(/maps alice and bob to the same login/);
		expect(() =>
			withIdentity({ ...base, passwordEnv: "P", accounts: { alice: "has space" } }),
		).toThrow(/does not match/);
		expect(() => withIdentity({ ...base, passwordEnv: "P", accounts: { carol: "c" } })).toThrow(
			/unknown key carol/,
		);
	});

	it("applies semantic rules the schema cannot express", () => {
		const noRedirect = {
			...EXAMPLE_ADAPTER,
			services: { api: { ...EXAMPLE_ADAPTER.services.redirect, roles: ["session"] } },
		};
		expect(() => parse(noRedirect)).toThrow(/no service has the redirect role/);
		const duplicate = { ...EXAMPLE_ADAPTER, workers: [{ name: "redirect-1", kind: "analytics" }] };
		expect(() => parse(duplicate)).toThrow(/duplicate process name/);
	});

	it("reports missing capabilities instead of failing", () => {
		const { adapter } = parse(EXAMPLE_ADAPTER);
		expect(missingCapability(adapter, "command:kill")).toMatch(/kill/);
		expect(missingCapability(adapter, "command:clock")).toBeNull();
		expect(missingCapability(adapter, "stripe")).toMatch(/providers.stripe/);
		delete process.env.ORACLE_EDGE_TOKEN;
		expect(missingCapability(adapter, "edge")).toMatch(/ORACLE_EDGE_TOKEN/);
	});

	it("needs clear-route-caches declared in faultPoints and a faultPoint command (v1.4)", () => {
		const reason = "adapter has no clear-route-caches fault point";
		const capability = "faultPoint:clear-route-caches";
		expect(missingCapability(parse(EXAMPLE_ADAPTER).adapter, capability)).toBe(reason);
		const faultPoint = { argv: ["./oracle/fault.sh", "{name}", "{state}", "{arg}"] };
		const declared = {
			...EXAMPLE_ADAPTER,
			commands: { ...EXAMPLE_ADAPTER.commands, faultPoint },
			faultPoints: ["corrupt-route-cache", "clear-route-caches"],
		};
		expect(missingCapability(parse(declared).adapter, capability)).toBeNull();
		const noCommand = { ...EXAMPLE_ADAPTER, faultPoints: ["clear-route-caches"] };
		expect(missingCapability(parse(noCommand).adapter, capability)).toBe(reason);
		expect(() => parse({ ...declared, faultPoints: ["clear-all-caches"] })).toThrow(/one of/);
	});
});

describe("schema validator", () => {
	const schema = {
		type: "object",
		required: ["a"],
		additionalProperties: false,
		properties: {
			a: { $ref: "#/$defs/n" },
			b: { type: "array", minItems: 1, items: { enum: ["x", "y"] } },
		},
		$defs: { n: { type: "integer", minimum: 1, maximum: 3 } },
	};
	it("validates types, refs, ranges, enums and arrays", () => {
		expect(validate(schema, { a: 2, b: ["x"] })).toEqual([]);
		expect(validate(schema, { a: 4 })).toEqual(["$.a: above 3"]);
		expect(validate(schema, { a: 1.5 })).toEqual(["$.a: expected integer, got number"]);
		expect(validate(schema, { a: 1, b: [] })).toEqual(["$.b: fewer than 1 items"]);
		expect(validate(schema, { a: 1, b: ["z"] })[0]).toMatch(/one of/);
		expect(validate(schema, {})).toEqual(["$: missing required a"]);
	});
});
