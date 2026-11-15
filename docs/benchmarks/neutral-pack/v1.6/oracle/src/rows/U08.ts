import { randomUUID } from "node:crypto";
import { byName } from "../browser/driver.ts";
import { asLink, subscribe } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";
import {
	browserSignIn,
	comboUrl,
	matrix,
	openCombo,
	overflow,
	uiReady,
	visible,
} from "./lib/ui.ts";

const KEYS = [
	"create.destination",
	"create.submit",
	"result.shortUrl",
	"nav.signIn",
	"nav.library",
	"library.firstItem",
	"link.analytics",
	"analytics.delayed",
	"nav.pricing",
	"billing.confirming",
	"billing.grace",
];

export default defineRow({
	id: "U08",
	title: "Real-length content, delayed analytics and billing states",
	scope: "One skin × light/dark × desktop/mobile",
	expected:
		"Long URLs/counts, confirming payment, grace/downgrade and delayed data remain readable; no false complete-count claim",
	requires: [
		"publicEntry",
		"browser",
		"identity",
		"stripe",
		"workers",
		"command:stop",
		"command:start",
	],
	coverage: "live-arm",
	liveArmReason:
		"needs the arm's UI, workers, Stripe fixture states and the frozen accessible-name list (Q11 amendment)",
	async run(ctx) {
		const names = uiReady(ctx, KEYS);
		if (!names) return;
		const long = `https://example.com/oracle/u08/${"segment-".repeat(120)}${randomUUID()}?${"q=1&".repeat(100)}end=1`;
		for (const combo of matrix(ctx)) {
			if (ctx.commands.has("reset")) await ctx.commands.run("reset");
			const { page } = await openCombo(ctx, combo);
			const field = byName(page, names, "create.destination").first();
			await field.click();
			await field.fill(long);
			await byName(page, names, "create.submit").first().click();
			ctx.check(
				`${combo.label}: long URL result`,
				(await visible(page, names, "result.shortUrl")) && (await overflow(page)) <= 1,
				"result shown without horizontal overflow",
				await overflow(page),
			);
			await byName(page, names, "nav.signIn").first().click();
			await browserSignIn(ctx, page, "alice");
			const alice = await ctx.signedIn("alice");
			const link = asLink(await alice.createLink(`https://example.com/oracle/u08/${randomUUID()}`));
			const analyticsWorkers = ctx.adapter.workers.filter((w) => w.kind === "analytics");
			for (const w of analyticsWorkers) await ctx.commands.run("stop", { target: w.name });
			try {
				await ctx.sleep(70_000);
				await byName(page, names, "nav.library").first().click();
				await byName(page, names, "library.firstItem").first().click();
				await byName(page, names, "link.analytics").first().click();
				ctx.check(
					`${combo.label}: delayed analytics`,
					await visible(page, names, "analytics.delayed"),
					"delayed-pipeline notice; no complete-count claim",
					link?.id ?? null,
				);
			} finally {
				for (const w of analyticsWorkers) await ctx.commands.run("start", { target: w.name });
			}
			await alice.mutate(
				"POST",
				"/api/v1/billing/checkout",
				{ plan: "paid-monthly" },
				{ idempotencyKey: true },
			);
			await page.goto(comboUrl(ctx, combo, "/billing?checkout=success"));
			ctx.check(
				`${combo.label}: confirming payment`,
				await visible(page, names, "billing.confirming"),
				"confirming-subscription notice before any webhook",
				null,
			);
			ctx.stripe().resetState();
			const { subscriptionId } = await subscribe(ctx, alice);
			for (const event of ctx.stripe().paymentFailed(subscriptionId))
				await ctx.stripe().deliver(event);
			await byName(page, names, "nav.pricing").first().click();
			ctx.check(
				`${combo.label}: grace state`,
				await visible(page, names, "billing.grace", 30_000),
				"payment-failed / grace notice",
				null,
			);
			ctx.check(
				`${combo.label}: readable`,
				(await overflow(page)) <= 1,
				"no horizontal overflow in billing states",
				await overflow(page),
			);
		}
	},
});
