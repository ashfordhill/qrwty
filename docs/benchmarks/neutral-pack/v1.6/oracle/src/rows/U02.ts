import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { byName, type UiNames } from "../browser/driver.ts";
import { AccountBlockedError } from "../identity.ts";
import { defineRow } from "./lib/row.ts";
import { browserSignIn, matrix, openCombo, uiReady, visible } from "./lib/ui.ts";

const KEYS = [
	"create.destination",
	"create.submit",
	"result.shortUrl",
	"result.copy",
	"result.downloadPng",
	"result.save",
	"nav.library",
	"library.firstItem",
	"link.edit",
	"edit.destination",
	"edit.save",
	"link.disable",
	"link.confirmDisable",
	"link.analytics",
	"analytics.export",
	"nav.pricing",
	"billing.upgrade",
	"billing.portal",
];

async function step(
	page: Page,
	names: UiNames,
	key: string,
	action: "click" | "download" = "click",
): Promise<boolean> {
	const target = byName(page, names, key).first();
	try {
		await target.waitFor({ state: "visible", timeout: 15_000 });
		if (action === "download") {
			const download = page.waitForEvent("download", { timeout: 15_000 });
			await target.click();
			await download;
		} else {
			await target.click();
		}
		return true;
	} catch {
		return false;
	}
}

export default defineRow({
	id: "U02",
	title: "Mouse/touch-only core flows",
	scope: "One skin × light/dark × desktop/mobile",
	expected:
		"Create/copy/QR/save/list/edit/disable/analytics/export/upgrade/portal/cancel complete without keyboard shortcuts",
	requires: ["publicEntry", "browser", "identity", "stripe"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's UI and the frozen accessible-name list (Q11 amendment)",
	async run(ctx) {
		const names = uiReady(ctx, KEYS);
		if (!names) return;
		for (const combo of matrix(ctx)) {
			if (ctx.commands.has("reset")) await ctx.commands.run("reset");
			const { page } = await openCombo(ctx, combo);
			const done: Record<string, boolean> = {};
			const fill = async (key: string, value: string) => {
				const field = byName(page, names, key).first();
				await field.click();
				await field.fill(value);
			};
			await fill("create.destination", `https://example.com/oracle/u02/${randomUUID()}`);
			done.create =
				(await step(page, names, "create.submit")) &&
				(await visible(page, names, "result.shortUrl"));
			done.copy = await step(page, names, "result.copy");
			done.qr = await step(page, names, "result.downloadPng", "download");
			done.save = await step(page, names, "result.save");
			if (done.save) {
				await browserSignIn(ctx, page, "alice").catch((error: Error) => {
					if (error instanceof AccountBlockedError) throw error;
					done.save = false;
				});
			}
			done.list =
				(await step(page, names, "nav.library")) && (await step(page, names, "library.firstItem"));
			done.edit =
				(await step(page, names, "link.edit")) &&
				(await fill(
					"edit.destination",
					`https://example.com/oracle/u02/edited-${randomUUID()}`,
				).then(
					() => true,
					() => false,
				)) &&
				(await step(page, names, "edit.save"));
			done.disable =
				(await step(page, names, "link.disable")) &&
				(await step(page, names, "link.confirmDisable"));
			done.analytics = await step(page, names, "link.analytics");
			done.export = await step(page, names, "analytics.export", "download");
			done.upgrade =
				(await step(page, names, "nav.pricing")) && (await step(page, names, "billing.upgrade"));
			if (done.upgrade) {
				done.upgrade = await page
					.getByRole("button", { name: "Pay (test fixture)" })
					.click()
					.then(
						() => true,
						() => false,
					);
			}
			done.portal = await step(page, names, "billing.portal");
			done.cancel =
				done.portal &&
				(await page
					.getByRole("button", { name: "Cancel plan" })
					.click()
					.then(
						() => true,
						() => false,
					));
			const failed = Object.entries(done)
				.filter(([, ok]) => !ok)
				.map(([k]) => k);
			ctx.check(
				`${combo.label}: core flows by mouse`,
				failed.length === 0,
				"every core flow completes with clicks (and text entry) only",
				{ failed },
			);
			await ctx.artifact(
				`${combo.label.replace(/\//g, "-")}.png`,
				await page.screenshot({ fullPage: true }),
			);
		}
	},
});
