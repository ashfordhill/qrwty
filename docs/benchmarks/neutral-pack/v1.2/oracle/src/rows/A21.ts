import { brief, isPaid, poll, subscribe } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

const subStatus = (r: { json: unknown }) =>
	(r.json as { subscription?: { status?: string } } | undefined)?.subscription?.status;

export default defineRow({
	id: "A21",
	title:
		"Out-of-order webhook, stale reconciliation worker, lost response, delayed provider, browser return",
	scope: "Local",
	expected:
		"No state regression; the late worker cannot write; idempotent redelivery; reconciliation recovers; the return URL grants nothing",
	requires: ["publicEntry", "identity", "stripe", "command:faultPoint"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's reconciliation worker, leases and fencing",
	params: { leaseWaitMs: 90_000, settleMs: 60_000 },
	async run(ctx) {
		const stripe = ctx.stripe();
		const bob = await ctx.signedIn("bob");
		// The browser return URL grants nothing.
		const checkout = await bob.mutate(
			"POST",
			"/api/v1/billing/checkout",
			{ plan: "paid-monthly" },
			{ idempotencyKey: true },
		);
		ctx.check("checkout created", checkout.status === 200, "200", brief(checkout));
		await bob.get("/billing?checkout=success");
		await ctx.sleep(5_000);
		const afterReturn = await bob.billing();
		ctx.check(
			"return URL grants nothing",
			!isPaid(afterReturn),
			"still free without a webhook",
			brief(afterReturn),
		);

		const alice = await ctx.signedIn("alice");
		const { subscriptionId } = await subscribe(ctx, alice);
		// Out of order: a newer past_due update, then an older "active" update delivered late.
		const older = stripe.events.filter((e) => e.type === "customer.subscription.created").at(-1);
		const failed = stripe.paymentFailed(subscriptionId);
		for (const event of failed) await stripe.deliver(event);
		const pastDue = await poll(
			() => alice.billing(),
			(r) => subStatus(r) === "past_due",
			ctx.params.settleMs,
			1_000,
		);
		ctx.check("newer state applied", pastDue.ok, "past_due", subStatus(pastDue.value) ?? null);
		if (older) await stripe.deliver(older);
		await ctx.sleep(10_000);
		const noRegression = await alice.billing();
		ctx.check(
			"no state regression",
			subStatus(noRegression) === "past_due",
			"still past_due after the older event",
			subStatus(noRegression) ?? null,
		);

		// Lost response: deliver, ignore the response, deliver the same event again.
		const recovered = stripe.paymentRecovered(subscriptionId);
		for (const event of recovered) {
			await stripe.deliver(event);
			const again = await stripe.deliver(event);
			ctx.check(
				`redelivery of ${event.type}`,
				again.status >= 200 && again.status < 300,
				"2xx",
				brief(again),
			);
		}
		const active = await poll(
			() => alice.billing(),
			(r) => subStatus(r) === "active",
			ctx.params.settleMs,
			1_000,
		);
		ctx.check(
			"idempotent redelivery",
			active.ok,
			"active after the duplicated recovery events",
			subStatus(active.value) ?? null,
		);

		// Stale worker: pause reconciliation past its lease, change the state, resume.
		await ctx.commands.run("faultPoint", {
			name: "pause-reconciliation-worker",
			state: "on",
			arg: "",
		});
		try {
			const cancel = stripe.setCancelAtPeriodEnd(subscriptionId, true);
			for (const event of cancel) await stripe.deliver(event);
			await ctx.sleep(ctx.params.leaseWaitMs);
			const fail = stripe.paymentFailed(subscriptionId);
			for (const event of fail) await stripe.deliver(event);
		} finally {
			await ctx.commands.run("faultPoint", {
				name: "pause-reconciliation-worker",
				state: "off",
				arg: "",
			});
		}
		const canonical = stripe.subscriptions.get(subscriptionId);
		const final = await poll(
			() => alice.billing(),
			(r) =>
				subStatus(r) === canonical?.status &&
				(r.json as { subscription?: { cancelAtPeriodEnd?: boolean } }).subscription
					?.cancelAtPeriodEnd === true,
			ctx.params.settleMs,
			1_000,
		);
		ctx.check(
			"late worker cannot write",
			final.ok,
			`canonical state (${String(canonical?.status)}, cancel at period end) wins`,
			(final.value.json as { subscription?: unknown } | undefined)?.subscription ?? null,
		);

		// Delayed provider: reconciliation still recovers.
		stripe.delayMs = 10_000;
		const late = stripe.paymentRecovered(subscriptionId);
		for (const event of late) await stripe.deliver(event);
		const slow = await poll(
			() => alice.billing(),
			(r) => subStatus(r) === "active",
			ctx.params.settleMs + 30_000,
			2_000,
		);
		stripe.delayMs = 0;
		ctx.check(
			"reconciliation recovers with a delayed provider",
			slow.ok,
			"active after the delayed fixture answers",
			subStatus(slow.value) ?? null,
		);
	},
});
