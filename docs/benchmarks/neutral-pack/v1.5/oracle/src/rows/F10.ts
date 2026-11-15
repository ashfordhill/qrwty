import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest, hitSlug, isPaid, poll, subscribe, withFault } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F10",
	title: "Stripe fixture down; billing database down; inbox worker killed mid-lease",
	scope: "Local",
	expected:
		"No paid access granted wrongly; no duplicate checkout or cancellation; the inbox retries; entitlements stay bounded; redirects unaffected",
	requires: [
		"publicEntry",
		"identity",
		"stripe",
		"toxiproxy",
		"workers",
		"command:kill",
		"command:start",
	],
	coverage: "live-arm",
	liveArmReason: "needs the arm's Billing API, its database behind Toxiproxy and the inbox worker",
	params: { grantMs: 60_000 },
	async run(ctx) {
		const stripe = ctx.stripe();
		const { link } = await createGuest(ctx, destination("F10", randomUUID()));
		const redirects: number[] = [];
		const probe = async () =>
			redirects.push((await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug)).status);
		const bob = await ctx.signedIn("bob");

		stripe.down = true;
		const checkout = await bob.mutate(
			"POST",
			"/api/v1/billing/checkout",
			{ plan: "paid-monthly" },
			{ idempotencyKey: true },
		);
		await probe();
		stripe.down = false;
		ctx.check(
			"checkout with Stripe down",
			checkout.status === 503 || checkout.status === 502,
			"503 (billing_unavailable), not a URL",
			brief(checkout),
		);
		ctx.check("no paid access granted", !isPaid(await bob.billing()), "Bob stays free", null);
		const sessionsBefore = stripe
			.callsTo("POST", "/v1/checkout/sessions")
			.filter((c) => c.status === 200).length;
		ctx.check(
			"no duplicate checkout",
			sessionsBefore <= 1,
			"at most one Checkout session created",
			sessionsBefore,
		);

		const billingProxies = ctx.proxies("postgres.billing");
		const down = await withFault(ctx, "refuse", "postgres.billing", async () => {
			await probe();
			return bob.mutate(
				"POST",
				"/api/v1/billing/checkout",
				{ plan: "paid-monthly" },
				{ idempotencyKey: true },
			);
		});
		ctx.check(
			"billing database down",
			down.status >= 500 && down.status < 600,
			"5xx, never a success without a durable record",
			{ ...brief(down), proxies: billingProxies },
		);

		const alice = await ctx.signedIn("alice");
		const { subscriptionId } = await subscribe(ctx, alice);
		const worker = ctx.adapter.workers.find((w) => w.kind === "billing");
		if (worker) {
			const events = stripe.paymentFailed(subscriptionId);
			for (const event of events) await stripe.deliver(event);
			await ctx.commands.run("kill", { target: worker.name });
			await ctx.sleep(5_000);
			await ctx.commands.run("start", { target: worker.name });
			const applied = await poll(
				() => alice.billing(),
				(r) =>
					(r.json as { subscription?: { status?: string } }).subscription?.status === "past_due",
				120_000,
				2_000,
			);
			ctx.check(
				"inbox retries after the worker is killed",
				applied.ok,
				"past_due applied after the inbox worker restarts",
				brief(applied.value),
			);
		} else {
			ctx.blocked("inbox worker killed mid-lease", "adapter lists no billing worker");
		}
		// Entitlements stay bounded: use more than the free allowance while paid, then keep Billing's
		// database down past the 60-second grant validity; a further paid-gated create fails closed.
		for (let i = 0; i < 6; i++)
			await alice.createLink(destination("F10", `${randomUUID()}-paid-${i}`));
		const bounded = await withFault(ctx, "refuse", "postgres.billing", async () => {
			await ctx.sleep(ctx.params.grantMs + 5_000);
			await probe();
			return alice.createLink(destination("F10", `${randomUUID()}-grant`));
		});
		ctx.check(
			"expired grants fail closed",
			bounded.status === 403 || bounded.status === 503,
			"403 or 503 for a create beyond the free allowance once the grant expired",
			brief(bounded),
		);
		const cancels = stripe.calls.filter(
			(c) => c.method === "DELETE" && c.path.startsWith("/v1/subscriptions/") && !c.replayed,
		);
		ctx.check(
			"no duplicate cancellation",
			cancels.length <= 1,
			"at most one cancellation call",
			cancels.length,
		);
		await probe();
		ctx.check(
			"redirects unaffected",
			redirects.every((s) => s === 302),
			"302 at every step",
			redirects,
		);
	},
});
