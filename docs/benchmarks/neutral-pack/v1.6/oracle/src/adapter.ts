import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./schema.ts";
import type { Adapter, Capability, FaultPointName, ReplicaSpec } from "./types.ts";

export const ORACLE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const EDGE_TOKEN_HEADER = "X-Oracle-Edge-Token";

export interface LoadedAdapter {
	adapter: Adapter;
	/** Directory of oracle-adapter.json; relative command cwd and file paths resolve against it. */
	baseDir: string;
	path: string;
	raw: string;
}

export function loadSchema(name = "adapter.schema.json"): Record<string, unknown> {
	return JSON.parse(readFileSync(resolve(ORACLE_ROOT, name), "utf8"));
}

export function parseAdapter(raw: string, path: string): LoadedAdapter {
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch (error) {
		throw new Error(`${path}: not valid JSON (${(error as Error).message})`);
	}
	const errors = validate(loadSchema(), value);
	if (errors.length > 0) {
		throw new Error(`${path}: does not match adapter.schema.json:\n  ${errors.join("\n  ")}`);
	}
	const adapter = value as Adapter;
	const semantic = semanticErrors(adapter);
	if (semantic.length > 0) {
		throw new Error(`${path}: ${semantic.join("; ")}`);
	}
	return { adapter, baseDir: dirname(resolve(path)), path: resolve(path), raw };
}

export function loadAdapter(path: string): LoadedAdapter {
	return parseAdapter(readFileSync(path, "utf8"), path);
}

/** Rules the schema cannot express. */
function semanticErrors(adapter: Adapter): string[] {
	const errors: string[] = [];
	const names = new Set<string>();
	for (const [service, spec] of Object.entries(adapter.services)) {
		for (const replica of spec.replicas) {
			if (names.has(replica.name)) errors.push(`duplicate replica name ${replica.name}`);
			names.add(replica.name);
		}
		if (spec.roles.includes("redirect") && spec.replicas.length < 1) {
			errors.push(`service ${service} has no replicas`);
		}
	}
	for (const worker of adapter.workers) {
		if (names.has(worker.name)) errors.push(`duplicate process name ${worker.name}`);
		names.add(worker.name);
	}
	if (!Object.values(adapter.services).some((s) => s.roles.includes("redirect"))) {
		errors.push("no service has the redirect role");
	}
	const identity = adapter.identity;
	if (identity) {
		// Pack v1.6: exactly one password source, and a different login for every mapped account.
		if (!identity.passwordEnv === !identity.passwordCommand) {
			errors.push("identity needs exactly one of passwordEnv and passwordCommand");
		}
		const owners = new Map<string, string>();
		for (const [account, login] of Object.entries(identity.accounts ?? {})) {
			const other = owners.get(login);
			if (other) errors.push(`identity.accounts maps ${other} and ${account} to the same login`);
			owners.set(login, account);
		}
	}
	return errors;
}

export function replicasWithRole(adapter: Adapter, role: string): ReplicaSpec[] {
	return Object.values(adapter.services)
		.filter((s) => s.roles.includes(role))
		.flatMap((s) => s.replicas);
}

export function allReplicas(adapter: Adapter): ReplicaSpec[] {
	return Object.values(adapter.services).flatMap((s) => s.replicas);
}

/** Toxiproxy proxy names for a dependency; a finer key falls back to its parent (`postgres`). */
export function proxiesFor(adapter: Adapter, dependency: string): string[] {
	const proxies = adapter.toxiproxy?.proxies ?? {};
	if (proxies[dependency]) return proxies[dependency];
	const parent = dependency.split(".")[0];
	return proxies[parent] ?? [];
}

export function envValue(name: string | undefined): string | undefined {
	if (!name) return undefined;
	const value = process.env[name];
	return value && value.length > 0 ? value : undefined;
}

/** Returns the reasons a capability is unavailable (empty when available). */
export function missingCapability(adapter: Adapter, capability: Capability): string | null {
	if (capability.startsWith("command:")) {
		const name = capability.slice("command:".length) as keyof Adapter["commands"];
		return adapter.commands[name] ? null : `adapter command "${name}" is not provided`;
	}
	if (capability.startsWith("faultPoint:")) {
		const name = capability.slice("faultPoint:".length) as FaultPointName;
		return adapter.commands.faultPoint && adapter.faultPoints?.includes(name)
			? null
			: `adapter has no ${name} fault point`;
	}
	switch (capability) {
		case "publicEntry":
			return null;
		case "edge":
			return envValue(adapter.edgeTokenEnv) ? null : `environment ${adapter.edgeTokenEnv} is unset`;
		case "services":
			return null;
		case "workers":
			return adapter.workers.length >= 1 ? null : "no workers declared";
		case "pubsub":
			return adapter.pubsub ? null : "adapter has no pubsub section";
		case "toxiproxy":
			return adapter.toxiproxy ? null : "adapter has no toxiproxy section";
		case "identity":
			// An account the adapter does not map, or whose password command fails, blocks only
			// the checks that need it (src/identity.ts).
			if (!adapter.identity) return "adapter has no identity section";
			if (adapter.identity.passwordCommand) return null;
			return envValue(adapter.identity.passwordEnv)
				? null
				: `environment ${adapter.identity.passwordEnv} is unset`;
		case "stripe":
			if (!adapter.providers?.stripe) return "adapter has no providers.stripe binding";
			return envValue(adapter.providers.stripe.webhookSecretEnv)
				? null
				: `environment ${adapter.providers.stripe.webhookSecretEnv} is unset`;
		case "webRisk":
			return adapter.providers?.webRisk ? null : "adapter has no providers.webRisk binding";
		case "browser":
			return null;
		case "uiNames":
			return null;
		case "productionProfileCheck":
			return adapter.productionProfileCheck ? null : "adapter has no productionProfileCheck";
		case "deploymentPreparation":
			return adapter.deploymentPreparation ? null : "adapter has no deploymentPreparation";
		default:
			return `unknown capability ${capability}`;
	}
}
