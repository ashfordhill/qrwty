import { randomUUID } from "node:crypto";
import { Client } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { apiReplicaUrls, asLink, brief, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

type Connections = { byService?: Record<string, number | { current?: number; max?: number }> };

export default defineRow({
	id: "R03",
	title: "Final images start, drain and restart; copies share only external state",
	scope: "Local",
	expected:
		"The final images start, drain and restart; two copies share only external state; connection counts stay bounded",
	requires: [
		"publicEntry",
		"command:terminate",
		"command:start",
		"command:restart",
		"command:inspect",
	],
	coverage: "live-arm",
	liveArmReason: "needs the arm's production images and lifecycle commands",
	async run(ctx) {
		for (const [name, service] of Object.entries(ctx.adapter.services)) {
			for (const replica of service.replicas) {
				const term = await ctx.commands.run<{ drainedMs?: number; boundMs?: number }>("terminate", {
					target: replica.name,
				});
				ctx.check(
					`${replica.name}: drains`,
					typeof term.drainedMs === "number" &&
						typeof term.boundMs === "number" &&
						term.drainedMs <= term.boundMs + 1_000,
					"drainedMs ≤ boundMs",
					term,
				);
				await ctx.commands.run("start", { target: replica.name });
				const client = new Client(replica.url, ctx.origin);
				const ready = await poll(
					() =>
						client
							.request("GET", service.readiness)
							.then((r) => r.status)
							.catch(() => 0),
					(s) => s === 200,
					60_000,
					1_000,
				);
				ctx.check(`${replica.name}: starts`, ready.ok, `readiness 200 (${name})`, ready.value);
				await ctx.commands.run("restart", { target: replica.name });
				const again = await poll(
					() =>
						client
							.request("GET", service.readiness)
							.then((r) => r.status)
							.catch(() => 0),
					(s) => s === 200,
					60_000,
					1_000,
				);
				ctx.check(
					`${replica.name}: restarts`,
					again.ok,
					"readiness 200 after restart",
					again.value,
				);
				const live = await client.request("GET", service.health).catch(() => null);
				ctx.check(
					`${replica.name}: liveness`,
					live?.status === 200,
					`${service.health} 200`,
					live ? brief(live) : null,
				);
			}
		}
		const urls = apiReplicaUrls(ctx);
		if (urls.length >= 2) {
			const actor = ctx.api();
			await actor.ensureCsrf();
			const created = await actor.at(urls[0]).createLink(destination("R03", randomUUID()));
			const link = asLink(created);
			const listed = link ? await actor.at(urls[1]).get("/api/v1/session") : null;
			ctx.check(
				"session shared through external state",
				!!link &&
					listed?.status === 200 &&
					(listed.json as { csrfToken?: string }).csrfToken === actor.csrfToken,
				"a session made on one copy is valid on the other",
				{ created: brief(created), other: listed ? brief(listed) : null },
			);
		} else {
			ctx.blocked("two copies share only external state", "needs two session replicas");
		}
		const connections = await ctx.inspect<Connections>("dbConnections");
		const unbounded = Object.entries(connections.byService ?? {}).filter(
			([, v]) => typeof v !== "object" || typeof v.max !== "number" || (v.current ?? 0) > v.max,
		);
		ctx.check(
			"connection counts bounded",
			unbounded.length === 0,
			"each service reports current ≤ max",
			connections,
		);
	},
});
