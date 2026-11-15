import { brief, FREE_POLICY, isError, isPaid, parallel, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A19",
	title: "Free sign-up, Checkout, concurrent checkouts and the portal",
	scope: "Local (fixture) and Stripe test mode",
	expected:
		"Free needs no card; checkout returns a hosted URL for the allowlisted price; after completion at most one active subscription; portal returns a URL",
	requires: ["publicEntry", "identity", "stripe"],
	coverage: "live-arm",
	liveArmReason:
		"needs the arm's Billing API, webhook inbox and reconciliation against the Stripe fixture",
	async run(ctx) {
		const stripe = ctx.stripe();
		const priceId = ctx.adapter.providers?.stripe?.priceId ?? "";
		const alice = await ctx.signedIn("alice");
		const billing = await alice.billing();
		const body = (billing.json ?? {}) as { policy?: string; subscription?: { status?: string } };
		ctx.check(
			"free without a card",
			billing.status === 200 &&
				body.policy === FREE_POLICY &&
				stripe.callsTo("POST", "/v1/checkout/sessions").length === 0,
			`200 with policy ${FREE_POLICY}, no Checkout call`,
			{ ...brief(billing), policy: body.policy ?? null, status: body.subscription?.status ?? null },
		);

		const checkout = await alice.mutate(
			"POST",
			"/api/v1/billing/checkout",
			{ plan: "paid-monthly" },
			{ idempotencyKey: true },
		);
		const url = (checkout.json as { url?: string } | undefined)?.url ?? "";
		const created = stripe.callsTo("POST", "/v1/checkout/sessions");
		const lineItems = (created.at(-1)?.params.line_items as { price?: string }[] | undefined) ?? [];
		ctx.check(
			"hosted Checkout URL",
			checkout.status === 200 && url.startsWith(`${stripe.url}/checkout/`),
			"200 {url} on the Stripe fixture's hosted page",
			{ ...brief(checkout), url },
		);
		ctx.check(
			"allowlisted price",
			lineItems.length === 1 &&
				lineItems[0].price === priceId &&
				created.at(-1)?.params.mode === "subscription",
			`one line item with ${priceId}, mode subscription`,
			created.at(-1)?.params ?? null,
		);
		const unknown = await alice.mutate(
			"POST",
			"/api/v1/billing/checkout",
			{ plan: "oracle-unknown" },
			{ idempotencyKey: true },
		);
		ctx.check("unknown plan", unknown.status === 400, "400", brief(unknown));
		const forgedPrice = await alice.mutate(
			"POST",
			"/api/v1/billing/checkout",
			{ plan: "paid-monthly", price: "price_oracle_injected" },
			{ idempotencyKey: true },
		);
		const injected = stripe.calls.some((c) =>
			JSON.stringify(c.params).includes("price_oracle_injected"),
		);
		ctx.check("browser price ignored", !injected, "no Stripe call uses a browser-supplied price", {
			...brief(forgedPrice),
			injected,
		});

		// Five concurrent checkouts for Bob with distinct keys; complete every open session returned.
		const bob = await ctx.signedIn("bob");
		const five = await parallel(5, () =>
			bob.mutate(
				"POST",
				"/api/v1/billing/checkout",
				{ plan: "paid-monthly" },
				{ idempotencyKey: true },
			),
		);
		const sessionIds = [
			...new Set(
				five
					.map((r) => (r.json as { url?: string } | undefined)?.url)
					.filter((u): u is string => !!u)
					.map((u) => new URL(u).pathname.split("/").pop() ?? ""),
			),
		];
		ctx.check(
			"concurrent checkouts answered",
			five.every((r) => r.status === 200 || isError(r, 409, "already_subscribed")),
			"200 {url} (or 409 already_subscribed)",
			five.map(brief),
		);
		for (const id of sessionIds) {
			const session = stripe.sessions.get(id);
			if (session?.status !== "open") continue;
			const { events } = stripe.completeCheckout(id);
			for (const event of events) await stripe.deliver(event);
		}
		const paid = await poll(() => bob.billing(), isPaid, 60_000, 1_000);
		ctx.check(
			"Bob becomes paid",
			paid.ok,
			"policy paid-test-v1 after the webhook",
			brief(paid.value),
		);
		await ctx.sleep(10_000);
		const customers = new Set(
			[...stripe.sessions.values()]
				.filter((s) => sessionIds.includes(s.id))
				.map((s) => String(s.customer)),
		);
		const active = [...customers].flatMap((c) => stripe.activeSubscriptions(c));
		ctx.check(
			"at most one active subscription",
			active.length <= 1,
			"≤ 1 active subscription for Bob after completing every returned session",
			{ sessions: sessionIds.length, customers: customers.size, active: active.length },
		);
		const portal = await bob.mutate("POST", "/api/v1/billing/portal", undefined, {
			idempotencyKey: false,
		});
		const portalUrl = (portal.json as { url?: string } | undefined)?.url ?? "";
		ctx.check(
			"portal URL",
			portal.status === 200 && portalUrl.startsWith(`${stripe.url}/portal/`),
			"200 {url} of a hosted portal session",
			{ ...brief(portal), url: portalUrl },
		);
		ctx.note(
			"real Stripe test-mode runs are separate rows; this run uses the oracle's Stripe fixture",
		);
	},
});
