#!/usr/bin/env node
// Self-test: runs each case of cases.ts against the double and checks the oracle's verdict.
//   node selftest/run.ts --out <dir> [--pubsub-emulator 127.0.0.1:47285]
//                        [--toxiproxy http://127.0.0.1:47274] [--cases A09-good,A24-early-302]
// Cases that need the Pub/Sub emulator, Toxiproxy or Chromium are reported `blocked` (and the
// suite fails) when that dependency is not given. Exit 0 only when every case got its verdict.
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { type AddressInfo, createServer, type Server } from "node:net";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseAdapter } from "../src/adapter.ts";
import { Toxiproxy } from "../src/faults/toxiproxy.ts";
import { FIXTURE_PRICE_ID } from "../src/fixtures/stripe.ts";
import { ALL_ROWS } from "../src/rows/index.ts";
import { runRows } from "../src/runner.ts";
import { CASES, OVERRIDES, type SelfTestCase } from "./cases.ts";
import { Double } from "./double.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));

async function freePort(): Promise<number> {
	return new Promise((r) => {
		const s = createServer();
		s.listen(0, "127.0.0.1", () => {
			const port = (s.address() as AddressInfo).port;
			s.close(() => r(port));
		});
	});
}

/** Stand-in for the billing database and the shared route cache: answers "OK" to every line. */
async function echoServer(): Promise<{ server: Server; port: number }> {
	const server = createServer((socket) => {
		socket.on("data", () => socket.write("OK\n"));
		socket.on("error", () => undefined);
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
	return { server, port: (server.address() as AddressInfo).port };
}

interface Outcome {
	id: string;
	row: string;
	mode: string;
	fault: string;
	expected: string;
	observed: string;
	ok: boolean;
	durationMs: number;
	failedChecks: string[];
}

async function runCase(
	c: SelfTestCase,
	outDir: string,
	deps: { emulator?: string; toxiproxy?: string },
): Promise<Outcome> {
	const started = performance.now();
	const missing = (c.needs ?? []).filter(
		(n) => (n === "pubsub" && !deps.emulator) || (n === "toxiproxy" && !deps.toxiproxy),
	);
	const base = { id: c.id, row: c.row, mode: c.mode, fault: c.fault, expected: c.expect };
	if (missing.length > 0)
		return {
			...base,
			observed: `blocked (needs ${missing.join(", ")})`,
			ok: false,
			durationMs: 0,
			failedChecks: [],
		};
	const tag = `${c.id.toLowerCase()}-${randomBytes(3).toString("hex")}`;
	const env = {
		edge: `edge-${randomBytes(12).toString("hex")}`,
		password: `pw-${randomBytes(12).toString("hex")}`,
		secret: `whsec_${randomBytes(16).toString("hex")}`,
	};
	process.env.SELFTEST_EDGE_TOKEN = env.edge;
	process.env.SELFTEST_PASSWORD = env.password;
	process.env.SELFTEST_WEBHOOK_SECRET = env.secret;
	const toxi = deps.toxiproxy ? new Toxiproxy(deps.toxiproxy) : null;
	const echo = await echoServer();
	const proxies: string[] = [];
	let publishEndpoint = deps.emulator ?? "";
	let billingDb = `127.0.0.1:${echo.port}`;
	// The route-cache (F01) and publisher (F06) models run only for the rows that test them, so
	// every other case runs the double as before.
	let routeCache: string | null = null;
	if (toxi) {
		if (deps.emulator) {
			const port = await freePort();
			await toxi.createProxy(`st-pubsub-${tag}`, `127.0.0.1:${port}`, deps.emulator);
			proxies.push(`st-pubsub-${tag}`);
			publishEndpoint = `127.0.0.1:${port}`;
		}
		const dbPort = await freePort();
		await toxi.createProxy(`st-billing-${tag}`, `127.0.0.1:${dbPort}`, `127.0.0.1:${echo.port}`);
		proxies.push(`st-billing-${tag}`);
		billingDb = `127.0.0.1:${dbPort}`;
		if (c.row === "F01") {
			const cachePort = await freePort();
			await toxi.createProxy(
				`st-valkey-${tag}`,
				`127.0.0.1:${cachePort}`,
				`127.0.0.1:${echo.port}`,
			);
			proxies.push(`st-valkey-${tag}`);
			routeCache = `127.0.0.1:${cachePort}`;
		}
	}
	const webRiskPort = await freePort();
	const project = "oracle-selftest";
	const topic = `st-${tag}`;
	const double = new Double({
		mode: c.mode,
		edgeToken: env.edge,
		password: env.password,
		webhookSecret: env.secret,
		pubsub: deps.emulator
			? { publishEndpoint, directEndpoint: deps.emulator, project, topic }
			: null,
		billingDb,
		webRiskUrl: `http://127.0.0.1:${webRiskPort}`,
		admissionWindowMs: 5_000,
		routeCache,
		publisher: c.row === "F06",
	});
	await double.start([
		{ name: "entry", role: "edge" },
		{ name: "session-1", role: "session" },
		{ name: "session-2", role: "session" },
		{ name: "redirect-1", role: "redirect" },
		{ name: "redirect-2", role: "redirect" },
		{ name: "link-1", role: "link" },
	]);
	const ctl = `${double.url("entry")}/__double/ctl`;
	const cmd = (action: string, ...args: string[]) => ({
		argv: [process.execPath, join(HERE, "ctl.ts"), ctl, action, ...args],
		timeoutMs: 30_000,
	});
	const adapter = {
		schemaVersion: 1,
		arm: "selftest",
		commit: "0000000",
		images: {},
		publicEntry: { url: double.url("entry"), origin: double.origin },
		edgeTokenEnv: "SELFTEST_EDGE_TOKEN",
		services: {
			session: {
				roles: ["session"],
				replicas: ["session-1", "session-2"].map((n) => ({ name: n, url: double.url(n) })),
				health: "/healthz",
				readiness: "/readyz",
			},
			redirect: {
				roles: ["redirect"],
				replicas: ["redirect-1", "redirect-2"].map((n) => ({ name: n, url: double.url(n) })),
				health: "/healthz",
				readiness: "/readyz",
			},
			link: {
				roles: ["link"],
				replicas: [{ name: "link-1", url: double.url("link-1") }],
				health: "/healthz",
				readiness: "/readyz",
				guardedRoutes: [{ method: "GET", path: "/internal/v1/whoami" }],
			},
		},
		workers: [],
		commands: {
			reset: cmd("reset"),
			restart: cmd("restart", "target={target}"),
			kill: cmd("kill", "target={target}"),
			start: cmd("start", "target={target}"),
			clock: cmd("clock", "offsetMs={offsetMs}"),
			faultPoint: cmd("faultPoint", "name={name}", "state={state}", "arg={arg}"),
			inspect: cmd("inspect", "what={what}"),
			rotateIdentityKey: cmd("rotateIdentityKey"),
			rogueKey: cmd("rogueKey"),
		},
		faultPoints: ["force-slug-collision", "corrupt-route-cache", "clear-route-caches"],
		...(toxi && deps.toxiproxy
			? {
					toxiproxy: {
						apiUrl: deps.toxiproxy,
						proxies: {
							...(deps.emulator ? { pubsub: [`st-pubsub-${tag}`] } : {}),
							"postgres.billing": [`st-billing-${tag}`],
							...(routeCache ? { valkey: [`st-valkey-${tag}`] } : {}),
						},
					},
				}
			: {}),
		...(deps.emulator ? { pubsub: { emulatorHost: deps.emulator, project, topic } } : {}),
		identity: {
			issuerUrl: double.issuerUrl,
			audience: "qrwty-double",
			accounts: { alice: "oracle-alice", bob: "oracle-bob", operator: "oracle-operator" },
			passwordEnv: "SELFTEST_PASSWORD",
		},
		providers: {
			stripe: {
				listen: "127.0.0.1:0",
				webhookUrl: `${double.url("entry")}/api/v1/billing/webhook`,
				webhookSecretEnv: "SELFTEST_WEBHOOK_SECRET",
				priceId: FIXTURE_PRICE_ID,
			},
			webRisk: { listen: `127.0.0.1:${webRiskPort}`, deadlineMs: 2_000 },
		},
	};
	const caseDir = join(outDir, "cases", c.id);
	mkdirSync(caseDir, { recursive: true });
	const raw = `${JSON.stringify(adapter, null, 2)}\n`;
	writeFileSync(join(caseDir, "oracle-adapter.json"), raw.replaceAll(HERE, "<oracle>/selftest/"));
	const row = ALL_ROWS.find((r) => r.id === c.row);
	if (!row) throw new Error(`unknown row ${c.row}`);
	try {
		const [line] = await runRows({
			loaded: parseAdapter(raw, join(caseDir, "oracle-adapter.json")),
			rows: [row],
			outDir: caseDir,
			scope: "local",
			command: `node selftest/run.ts --cases ${c.id}`,
			uiNamesPath: join(HERE, "ui-names.selftest.json"),
			paramOverrides: OVERRIDES,
			runId: `selftest-${tag}`,
		});
		const failedChecks = line.observed.checks
			.filter((k) => k.status === "failed")
			.map((k) => k.name);
		return {
			...base,
			observed: line.status,
			ok: line.status === c.expect,
			durationMs: Math.round(performance.now() - started),
			failedChecks,
		};
	} finally {
		await double.stop();
		for (const name of proxies) await toxi?.deleteProxy(name).catch(() => undefined);
		echo.server.close();
	}
}

async function main(): Promise<number> {
	const { values } = parseArgs({
		options: {
			out: { type: "string" },
			"pubsub-emulator": { type: "string" },
			toxiproxy: { type: "string" },
			cases: { type: "string" },
		},
	});
	if (!values.out) throw new Error("--out is required");
	const outDir = resolve(values.out);
	mkdirSync(outDir, { recursive: true });
	const selected = values.cases
		? CASES.filter((c) => values.cases?.split(",").includes(c.id))
		: CASES;
	const outcomes: Outcome[] = [];
	for (const c of selected) {
		process.stderr.write(`${c.id} (${c.row}, ${c.mode}) ... `);
		let outcome: Outcome;
		try {
			outcome = await runCase(c, outDir, {
				emulator: values["pubsub-emulator"],
				toxiproxy: values.toxiproxy,
			});
		} catch (error) {
			outcome = {
				id: c.id,
				row: c.row,
				mode: c.mode,
				fault: c.fault,
				expected: c.expect,
				observed: `error: ${(error as Error).message}`,
				ok: false,
				durationMs: 0,
				failedChecks: [],
			};
		}
		outcomes.push(outcome);
		process.stderr.write(
			`${outcome.observed} (expected ${outcome.expected}) ${outcome.ok ? "OK" : "MISMATCH"}\n`,
		);
	}
	const detected = outcomes.filter((o) => o.expected === "failed");
	const summary = {
		at: new Date().toISOString(),
		node: process.version,
		cases: outcomes.length,
		matched: outcomes.filter((o) => o.ok).length,
		faultsDetected: `${detected.filter((o) => o.ok).length}/${detected.length}`,
		ok: outcomes.every((o) => o.ok),
		outcomes,
	};
	writeFileSync(join(outDir, "selftest-results.json"), `${JSON.stringify(summary, null, 2)}\n`);
	const table = [
		`Self-test ${summary.ok ? "PASSED" : "FAILED"}: ${summary.matched}/${summary.cases} cases matched; deliberate faults detected ${summary.faultsDetected}.`,
		"",
		"| Case | Row | Deliberate fault | Expected | Observed | Failed checks |",
		"| --- | --- | --- | --- | --- | --- |",
		...outcomes.map(
			(o) =>
				`| ${o.id} | ${o.row} | ${o.fault} | ${o.expected} | ${o.observed} | ${o.failedChecks.join("; ").replace(/\|/g, "\\|") || "-"} |`,
		),
	].join("\n");
	writeFileSync(join(outDir, "selftest-summary.md"), `${table}\n`);
	process.stdout.write(`${table}\n`);
	return summary.ok ? 0 : 1;
}

main().then(
	(code) => process.exit(code),
	(error) => {
		console.error(error);
		process.exit(2);
	},
);
