// Runs row modules against one arm and writes results.jsonl.
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	envValue,
	type LoadedAdapter,
	loadSchema,
	missingCapability,
	ORACLE_ROOT,
} from "./adapter.ts";
import { BrowserDriver, type UiNames } from "./browser/driver.ts";
import { RowContext, type RunResources } from "./context.ts";
import { CommandError } from "./faults/commands.ts";
import { FIXTURE_PRICE_ID, StripeFixture } from "./fixtures/stripe.ts";
import { startWebRisk } from "./fixtures/webrisk.ts";
import { AccountBlockedError, Identity } from "./identity.ts";
import { deriveStatus, RunWriter } from "./observe/results.ts";
import { registerSecret } from "./redact.ts";
import type { RowModule } from "./rows/lib/row.ts";
import { validate } from "./schema.ts";
import type { ResultLine } from "./types.ts";

export const ORACLE_VERSION = "1.6.0";
export const PACK_VERSION = "v1.6";

/**
 * The frozen accessible-name list (acceptance-oracle §6): Q11's `accessible-names.json`, copied
 * into the pack by v1.5. Browser rows always read it from here; no arm supplies its own list.
 */
export const FROZEN_UI_NAMES_PATH = resolve(
	ORACLE_ROOT,
	"..",
	"files/docs/design/accessible-names.json",
);

export interface RunOptions {
	loaded: LoadedAdapter;
	rows: RowModule[];
	outDir: string;
	scope: string;
	command: string;
	/** Self-test only: the double's own name list. Otherwise the frozen list is used. */
	uiNamesPath?: string;
	/** Self-test only: shortened timing parameters, recorded in each result. */
	paramOverrides?: Record<string, Record<string, number>>;
	resetBetweenRows?: boolean;
	runId?: string;
	log?: (line: string) => void;
}

export interface LoadedUiNames {
	names: UiNames;
	version: string;
	sha256: string;
}

/** Loads and validates a name list: the frozen one unless the self-test passes its own. */
export function loadUiNames(path: string = FROZEN_UI_NAMES_PATH): LoadedUiNames {
	const raw = readFileSync(path);
	const value = JSON.parse(raw.toString("utf8")) as { version: string; names: UiNames };
	const errors = validate(loadSchema("ui-names.schema.json"), value);
	if (errors.length > 0) throw new Error(`${path}: ${errors.join("; ")}`);
	return {
		names: value.names,
		version: value.version,
		sha256: createHash("sha256").update(raw).digest("hex"),
	};
}

export async function startFixtures(loaded: LoadedAdapter): Promise<{
	stripe: StripeFixture | null;
	webRisk: Awaited<ReturnType<typeof startWebRisk>> | null;
}> {
	const providers = loaded.adapter.providers ?? {};
	let stripe: StripeFixture | null = null;
	if (providers.stripe) {
		const secret = envValue(providers.stripe.webhookSecretEnv);
		stripe = await new StripeFixture({
			listen: providers.stripe.listen,
			priceIds: [providers.stripe.priceId, FIXTURE_PRICE_ID],
			webhook: secret
				? { url: providers.stripe.webhookUrl, secret, origin: loaded.adapter.publicEntry.origin }
				: undefined,
		}).start();
	}
	const webRisk = providers.webRisk ? await startWebRisk(providers.webRisk.listen) : null;
	return { stripe, webRisk };
}

export async function runRows(options: RunOptions): Promise<ResultLine[]> {
	const { loaded } = options;
	const adapter = loaded.adapter;
	const log = options.log ?? (() => {});
	for (const name of [
		adapter.edgeTokenEnv,
		adapter.identity?.passwordEnv,
		adapter.providers?.stripe?.webhookSecretEnv,
	]) {
		registerSecret(envValue(name));
	}
	const runId =
		options.runId ??
		`oracle-${adapter.arm}-${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}-${randomBytes(3).toString("hex")}`;
	const writer = new RunWriter(resolve(options.outDir), runId);
	const uiNames = loadUiNames(options.uiNamesPath);
	const fixtures = await startFixtures(loaded);
	let browser: BrowserDriver | null = null;
	const resources: RunResources = {
		loaded,
		writer,
		scope: options.scope,
		stripe: fixtures.stripe,
		webRisk: fixtures.webRisk,
		browser: async () => {
			const hosts = [
				adapter.publicEntry.origin,
				adapter.publicEntry.url,
				adapter.identity?.issuerUrl,
				fixtures.stripe?.url,
				fixtures.webRisk?.url,
			]
				.filter((u): u is string => !!u)
				.map((u) => new URL(u).hostname);
			browser ??= await BrowserDriver.launch(hosts);
			return browser;
		},
		uiNames: uiNames.names,
		identity: new Identity(adapter, loaded.baseDir),
	};
	const environment = {
		scope: options.scope,
		oracle: {
			pack: PACK_VERSION,
			version: ORACLE_VERSION,
			node: process.version,
			platform: process.platform,
		},
		uiNames: { version: uiNames.version, sha256: uiNames.sha256 },
		adapterPath: loaded.path,
		adapterSha256: createHash("sha256").update(loaded.raw).digest("hex"),
		publicEntry: adapter.publicEntry,
		fixtures: { stripe: fixtures.stripe?.url ?? null, webRisk: fixtures.webRisk?.url ?? null },
	};
	const lines: ResultLine[] = [];
	try {
		for (const row of options.rows) {
			const params = { ...(row.params ?? {}), ...(options.paramOverrides?.[row.id] ?? {}) };
			const ctx = new RowContext(row.id, resources, params);
			const startedAt = new Date().toISOString();
			log(`${row.id} ${row.title}`);
			const missing = row.requires
				.map((c) => missingCapability(adapter, c))
				.filter((m): m is string => !!m);
			if (missing.length > 0) {
				for (const reason of missing) ctx.blocked("adapter capability", reason);
			} else {
				try {
					if (options.resetBetweenRows !== false && ctx.commands.has("reset"))
						await ctx.commands.run("reset");
					fixtures.stripe?.resetState();
					fixtures.webRisk?.reset();
					await row.run(ctx);
				} catch (error) {
					if (error instanceof CommandError) {
						ctx.blocked("adapter command", error.message);
					} else if (error instanceof AccountBlockedError) {
						ctx.blocked(`account ${error.account}`, error.message);
					} else {
						ctx.mark(
							"row completed",
							"failed",
							"the row runs to completion against the arm",
							(error as Error).stack?.split("\n").slice(0, 4).join(" | ") ?? String(error),
						);
					}
				} finally {
					await ctx.cleanup();
				}
			}
			if (ctx.commands.log.length > 0) await ctx.artifact("commands.json", ctx.commands.log);
			const line: ResultLine = {
				runId,
				arm: adapter.arm,
				commit: adapter.commit,
				images: adapter.images,
				environment,
				acceptanceId: row.id,
				status: deriveStatus(ctx.checks),
				startedAt,
				endedAt: new Date().toISOString(),
				command: options.command,
				expected: row.expected,
				observed: { checks: ctx.checks, clockOffsets: ctx.clock.records, params, ...ctx.observed },
				artifacts: ctx.artifacts,
				notes: [
					row.coverage === "live-arm" ? `live-arm row: ${row.liveArmReason ?? ""}` : "",
					...ctx.notes,
				]
					.filter(Boolean)
					.join("; "),
			};
			writer.write(line);
			lines.push(line);
			log(`  -> ${line.status}`);
		}
	} finally {
		if (browser) await (browser as BrowserDriver).close();
		await fixtures.stripe?.close();
		await fixtures.webRisk?.close();
	}
	return lines;
}
