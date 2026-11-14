import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { asLink, brief, hitSlug, moveClockKeepingSessions, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F09",
	title: "Archive stalled, retention approached, misconfigured subscription (local portion)",
	scope: "Local portion; staging",
	expected:
		"Locally: alerts and the safety gate fire, the startup or deployment check rejects the misconfiguration, backlog is preserved and replayed. Real archive delivery is staging",
	requires: [
		"publicEntry",
		"identity",
		"pubsub",
		"workers",
		"command:clock",
		"command:inspect",
		"command:subscriptionCheck",
		"command:stop",
		"command:start",
	],
	coverage: "live-arm",
	liveArmReason: "needs the arm's archive/backlog alerts, safety gate and subscription checks",
	params: { reconcileMs: 180_000 },
	async run(ctx) {
		for (const misconfiguration of ["inactivity-expiry-enabled", "missing-archive-subscription"]) {
			const result = await ctx.commands.tryRun("subscriptionCheck", { case: misconfiguration });
			const json = (result.json ?? {}) as { rejected?: boolean; reason?: string };
			ctx.check(
				`${misconfiguration} rejected`,
				result.exitCode === 0 && json.rejected === true && !!json.reason,
				"the startup or deployment check rejects it with a reason",
				{ exitCode: result.exitCode, ...json },
			);
		}
		const alice = await ctx.signedIn("alice");
		const capture = await ctx.pubsub();
		const link = asLink(await alice.createLink(destination("F09", randomUUID())));
		if (!link) throw new Error("owned create failed");
		const archive = ctx.adapter.workers.filter((w) => w.kind === "analytics");
		for (const w of archive) await ctx.commands.run("stop", { target: w.name });
		try {
			for (let i = 0; i < 5; i++) await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug);
			await moveClockKeepingSessions(ctx, 30 * 86_400_000, [alice]);
			await ctx.sleep(10_000);
			const alerts =
				(await ctx.inspect<{ items?: { name?: string; state?: string }[] }>("alerts")).items ?? [];
			ctx.check(
				"alerts fire",
				alerts.some((a) => a.state === "firing"),
				"a firing backlog or archive alert",
				alerts,
			);
			const gate = await ctx.inspect<{ redirectAdmission?: string }>("safetyGate");
			ctx.check(
				"safety gate",
				gate.redirectAdmission === "closed",
				"redirectAdmission closed before retention",
				gate,
			);
			const gated = await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug);
			ctx.check(
				"gate refuses new redirects",
				gated.status === 503 && !gated.header("location"),
				"503 without Location",
				brief(gated),
			);
		} finally {
			await ctx.clock.set(0);
			for (const w of archive) await ctx.commands.run("start", { target: w.name });
		}
		const expected = () =>
			[...capture.events().values()].filter(
				(m) => m.json?.linkId === link.id && m.json?.synthetic !== true,
			).length;
		const replayed = await poll(
			() =>
				alice
					.analytics(link.id)
					.then(
						(r) =>
							(r.json as { totals?: { recordedAttempts?: number } } | undefined)?.totals
								?.recordedAttempts ?? -1,
					),
			(n) => n === expected(),
			ctx.params.reconcileMs,
			2_000,
		);
		ctx.check(
			"backlog preserved and replayed",
			replayed.ok,
			`${expected()} unique events after recovery`,
			replayed.value,
		);
		ctx.notRun(
			"real archive delivery",
			"staging scope (Cloud Storage export subscription); not part of a local run",
		);
	},
});
