import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest, hitSlug, holdConnections, redirectReplicaUrls } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

type Queue = {
	byProcess?: Record<
		string,
		{ depth?: number; bound?: number; deadlineMs?: number; admissionBound?: number }
	>;
};
type Memory = { byProcess?: Record<string, { rssBytes?: number }> };

/** Each process's RSS growth from `base` to the larger of the later samples, and the largest. */
function rssGrowth(
	base: Memory,
	samples: Memory[],
): { max: number; byProcess: Record<string, number> } {
	const byProcess: Record<string, number> = {};
	for (const sample of samples) {
		for (const [name, value] of Object.entries(sample.byProcess ?? {})) {
			const delta = (value.rssBytes ?? 0) - (base.byProcess?.[name]?.rssBytes ?? 0);
			byProcess[name] = Math.max(byProcess[name] ?? Number.NEGATIVE_INFINITY, delta);
		}
	}
	return { max: Math.max(...Object.values(byProcess)), byProcess };
}

const isBound = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

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
	params: {
		marginMs: 2_000,
		minBurst: 2_000,
		memoryGrowthBytes: 128 * 1024 * 1024,
		idleSettleMs: 1_000,
	},
	async run(ctx) {
		const queue = await ctx.inspect<Queue>("publisherQueue");
		const processes = Object.values(queue.byProcess ?? {});
		const deadlineMs = Math.max(...processes.map((p) => p.deadlineMs ?? 0));
		const bound = Math.max(...processes.map((p) => p.bound ?? 0));
		const admissions = processes.map((p) => p.admissionBound).filter(isBound);
		if (!(deadlineMs > 0) || !(bound > 0) || admissions.length === 0) {
			ctx.blocked(
				"publisher limits",
				"inspect publisherQueue must report deadlineMs, bound and admissionBound per process",
			);
			return;
		}
		// Pack-fixed burst (v1.4): at least minBurst concurrent GETs, and always one more than the
		// declared publisher queue bound plus the declared admission bound, so a small declared
		// bound cannot shrink it.
		const admissionBound = Math.max(...admissions);
		const burstSize = Math.max(ctx.params.minBurst, bound + admissionBound + 1);
		ctx.observed.burst = { size: burstSize, bound, admissionBound, deadlineMs };
		const replica = redirectReplicaUrls(ctx)[0];
		const { link } = await createGuest(ctx, destination("F06", randomUUID()));
		const proxies = ctx.proxies("pubsub.publish");
		const toxi = ctx.toxiproxy();
		await toxi.fault("latency", proxies, { latencyMs: deadlineMs * 3 });
		try {
			const started = ctx.mono();
			const slow = await hitSlug(ctx, replica.url, link.slug, "GET", { timeoutMs: deadlineMs * 5 });
			const elapsed = ctx.mono() - started;
			ctx.check(
				"503 within deadline + margin",
				slow.status === 503 &&
					!slow.header("location") &&
					elapsed <= deadlineMs + ctx.params.marginMs,
				`503 without Location within ${deadlineMs + ctx.params.marginMs} ms`,
				{ ...brief(slow), elapsed },
			);
			// Memory is measured above a baseline taken with the same number of connections held
			// open and idle; the burst then sends one GET on each of them, so the sockets' own cost
			// is in the baseline and only what the requests make the arm hold counts.
			const held = await holdConnections(replica.url, burstSize);
			let burst: { s: number; l: boolean }[];
			let idle: Memory;
			let during: Memory;
			let after: Memory;
			let reopened: number;
			try {
				await ctx.sleep(ctx.params.idleSettleMs);
				idle = await ctx.inspect<Memory>("memory");
				reopened = held.filter((h) => !h.open()).length;
				const pending = held.map((h) =>
					hitSlug(ctx, replica.url, link.slug, "GET", { timeoutMs: deadlineMs * 5, held: h })
						.then((r) => ({ s: r.status, l: !!r.header("location") }))
						.catch(() => ({ s: 0, l: false })),
				);
				await ctx.sleep(Math.min(1_000, deadlineMs / 2));
				during = await ctx.inspect<Memory>("memory");
				burst = await Promise.all(pending);
				after = await ctx.inspect<Memory>("memory");
			} finally {
				for (const h of held) h.socket.destroy();
			}
			const statuses: Record<string, number> = {};
			for (const b of burst) statuses[b.s] = (statuses[b.s] ?? 0) + 1;
			ctx.check(
				"beyond the queue bound",
				burst.every((b) => b.s === 503 && !b.l),
				`every one of ${burstSize} concurrent GETs 503 without Location (refused by admission or by the publisher queue)`,
				{ burst: burstSize, statuses, withLocation: burst.filter((b) => b.l).length, reopened },
			);
			const growth = rssGrowth(idle, [during, after]);
			if (Object.keys(growth.byProcess).length === 0) {
				ctx.blocked("memory bounded", "inspect memory reported no process");
			} else {
				ctx.check(
					"memory bounded",
					growth.max <= ctx.params.memoryGrowthBytes,
					`RSS growth ≤ ${ctx.params.memoryGrowthBytes} bytes above a baseline with ${burstSize} idle connections open`,
					{ growth: growth.max, byProcess: growth.byProcess, burst: burstSize },
				);
			}
		} finally {
			await toxi.restore(proxies);
		}
		// A link that expires while its GET waits for the acknowledgment. expiresAt is enforced by
		// the arm's clock, so this part compares wall-clock times on purpose.
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
