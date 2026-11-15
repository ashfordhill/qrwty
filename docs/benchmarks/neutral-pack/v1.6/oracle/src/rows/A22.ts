import { randomUUID } from "node:crypto";
import { idempotencyKey } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import {
	apiReplicaUrls,
	asLink,
	billingOf,
	brief,
	createGuest,
	hitSlug,
	isError,
	poll,
	sameJson,
	subscribe,
} from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

const isoDate = (offsetDays: number) =>
	new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export default defineRow({
	id: "A22",
	title: "Tier quotas across replicas, retries, claim, delete and plan changes",
	scope: "Local",
	expected:
		"Exactly 5 succeed; retries consume nothing; the claim is 403 quota_exceeded and the guest link keeps working; delete refunds nothing; new limits apply within 60 s and usage is kept; breakdowns null and 403 tier_restricted",
	requires: ["publicEntry", "identity", "stripe"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's Link API quota transactions and Billing API grants",
	params: { attempts: 10, freeLimit: 5, grantMs: 60_000 },
	async run(ctx) {
		const bob = await ctx.signedIn("bob");
		const urls = apiReplicaUrls(ctx);
		const run = randomUUID().slice(0, 8);
		const keys = Array.from({ length: ctx.params.attempts }, () => idempotencyKey("a22"));
		const send = () =>
			Promise.all(
				keys.map((key, i) =>
					bob.at(urls[i % urls.length]).createLink(destination("A22", `${run}-${i}`), { key }),
				),
			);
		const first = await send();
		const ok = first.filter((r) => r.status === 201);
		const over = first.filter((r) => isError(r, 403, "quota_exceeded"));
		ctx.check(
			"exactly 5 owned creates",
			ok.length === ctx.params.freeLimit &&
				over.length === ctx.params.attempts - ctx.params.freeLimit,
			"5 × 201 and 5 × 403 quota_exceeded",
			first.map((r) => r.status),
		);
		const detail = over[0]?.json as
			| ({ error?: { limit?: number; used?: number; periodEnd?: string } } & {
					limit?: number;
					used?: number;
					periodEnd?: string;
			  })
			| undefined;
		const fields = detail?.error ?? detail;
		ctx.check(
			"quota error fields",
			!!fields &&
				fields.limit === ctx.params.freeLimit &&
				typeof fields.used === "number" &&
				typeof fields.periodEnd === "string",
			"limit, used and periodEnd",
			fields ?? null,
		);
		const retry = await send();
		ctx.check(
			"retries replay",
			retry.every(
				(r, i) =>
					r.status === first[i].status && (r.status !== 201 || sameJson(r.json, first[i].json)),
			),
			"same status and body per key",
			retry.map((r) => r.status),
		);
		const usage = billingOf(await bob.billing()).usage?.ownedLinkCreates;
		ctx.check(
			"retries consume nothing",
			usage?.used === ctx.params.freeLimit,
			`used = ${ctx.params.freeLimit}`,
			usage ?? null,
		);

		const guest = await createGuest(ctx, destination("A22", `${run}-guest`));
		const claim = await bob.claim(guest.link.id, guest.link.claim?.token ?? "");
		ctx.check(
			"claim over the allowance",
			isError(claim, 403, "quota_exceeded"),
			"403 quota_exceeded",
			brief(claim),
		);
		const still = await hitSlug(ctx, ctx.adapter.publicEntry.url, guest.link.slug);
		ctx.check("guest link keeps working", still.status === 302, "302", brief(still));

		const victim = asLink(ok[0]);
		if (victim) await bob.deleteLink(victim.id);
		const afterDelete = await bob.createLink(destination("A22", `${run}-after-delete`));
		ctx.check(
			"delete refunds nothing",
			isError(afterDelete, 403, "quota_exceeded"),
			"403 quota_exceeded after deleting a link",
			brief(afterDelete),
		);

		const survivor = asLink(ok[1]);
		if (survivor) {
			const analytics = await bob.analytics(survivor.id);
			ctx.check(
				"free breakdowns null",
				analytics.status === 200 &&
					(analytics.json as { breakdowns?: unknown }).breakdowns === null,
				"breakdowns null",
				brief(analytics),
			);
			const eightDays = await bob.analytics(survivor.id, `?from=${isoDate(-7)}&to=${isoDate(0)}`);
			ctx.check(
				"8-day range on free",
				isError(eightDays, 403, "tier_restricted"),
				"403 tier_restricted",
				brief(eightDays),
			);
		}

		// Upgrade: the paid limit applies within 60 s and usage is kept.
		const { subscriptionId } = await subscribe(ctx, bob);
		const upgraded = await poll(
			() => bob.createLink(destination("A22", `${run}-paid-${randomUUID().slice(0, 4)}`)),
			(r) => r.status === 201,
			ctx.params.grantMs,
			2_000,
		);
		ctx.check(
			"paid limit within 60 s",
			upgraded.ok && upgraded.elapsedMs <= ctx.params.grantMs,
			"201 within 60 s of the upgrade",
			{ elapsedMs: upgraded.elapsedMs, ...brief(upgraded.value) },
		);
		const paidUsage = billingOf(await bob.billing()).usage?.ownedLinkCreates;
		ctx.check(
			"usage kept on upgrade",
			(paidUsage?.used ?? 0) >= ctx.params.freeLimit + 1 && paidUsage?.limit === 50,
			"used continues from the free period; limit 50",
			paidUsage ?? null,
		);

		// Downgrade: back to the free limit within 60 s; usage kept.
		const stripe = ctx.stripe();
		for (const event of stripe.cancelNow(subscriptionId)) await stripe.deliver(event);
		const downgraded = await poll(
			() => bob.createLink(destination("A22", `${run}-down-${randomUUID().slice(0, 4)}`)),
			(r) => isError(r, 403, "quota_exceeded"),
			ctx.params.grantMs + 5_000,
			2_000,
		);
		ctx.check(
			"free limit within 60 s of the downgrade",
			downgraded.ok && downgraded.elapsedMs <= ctx.params.grantMs + 2_000,
			"403 quota_exceeded within 60 s",
			{ elapsedMs: downgraded.elapsedMs, ...brief(downgraded.value) },
		);
		const downUsage = billingOf(await bob.billing()).usage?.ownedLinkCreates;
		ctx.check(
			"usage kept on downgrade",
			(downUsage?.used ?? 0) >= ctx.params.freeLimit + 1 &&
				downUsage?.limit === ctx.params.freeLimit,
			"used unchanged; limit 5",
			downUsage ?? null,
		);
	},
});
