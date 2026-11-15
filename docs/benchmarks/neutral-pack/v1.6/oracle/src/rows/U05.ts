import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { byName, type UiNames } from "../browser/driver.ts";
import { defineRow } from "./lib/row.ts";
import { browserSignIn, matrix, openCombo, uiReady, visible } from "./lib/ui.ts";

const KEYS = [
	"create.destination",
	"create.submit",
	"status.offline",
	"status.error",
	"status.rateLimited",
	"status.sessionExpired",
	"nav.signIn",
	"nav.library",
];

async function submit(page: Page, names: UiNames): Promise<void> {
	const field = byName(page, names, "create.destination").first();
	await field.click();
	await field.fill(`https://example.com/oracle/u05/${randomUUID()}`);
	await byName(page, names, "create.submit").first().click();
}

export default defineRow({
	id: "U05",
	title: "Slow, offline, error and session-expiry states",
	scope: "One skin × light/dark × desktop/mobile",
	expected:
		"Each state in design brief reproduced; no silent reset or anonymous retry of account requests",
	requires: ["publicEntry", "browser", "identity"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's UI and the frozen accessible-name list (Q11 amendment)",
	async run(ctx) {
		const names = uiReady(ctx, KEYS);
		if (!names) return;
		for (const combo of matrix(ctx)) {
			const { page, context } = await openCombo(ctx, combo);
			// Slow: the create request is held for 5 s; the submit control shows a busy state.
			await page.route("**/api/v1/links", async (route) => {
				await new Promise((r) => setTimeout(r, 5_000));
				await route.continue();
			});
			await submit(page, names);
			const busy = await byName(page, names, "create.submit")
				.first()
				.evaluate(
					(el) =>
						(el as HTMLButtonElement).disabled ||
						el.getAttribute("aria-busy") === "true" ||
						el.getAttribute("aria-disabled") === "true",
				);
			ctx.check(
				`${combo.label}: submitting state`,
				busy,
				"the submit control is disabled or busy while the create is pending",
				busy,
			);
			await page.unroute("**/api/v1/links");
			await context.setOffline(true);
			await submit(page, names);
			ctx.check(
				`${combo.label}: offline`,
				await visible(page, names, "status.offline"),
				"offline message",
				null,
			);
			await context.setOffline(false);
			for (const [status, key] of [
				[503, "status.error"],
				[429, "status.rateLimited"],
			] as const) {
				await page.route("**/api/v1/links", (route) =>
					route.fulfill({
						status,
						contentType: "application/json",
						headers: status === 429 ? { "Retry-After": "30" } : { "Retry-After": "5" },
						body: JSON.stringify({
							error: {
								code: status === 429 ? "rate_limited" : "unavailable",
								message: "oracle",
								retryable: true,
							},
						}),
					}),
				);
				await submit(page, names);
				ctx.check(
					`${combo.label}: ${key}`,
					await visible(page, names, key),
					`${key} shown for ${status}`,
					null,
				);
				await page.unroute("**/api/v1/links");
			}
			// Session expiry: account requests answer 401; the UI says so and never retries anonymously.
			await byName(page, names, "nav.signIn").first().click();
			await browserSignIn(ctx, page, "alice");
			const anonymousRetries: string[] = [];
			page.on("request", (request) => {
				const url = new URL(request.url());
				if (url.pathname.startsWith("/api/v1/me") && !request.headers().cookie)
					anonymousRetries.push(url.pathname);
			});
			await page.route("**/api/v1/me/**", (route) =>
				route.fulfill({
					status: 401,
					contentType: "application/json",
					body: JSON.stringify({
						error: { code: "session_expired", message: "oracle", retryable: false },
					}),
				}),
			);
			await byName(page, names, "nav.library").first().click();
			ctx.check(
				`${combo.label}: session expired`,
				await visible(page, names, "status.sessionExpired"),
				"session-expired message",
				null,
			);
			const posts: string[] = [];
			page.on("request", (r) => {
				if (r.method() === "POST" && new URL(r.url()).pathname === "/api/v1/links")
					posts.push(r.url());
			});
			await page.waitForTimeout(3_000);
			ctx.check(
				`${combo.label}: no anonymous retry`,
				posts.length === 0 && anonymousRetries.length === 0,
				"no automatic guest retry after a 401",
				{ posts: posts.length, anonymousRetries },
			);
			await page.unroute("**/api/v1/me/**");
		}
	},
});
