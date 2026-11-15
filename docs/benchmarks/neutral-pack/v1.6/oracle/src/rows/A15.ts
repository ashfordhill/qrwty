import { randomUUID } from "node:crypto";
import { Client } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import {
	asLink,
	brief,
	hitSlug,
	type Link,
	poll,
	redirectReplicaUrls,
	subscribe,
} from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A15",
	title: "Account deletion with a backup restored into an isolated copy",
	scope: "Local (database backup); PITR is D05",
	expected:
		"Links 410 within 60 s; Alice's private data and exports gone; tombstones kept; the restored copy reapplies the deletion before serving",
	requires: ["publicEntry", "identity", "stripe", "command:backup", "command:restore"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's databases, backup and restore into an isolated copy",
	params: { propagationMs: 60_000 },
	async run(ctx) {
		const alice = await ctx.signedIn("alice");
		const links: Link[] = [];
		for (let i = 0; i < 2; i++) {
			const link = asLink(await alice.createLink(destination("A15", `${randomUUID()}-${i}`)));
			if (!link) throw new Error("owned create failed");
			links.push(link);
			await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug);
		}
		const { subscriptionId } = await subscribe(ctx, alice);
		const backup = await ctx.commands.run<{ backupId: string }>("backup");
		const del = await alice.mutate("DELETE", "/api/v1/me", undefined, { idempotencyKey: true });
		ctx.check(
			"deletion scheduled",
			del.status === 202 &&
				(del.json as { deletionScheduled?: boolean } | undefined)?.deletionScheduled === true,
			"202 {deletionScheduled: true}",
			brief(del),
		);
		const started = ctx.mono();
		const replicas = redirectReplicaUrls(ctx);
		const gone = await poll(
			async () => {
				const statuses: number[] = [];
				for (const link of links)
					for (const r of replicas) statuses.push((await hitSlug(ctx, r.url, link.slug)).status);
				return statuses;
			},
			(statuses) => statuses.every((s) => s === 410),
			ctx.params.propagationMs + 5_000,
			1_000,
		);
		ctx.check(
			"links 410 within 60 s",
			gone.ok && gone.elapsedMs <= ctx.params.propagationMs + 1_000,
			"410 on every replica within 60 s",
			{ elapsedMs: ctx.mono() - started, statuses: gone.value },
		);
		const oldSession = await alice.listLinks();
		ctx.check(
			"sessions revoked",
			oldSession.status === 401,
			"401 for the deleted account's session",
			brief(oldSession),
		);
		const again = ctx.api();
		// The deleted account may be refused: that refusal is not remembered for later rows.
		const signIn = await ctx.signIn(again, "alice", { mayBeRefused: true });
		if (signIn.ok) {
			const list = await again.listLinks();
			const items = (list.json as { items?: unknown[] } | undefined)?.items ?? [];
			ctx.check(
				"private data gone",
				list.status === 401 || (list.status === 200 && items.length === 0),
				"no links for the deleted account",
				{ status: list.status, items: items.length },
			);
			const csv = await again.csv(links[0].id);
			ctx.check(
				"exports gone",
				csv.status === 404 || csv.status === 401,
				"404 (or 401) for the old link's CSV",
				brief(csv),
			);
		} else {
			ctx.check("private data gone", true, "the deleted account cannot sign in, or has no data", {
				reason: signIn.reason,
				steps: signIn.steps,
			});
		}
		const tomb = await hitSlug(ctx, ctx.adapter.publicEntry.url, links[0].slug);
		ctx.check("tombstone kept", tomb.status === 410, "410, not 404", brief(tomb));
		const cancelCalls = await poll(
			async () =>
				ctx
					.stripe()
					.calls.filter(
						(c) =>
							c.path === `/v1/subscriptions/${subscriptionId}` &&
							(c.method === "DELETE" ||
								(c.method === "POST" && c.params.cancel_at_period_end === "true")),
					).length,
			(n) => n >= 1,
			60_000,
			1_000,
		);
		ctx.check(
			"subscription cancellation scheduled",
			cancelCalls.ok,
			"a cancellation call for the subscription",
			cancelCalls.value,
		);

		const restored = await ctx.commands.run<{ publicEntry?: { url: string; origin?: string } }>(
			"restore",
			{ backupId: backup.backupId },
		);
		if (!restored.publicEntry?.url) throw new Error("restore did not return publicEntry.url");
		const client = new Client(restored.publicEntry.url, restored.publicEntry.origin ?? ctx.origin);
		const first = await client.request("GET", `/${links[0].slug}`, { noCookies: true });
		const second = await client.request("GET", `/${links[1].slug}`, { noCookies: true });
		ctx.check(
			"restored copy reapplies deletion",
			first.status === 410 && second.status === 410,
			"410 on the very first requests to the restored copy",
			[brief(first), brief(second)],
		);
	},
});
