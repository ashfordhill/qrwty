import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import {
	asLink,
	billingOf,
	brief,
	hitSlug,
	isPaid,
	moveClockKeepingSessions,
	poll,
	subscribe,
} from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

const GRACE_MS = 7 * 86_400_000;

export default defineRow({
	id: "A23",
	title: "Payment failure, grace expiry, cancel at period end, deletion while Stripe is down",
	scope: "Local",
	expected:
		"past_due with graceUntil = first failure + 7 days, not extended; free after grace; paid until paidThrough after cancellation; links, redirects and click capture never interrupted; deletion retries without a second cancellation or charge call",
	requires: ["publicEntry", "identity", "stripe", "command:clock"],
	coverage: "live-arm",
	liveArmReason:
		"needs the arm's subscription state machine, entitlements and deletion coordination",
	params: { settleMs: 60_000, graceToleranceMs: 300_000 },
	async run(ctx) {
		const stripe = ctx.stripe();
		const alice = await ctx.signedIn("alice");
		const link = asLink(await alice.createLink(destination("A23", randomUUID())));
		if (!link) throw new Error("owned create failed");
		const redirects: number[] = [];
		const probe = async () =>
			redirects.push((await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug)).status);
		const { subscriptionId } = await subscribe(ctx, alice);
		await probe();

		const failure = stripe.paymentFailed(subscriptionId);
		const failedAt = Number(failure[0].created) * 1000;
		for (const event of failure) await stripe.deliver(event);
		const pastDue = await poll(
			() => alice.billing(),
			(r) => billingOf(r).subscription?.status === "past_due",
			ctx.params.settleMs,
			1_000,
		);
		const grace = Date.parse(billingOf(pastDue.value).subscription?.graceUntil ?? "");
		ctx.check(
			"past_due with 7-day grace",
			pastDue.ok && Math.abs(grace - (failedAt + GRACE_MS)) <= ctx.params.graceToleranceMs,
			"graceUntil = first failure + 7 days",
			billingOf(pastDue.value).subscription ?? null,
		);
		await probe();
		for (const event of failure) await stripe.deliver(event);
		await ctx.sleep(5_000);
		for (const event of stripe.paymentFailed(subscriptionId)) await stripe.deliver(event);
		await ctx.sleep(10_000);
		const again = Date.parse(billingOf(await alice.billing()).subscription?.graceUntil ?? "");
		ctx.check(
			"grace not extended",
			again === grace,
			"same graceUntil after duplicate and repeated failures",
			{ first: grace, after: again },
		);
		await moveClockKeepingSessions(ctx, grace + 60_000 - Date.now(), [alice]);
		const free = await poll(
			() => alice.billing(),
			(r) => !isPaid(r),
			70_000,
			2_000,
		);
		ctx.check(
			"free after grace",
			free.ok,
			"policy free-test-v1 after graceUntil",
			brief(free.value),
		);
		await probe();
		await ctx.clock.set(0);

		const bob = await ctx.signedIn("bob");
		const bobSub = await subscribe(ctx, bob);
		for (const event of stripe.setCancelAtPeriodEnd(bobSub.subscriptionId, true))
			await stripe.deliver(event);
		const scheduled = await poll(
			() => bob.billing(),
			(r) => billingOf(r).subscription?.cancelAtPeriodEnd === true,
			ctx.params.settleMs,
			1_000,
		);
		const paidThrough = Date.parse(billingOf(scheduled.value).subscription?.paidThrough ?? "");
		ctx.check(
			"cancel at period end keeps paid",
			scheduled.ok && isPaid(scheduled.value) && Number.isFinite(paidThrough),
			"paid with cancelAtPeriodEnd and a paidThrough",
			billingOf(scheduled.value).subscription ?? null,
		);
		await moveClockKeepingSessions(ctx, paidThrough + 60_000 - Date.now(), [bob, alice]);
		for (const event of stripe.advancePeriod(bobSub.subscriptionId)) await stripe.deliver(event);
		const ended = await poll(
			() => bob.billing(),
			(r) => !isPaid(r),
			70_000,
			2_000,
		);
		ctx.check("free after paidThrough", ended.ok, "free after the period ends", brief(ended.value));
		await probe();
		await ctx.clock.set(0);

		// Deletion while the Stripe fixture is down: retries without a second cancellation.
		const second = await subscribe(ctx, alice);
		stripe.down = true;
		const deletedAt = Date.now();
		const del = await alice.mutate("DELETE", "/api/v1/me", undefined, { idempotencyKey: true });
		ctx.check("deletion accepted while Stripe is down", del.status === 202, "202", brief(del));
		await ctx.sleep(15_000);
		stripe.down = false;
		const cancelCalls = () =>
			stripe.calls.filter(
				(c) =>
					c.path === `/v1/subscriptions/${second.subscriptionId}` &&
					c.status === 200 &&
					(c.method === "DELETE" || c.params.cancel_at_period_end === "true"),
			);
		const cancelled = await poll(
			async () => cancelCalls().length,
			(n) => n >= 1,
			120_000,
			2_000,
		);
		await ctx.sleep(20_000);
		ctx.check(
			"one cancellation after the outage",
			cancelled.ok && cancelCalls().filter((c) => !c.replayed).length === 1,
			"exactly one successful cancellation call",
			cancelCalls().length,
		);
		const charges = stripe.calls.filter(
			(c) =>
				c.method === "POST" &&
				(c.path.startsWith("/v1/checkout/sessions") ||
					c.path === "/v1/subscriptions" ||
					c.path.startsWith("/v1/invoices")) &&
				Date.parse(c.at) >= deletedAt,
		);
		ctx.check(
			"no new charge call",
			charges.length === 0,
			"no Checkout, subscription or invoice creation after the deletion",
			charges.length,
		);
		ctx.check(
			"redirects never interrupted",
			redirects.every((s) => s === 302),
			"302 at every billing step",
			redirects,
		);
	},
});
