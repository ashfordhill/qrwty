import { randomUUID } from "node:crypto";
import { allReplicas } from "../adapter.ts";
import type { RowContext } from "../context.ts";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest, hitSlug, redirectReplicaUrls } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

type Counts = { byService?: Record<string, number> };
const total = (c: Counts) => Object.values(c.byService ?? {}).reduce((a, b) => a + b, 0);

async function hot(ctx: RowContext, slug: string, durationMs: number) {
	const replicas = redirectReplicaUrls(ctx);
	const statuses: number[] = [];
	const end = ctx.mono() + durationMs;
	let i = 0;
	while (ctx.mono() < end) {
		const r = await hitSlug(ctx, replicas[i++ % replicas.length].url, slug, "GET", {
			timeoutMs: 15_000,
		}).catch(() => null);
		statuses.push(r?.status ?? 0);
	}
	return statuses;
}

/**
 * Every replica drops its per-process route-cache entries (fault point `clear-route-caches`,
 * pack v1.4), so the hot redirects that follow cannot be served from process memory and must
 * use the shared cache or, while it is faulted, the database. The shared cache and the database
 * are not touched; an arm without per-process route caches answers with a no-op success.
 */
async function clearRouteCaches(ctx: RowContext): Promise<string[]> {
	const names = allReplicas(ctx.adapter).map((r) => r.name);
	for (const name of names) {
		await ctx.commands.run("faultPoint", { name: "clear-route-caches", state: "on", arg: name });
	}
	return names;
}

export default defineRow({
	id: "F01",
	title: "Valkey refused, stalled and broken during hot redirects; corrupt cache entries",
	scope: "Local",
	expected:
		"Redirects continue from the database within admission bounds; no connection leak (counts return to baseline); no stampede (database queries bounded); corrupt entries ignored; cache use resumes after recovery",
	requires: [
		"publicEntry",
		"toxiproxy",
		"command:inspect",
		"command:faultPoint",
		"faultPoint:clear-route-caches",
	],
	coverage: "live-arm",
	liveArmReason: "needs the arm's real Valkey route cache behind Toxiproxy",
	params: {
		phaseMs: 10_000,
		minRedirectShare: 0.95,
		maxQueryShare: 0.1,
		queriesPerReplica: 2,
		connectionSlack: 2,
	},
	async run(ctx) {
		const { link } = await createGuest(ctx, destination("F01", randomUUID()));
		await hot(ctx, link.slug, 2_000);
		const baseConnections = await ctx.inspect<Counts>("dbConnections");
		const proxies = ctx.proxies("valkey");
		const toxi = ctx.toxiproxy();
		const redirectReplicas = redirectReplicaUrls(ctx).length;
		for (const kind of ["refuse", "stall", "break"] as const) {
			const q0 = await ctx.inspect<Counts>("dbQueries");
			await toxi.fault(kind, proxies);
			let statuses: number[];
			let cleared: string[];
			try {
				cleared = await clearRouteCaches(ctx);
				statuses = await hot(ctx, link.slug, ctx.params.phaseMs);
			} finally {
				await toxi.restore(proxies);
			}
			const q1 = await ctx.inspect<Counts>("dbQueries");
			const share = statuses.filter((s) => s === 302).length / Math.max(1, statuses.length);
			ctx.check(
				`${kind}: redirects continue`,
				share >= ctx.params.minRedirectShare,
				`≥ ${ctx.params.minRedirectShare * 100}% 302 from the database`,
				{ requests: statuses.length, share, clearedRouteCaches: cleared },
			);
			// A stampede is database work that grows with the traffic: one fallback query per hot
			// request fails. Refilling the route from one database read (valid for up to 30 s,
			// decisions section 3) passes.
			const queries = total(q1) - total(q0);
			const allowed = Math.max(
				ctx.params.queriesPerReplica * redirectReplicas,
				statuses.length * ctx.params.maxQueryShare,
			);
			ctx.check(
				`${kind}: no stampede`,
				queries <= allowed,
				`≤ max(${ctx.params.queriesPerReplica} per redirect replica, ${ctx.params.maxQueryShare} per request) database queries after the route caches were cleared`,
				{ queries, requests: statuses.length, allowed, redirectReplicas },
			);
		}
		await ctx.sleep(5_000);
		const after = await ctx.inspect<Counts>("dbConnections");
		ctx.check(
			"no connection leak",
			total(after) <= total(baseConnections) + ctx.params.connectionSlack,
			"connection counts return to baseline",
			{ before: baseConnections, after },
		);

		try {
			await ctx.commands.run("faultPoint", {
				name: "corrupt-route-cache",
				state: "on",
				arg: link.slug,
			});
			const corrupt = await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug);
			ctx.check(
				"corrupt entry ignored",
				corrupt.status === 302 && corrupt.header("location") === link.destination,
				"302 to the saved destination",
				brief(corrupt),
			);
		} catch (error) {
			ctx.blocked(
				"corrupt entry ignored",
				`fault point corrupt-route-cache unavailable: ${(error as Error).message.slice(0, 200)}`,
			);
		} finally {
			await ctx.commands
				.run("faultPoint", { name: "corrupt-route-cache", state: "off", arg: link.slug })
				.catch(() => undefined);
		}
		await hot(ctx, link.slug, 2_000);
		const r0 = await ctx.inspect<Counts>("dbQueries");
		const warm = await hot(ctx, link.slug, 5_000);
		const r1 = await ctx.inspect<Counts>("dbQueries");
		const warmQueries = total(r1) - total(r0);
		ctx.check(
			"cache use resumes",
			warmQueries <= Math.max(2, warm.length / 10),
			"hot redirects mostly served from the cache again",
			{ queries: warmQueries, requests: warm.length },
		);
	},
});
