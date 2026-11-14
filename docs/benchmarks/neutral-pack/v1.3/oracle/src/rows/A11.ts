import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { asLink, hitSlug, redirectReplicaUrls } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A11",
	title: "Consumer exits after commit, before acknowledgment",
	scope: "Local",
	expected:
		"Totals equal the unique event set (no double count); another worker continues while the killed one restarts",
	requires: [
		"publicEntry",
		"identity",
		"pubsub",
		"workers",
		"command:faultPoint",
		"command:restart",
	],
	coverage: "live-arm",
	liveArmReason: "needs two real analytics workers and the consumer-exit fault point",
	params: { clicks: 20, waitMs: 120_000 },
	async run(ctx) {
		const workers = ctx.adapter.workers.filter((w) => w.kind === "analytics");
		if (workers.length < 2) {
			ctx.blocked("two analytics workers", `adapter lists ${workers.length} analytics worker(s)`);
			return;
		}
		const alice = await ctx.signedIn("alice");
		const capture = await ctx.pubsub();
		const link = asLink(await alice.createLink(destination("A11", randomUUID())));
		if (!link) throw new Error("owned create failed");
		const victim = workers[0].name;
		await ctx.commands.run("faultPoint", {
			name: "consumer-exit-after-commit-before-ack",
			state: "on",
			arg: victim,
		});
		const replicas = redirectReplicaUrls(ctx);
		try {
			for (let i = 0; i < ctx.params.clicks; i++)
				await hitSlug(ctx, replicas[i % replicas.length].url, link.slug);
			const unique = () =>
				[...capture.events().values()].filter(
					(m) => m.json?.linkId === link.id && m.json?.synthetic !== true,
				).length;
			await capture.waitFor(() => unique() >= ctx.params.clicks, 30_000);
			const expected = unique();
			const seen: number[] = [];
			const end = Date.now() + ctx.params.waitMs;
			let total = -1;
			while (Date.now() < end) {
				const r = await alice.analytics(link.id);
				total =
					(r.json as { totals?: { recordedAttempts?: number } } | undefined)?.totals
						?.recordedAttempts ?? -1;
				seen.push(total);
				if (total >= expected) break;
				await ctx.sleep(1_000);
			}
			ctx.check(
				"another worker continues",
				total === expected,
				`${expected} counted while ${victim} is down or restarting`,
				{ total, maxSeen: Math.max(...seen) },
			);
			await ctx.commands.run("restart", { target: victim });
			await ctx.sleep(15_000);
			const after = await alice.analytics(link.id);
			const finalTotal =
				(after.json as { totals?: { recordedAttempts?: number } } | undefined)?.totals
					?.recordedAttempts ?? -1;
			ctx.check(
				"no double count after redelivery",
				finalTotal === expected && Math.max(...seen) <= expected,
				`exactly ${expected} after ${victim} restarts`,
				{ finalTotal, maxSeen: Math.max(...seen) },
			);
		} finally {
			await ctx.commands.run("faultPoint", {
				name: "consumer-exit-after-commit-before-ack",
				state: "off",
				arg: victim,
			});
		}
	},
});
