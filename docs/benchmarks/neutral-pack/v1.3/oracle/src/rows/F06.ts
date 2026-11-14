import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest, hitSlug, parallel, redirectReplicaUrls } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

type Queue = {
	byProcess?: Record<string, { depth?: number; bound?: number; deadlineMs?: number }>;
};
type Memory = { byProcess?: Record<string, { rssBytes?: number }> };

export default defineRow({
	id: "F06",
	title:
		"Publisher latency above the deadline; traffic beyond the queue bound; expiry while waiting",
	scope: "Local",
	expected:
		"503 without Location within deadline plus margin; memory stays bounded; no 302 after expiry",
	requires: ["publicEntry", "toxiproxy", "command:inspect"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's publisher deadline, queue bound and process metrics",
	params: { marginMs: 2_000, burstFactor: 3, memoryGrowthBytes: 128 * 1024 * 1024 },
	async run(ctx) {
		const queue = await ctx.inspect<Queue>("publisherQueue");
		const processes = Object.values(queue.byProcess ?? {});
		const deadlineMs = Math.max(...processes.map((p) => p.deadlineMs ?? 0));
		const bound = Math.max(...processes.map((p) => p.bound ?? 0));
		if (!(deadlineMs > 0) || !(bound > 0)) {
			ctx.blocked(
				"publisher limits",
				"inspect publisherQueue must report deadlineMs and bound per process",
			);
			return;
		}
		const replica = redirectReplicaUrls(ctx)[0];
		const { link } = await createGuest(ctx, destination("F06", randomUUID()));
		const memBefore = await ctx.inspect<Memory>("memory");
		const proxies = ctx.proxies("pubsub.publish");
		const toxi = ctx.toxiproxy();
		await toxi.fault("latency", proxies, { latencyMs: deadlineMs * 3 });
		try {
			const started = Date.now();
			const slow = await hitSlug(ctx, replica.url, link.slug, "GET", { timeoutMs: deadlineMs * 5 });
			const elapsed = Date.now() - started;
			ctx.check(
				"503 within deadline + margin",
				slow.status === 503 &&
					!slow.header("location") &&
					elapsed <= deadlineMs + ctx.params.marginMs,
				`503 without Location within ${deadlineMs + ctx.params.marginMs} ms`,
				{ ...brief(slow), elapsed },
			);
			const burst = await parallel(bound * ctx.params.burstFactor, () =>
				hitSlug(ctx, replica.url, link.slug, "GET", { timeoutMs: deadlineMs * 5 })
					.then((r) => ({ s: r.status, l: !!r.header("location") }))
					.catch(() => ({ s: 0, l: false })),
			);
			ctx.check(
				"beyond the queue bound",
				burst.every((b) => b.s === 503 && !b.l),
				"every request 503 without Location",
				[...new Set(burst.map((b) => b.s))],
			);
			const memDuring = await ctx.inspect<Memory>("memory");
			const growth = Math.max(
				...Object.entries(memDuring.byProcess ?? {}).map(
					([k, v]) => (v.rssBytes ?? 0) - (memBefore.byProcess?.[k]?.rssBytes ?? 0),
				),
			);
			ctx.check(
				"memory bounded",
				growth <= ctx.params.memoryGrowthBytes,
				`RSS growth ≤ ${ctx.params.memoryGrowthBytes} bytes`,
				{ growth },
			);
		} finally {
			await toxi.restore(proxies);
		}
		// A link that expires while its GET waits for the acknowledgment.
		const alice = ctx.adapter.identity ? await ctx.signedIn("alice") : null;
		if (!alice) {
			ctx.blocked("expiry while waiting", "identity is needed to create an expiring link");
			return;
		}
		const expiresAt = new Date(Date.now() + Math.max(2_000, deadlineMs / 2)).toISOString();
		const expiring = await alice.createLink(destination("F06", `${randomUUID()}-exp`), {
			expiresAt,
		});
		const slug =
			(expiring.json as { shortUrl?: string } | undefined)?.shortUrl?.split("/").pop() ?? "";
		await toxi.fault("latency", proxies, { latencyMs: Math.max(3_000, deadlineMs - 500) });
		try {
			const r = await hitSlug(ctx, replica.url, slug, "GET", { timeoutMs: deadlineMs * 5 });
			const at = Date.now();
			ctx.check(
				"no 302 after expiry",
				!(r.status === 302 && at > Date.parse(expiresAt)),
				"410 or 503 (carrying the event ID) once the link expired during the wait",
				{ ...brief(r), respondedAfterExpiry: at > Date.parse(expiresAt) },
			);
		} finally {
			await toxi.restore(proxies);
		}
	},
});
