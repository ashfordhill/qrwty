import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { asLink, brief, hitSlug, moveClockKeepingSessions, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

interface Alert {
	name?: string;
	state?: string;
	severity?: string;
}

export default defineRow({
	id: "A13",
	title: "Analytics outage, backlog, late recovery and the retention safety gate",
	scope: "Local",
	expected:
		"Every 302 still has its event captured; analytics shows delayed: true; after restart totals reconcile without double counting; alerts fire and the safety gate stops new redirects (503) before any accepted event could expire",
	requires: [
		"publicEntry",
		"identity",
		"pubsub",
		"workers",
		"command:stop",
		"command:start",
		"command:clock",
		"command:inspect",
	],
	coverage: "live-arm",
	liveArmReason: "needs real analytics workers, backlog alerts and the redirect safety gate",
	params: { outageMs: 600_000, intervalMs: 5_000, delayedAfterMs: 70_000, reconcileMs: 180_000 },
	async run(ctx) {
		const workers = ctx.adapter.workers.filter((w) => w.kind === "analytics");
		const alice = await ctx.signedIn("alice");
		const capture = await ctx.pubsub();
		const link = asLink(await alice.createLink(destination("A13", randomUUID())));
		if (!link) throw new Error("owned create failed");
		const entry = ctx.adapter.publicEntry.url;
		const unique = () =>
			[...capture.events().values()].filter(
				(m) => m.json?.linkId === link.id && m.json?.synthetic !== true,
			);
		for (const w of workers) await ctx.commands.run("stop", { target: w.name });
		const responses: { status: number; eventId: string | null }[] = [];
		let delayedSeen: unknown = null;
		const start = Date.now();
		try {
			while (Date.now() - start < ctx.params.outageMs) {
				const r = await hitSlug(ctx, entry, link.slug);
				responses.push({ status: r.status, eventId: r.header("qrwty-click-event") ?? null });
				if (delayedSeen === null && Date.now() - start > ctx.params.delayedAfterMs) {
					const a = await alice.analytics(link.id);
					delayedSeen = (a.json as { freshness?: unknown } | undefined)?.freshness ?? brief(a);
				}
				await ctx.sleep(ctx.params.intervalMs);
			}
		} finally {
			for (const w of workers) await ctx.commands.run("start", { target: w.name });
		}
		const ids = new Set(unique().map((m) => String(m.json?.eventId)));
		const redirects = responses.filter((r) => r.status === 302);
		ctx.check(
			"redirects continue during the outage",
			redirects.length === responses.length,
			"302 for every GET while workers are stopped",
			{ total: responses.length, redirects: redirects.length },
		);
		ctx.check(
			"every 302 captured",
			redirects.every((r) => r.eventId && ids.has(r.eventId)),
			"each 302's event ID is in the capture",
			redirects.filter((r) => !r.eventId || !ids.has(r.eventId)).length,
		);
		ctx.check(
			"delayed shown",
			(delayedSeen as { delayed?: boolean } | null)?.delayed === true,
			"freshness.delayed true during the outage",
			delayedSeen,
		);
		const expected = unique().length;
		const totals = () =>
			alice
				.analytics(link.id)
				.then(
					(r) =>
						(r.json as { totals?: { recordedAttempts?: number } } | undefined)?.totals
							?.recordedAttempts ?? -1,
				);
		const reconciled = await poll(totals, (n) => n === expected, ctx.params.reconcileMs, 2_000);
		ctx.check(
			"totals reconcile after restart",
			reconciled.ok,
			`${expected} unique events`,
			reconciled.value,
		);

		// Retention: stop the workers again, then move the clock so the oldest backlog is 30 days old.
		for (const w of workers) await ctx.commands.run("stop", { target: w.name });
		try {
			for (let i = 0; i < 3; i++) await hitSlug(ctx, entry, link.slug);
			await moveClockKeepingSessions(ctx, 30 * 86_400_000, [alice]);
			await ctx.sleep(10_000);
			const alerts = (await ctx.inspect<{ items?: Alert[] }>("alerts")).items ?? [];
			ctx.check(
				"backlog alert fires",
				alerts.some((a) => a.state === "firing"),
				"at least one firing alert for the aged backlog",
				alerts,
			);
			const gate = await ctx.inspect<{ redirectAdmission?: string; reason?: string }>("safetyGate");
			ctx.check(
				"safety gate closed",
				gate.redirectAdmission === "closed",
				"redirectAdmission closed",
				gate,
			);
			const gated = await hitSlug(ctx, entry, link.slug);
			ctx.check(
				"new redirects stopped",
				gated.status === 503 && !gated.header("location") && !!gated.header("retry-after"),
				"503 with Retry-After and no Location",
				brief(gated),
			);
		} finally {
			await ctx.clock.set(0);
			for (const w of workers) await ctx.commands.run("start", { target: w.name });
		}
		const finalExpected = unique().length;
		const final = await poll(totals, (n) => n === finalExpected, ctx.params.reconcileMs, 2_000);
		ctx.check(
			"backlog replayed without loss",
			final.ok,
			`${finalExpected} unique events`,
			final.value,
		);
	},
});
