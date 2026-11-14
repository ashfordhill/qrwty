import { describe, expect, it } from "vitest";
import { Clock } from "../src/faults/clock.ts";
import { CommandError, Commands, expand, runSpec } from "../src/faults/commands.ts";
import { Toxiproxy } from "../src/faults/toxiproxy.ts";
import { httpServer } from "./helpers.ts";

describe("Toxiproxy driver", () => {
	it("refuses, stalls, breaks and restores through the HTTP API", async () => {
		const calls: { method: string; url: string; body: unknown }[] = [];
		const toxics: Record<string, { name: string }[]> = { pg: [] };
		const api = await httpServer((req, res) => {
			let raw = "";
			req.on("data", (d) => (raw += d));
			req.on("end", () => {
				const body = raw ? JSON.parse(raw) : null;
				calls.push({ method: req.method ?? "", url: req.url ?? "", body });
				if (req.method === "POST" && req.url === "/proxies/pg/toxics") toxics.pg.push(body);
				if (req.method === "DELETE" && req.url?.startsWith("/proxies/pg/toxics/"))
					toxics.pg = toxics.pg.filter((t) => !req.url?.endsWith(t.name));
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					req.url === "/proxies/pg" && req.method === "GET"
						? JSON.stringify({ name: "pg", toxics: toxics.pg })
						: JSON.stringify({ ok: true }),
				);
			});
		});
		const toxi = new Toxiproxy(api.url);
		await toxi.fault("refuse", ["pg"]);
		expect(calls.at(-1)).toEqual({ method: "POST", url: "/proxies/pg", body: { enabled: false } });
		await toxi.fault("stall", ["pg"]);
		expect(toxics.pg.map((t) => t.name)).toEqual([
			"oracle-stall-upstream",
			"oracle-stall-downstream",
		]);
		expect(calls.at(-1)?.body).toMatchObject({
			type: "timeout",
			attributes: { timeout: 0 },
			stream: "downstream",
		});
		await toxi.restore(["pg"]);
		expect(toxics.pg).toEqual([]);
		await toxi.fault("break", ["pg"]);
		expect(calls.at(-1)?.body).toMatchObject({ type: "reset_peer" });
		await toxi.fault("latency", ["pg"], { latencyMs: 1234 });
		expect(calls.at(-1)?.body).toMatchObject({ type: "latency", attributes: { latency: 1234 } });
		await toxi.reset();
		expect(calls.at(-1)).toMatchObject({ method: "POST", url: "/reset" });
		expect(toxi.log.map((l) => l.action)).toEqual([
			"refuse",
			"stall",
			"restore",
			"break",
			"latency",
			"reset",
		]);
		await api.close();
	});
});

describe("adapter command runner", () => {
	const node = process.execPath;
	it("expands placeholders and parses JSON output", async () => {
		expect(expand(["x", "--t={target}", "{missing}"], { target: "r1" })).toEqual([
			"x",
			"--t=r1",
			"{missing}",
		]);
		const out = await runSpec(
			"inspect",
			{
				argv: [
					node,
					"-e",
					"console.log('noise'); console.log(JSON.stringify({what: process.argv[1]}))",
					"{what}",
				],
			},
			".",
			{ what: "alerts" },
		);
		expect(out.exitCode).toBe(0);
		expect(out.json).toEqual({ what: "alerts" });
	});

	it("raises CommandError on a non-zero exit and kills on timeout", async () => {
		const commands = new Commands(
			{
				kill: { argv: [node, "-e", "process.exit(3)"] },
				stop: { argv: [node, "-e", "setTimeout(() => {}, 60000)"], timeoutMs: 1000 },
			},
			".",
		);
		await expect(commands.run("kill", { target: "x" })).rejects.toBeInstanceOf(CommandError);
		const slow = await commands.tryRun("stop");
		expect(slow.timedOut).toBe(true);
		await expect(commands.run("start")).rejects.toThrow(/not provided/);
	});

	it("records clock offsets from the clock command", async () => {
		const commands = new Commands(
			{
				clock: {
					argv: [
						node,
						"-e",
						"console.log(JSON.stringify({offsetMs: Number(process.argv[1]), boundMs: 250}))",
						"{offsetMs}",
					],
				},
			},
			".",
		);
		const clock = new Clock(commands);
		await clock.set(86_399_000);
		expect(clock.offsetMs).toBe(86_399_000);
		expect(clock.now() - Date.now()).toBeGreaterThan(86_398_000);
		await clock.reset();
		expect(clock.records.map((r) => [r.offsetMs, r.boundMs])).toEqual([
			[86_399_000, 250],
			[0, 250],
		]);
	});
});
