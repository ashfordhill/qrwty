import { randomUUID } from "node:crypto";
import { allReplicas } from "../adapter.ts";
import { Client } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { asLink, createGuest, hitSlug, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F03",
	title: "Pub/Sub refused, stalled and broken during publish and consume",
	scope: "Local",
	expected:
		"No 302 without a confirmed event; 503 on uncertainty; the same event ID on retry; processes recover without crash loops; consumption resumes without double counting",
	requires: ["publicEntry", "pubsub", "toxiproxy"],
	coverage: "double",
	params: { phaseMs: 5_000, settleMs: 15_000, consumeWaitMs: 120_000 },
	async run(ctx) {
		const capture = await ctx.pubsub();
		const proxy = await ctx.captureProxy();
		const toxi = ctx.toxiproxy();
		const publish = ctx.proxies("pubsub.publish");
		const { link } = await createGuest(ctx, destination("F03", randomUUID()));
		for (const kind of ["refuse", "stall", "break"] as const) {
			await toxi.fault(kind, publish);
			const end = Date.now() + ctx.params.phaseMs;
			try {
				while (Date.now() < end) {
					await hitSlug(ctx, proxy.url, link.slug, "GET", { timeoutMs: 30_000 }).catch(() => null);
				}
			} finally {
				await toxi.restore(publish);
			}
			await hitSlug(ctx, proxy.url, link.slug).catch(() => null);
		}
		await ctx.sleep(ctx.params.settleMs);
		const events = capture.events();
		const redirects = proxy.entries.filter((e) => e.status === 302);
		const unconfirmed = redirects.filter(
			(e) =>
				!e.clickEvent ||
				!events.has(e.clickEvent) ||
				(events.get(e.clickEvent)?.publishTimeMs ?? 0) > (e.headWallMs ?? 0) + 50,
		);
		ctx.check(
			"no 302 without a confirmed event",
			unconfirmed.length === 0,
			"every 302's event was published before the response",
			unconfirmed.slice(0, 5).map((e) => e.seq),
		);
		const others = proxy.entries.filter((e) => e.status !== 302);
		ctx.check(
			"503 on uncertainty",
			others.every((e) => e.status === 503 && !e.location),
			"every failed GET is 503 without Location",
			others
				.filter((e) => e.status !== 503 || e.location)
				.slice(0, 5)
				.map((e) => ({ seq: e.seq, status: e.status })),
		);
		const ids = redirects.map((e) => e.clickEvent);
		ctx.check(
			"one event ID per redirect",
			new Set(ids).size === ids.length,
			"no two 302s share an event ID",
			{ redirects: ids.length, unique: new Set(ids).size },
		);
		const ready = await poll(
			async () =>
				Promise.all(
					allReplicas(ctx.adapter).map(async (r) => {
						const spec = Object.values(ctx.adapter.services).find((s) => s.replicas.includes(r));
						return (
							(
								await new Client(r.url, ctx.origin)
									.request("GET", spec?.readiness ?? "/readyz")
									.catch(() => null)
							)?.status ?? 0
						);
					}),
				),
			(statuses) => statuses.every((s) => s === 200),
			60_000,
			1_000,
		);
		ctx.check(
			"processes recover",
			ready.ok,
			"readiness 200 on every replica within 60 s, no restart command",
			ready.value,
		);

		// Consume side: fault the subscriber path, then check totals reconcile without double count.
		const consume = ctx.proxies("pubsub.consume");
		if (consume.length === 0 || consume.join() === publish.join()) {
			ctx.blocked("consume faults", "no separate Toxiproxy proxy for pubsub.consume");
			return;
		}
		if (!ctx.adapter.identity) {
			ctx.blocked("consume totals", "identity is needed to read analytics");
			return;
		}
		const alice = await ctx.signedIn("alice");
		const owned = asLink(await alice.createLink(destination("F03", `${randomUUID()}-owned`)));
		if (!owned) throw new Error("owned create failed");
		for (const kind of ["refuse", "stall", "break"] as const) {
			await toxi.fault(kind, consume);
			try {
				for (let i = 0; i < 5; i++) await hitSlug(ctx, ctx.adapter.publicEntry.url, owned.slug);
				await ctx.sleep(ctx.params.phaseMs);
			} finally {
				await toxi.restore(consume);
			}
		}
		const expected = () =>
			[...capture.events().values()].filter(
				(m) => m.json?.linkId === owned.id && m.json?.synthetic !== true,
			).length;
		const totals = await poll(
			() =>
				alice
					.analytics(owned.id)
					.then(
						(r) =>
							(r.json as { totals?: { recordedAttempts?: number } } | undefined)?.totals
								?.recordedAttempts ?? -1,
					),
			(n) => n === expected(),
			ctx.params.consumeWaitMs,
			2_000,
		);
		ctx.check(
			"consumption resumes without double counting",
			totals.ok,
			`${expected()} unique events`,
			totals.value,
		);
	},
});
