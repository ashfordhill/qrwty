// Shared browser-row helpers: the skin × light/dark × desktop/mobile matrix (acceptance-oracle §6).
import type { BrowserContext, Page } from "@playwright/test";
import { byName, type UiNames, VIEWPORTS, type ViewportSpec } from "../../browser/driver.ts";
import type { RowContext } from "../../context.ts";
import { missingNames } from "./flows.ts";

export interface Combo {
	skin: string;
	theme: "light" | "dark";
	viewport: ViewportSpec;
	label: string;
}

export function matrix(
	ctx: RowContext,
	viewports: ViewportSpec[] = [VIEWPORTS.desktop, VIEWPORTS.mobile],
): Combo[] {
	const skins = ctx.adapter.ui?.skins ?? [];
	const out: Combo[] = [];
	for (const skin of skins) {
		for (const theme of ["light", "dark"] as const) {
			for (const viewport of viewports)
				out.push({ skin, theme, viewport, label: `${skin}/${theme}/${viewport.name}` });
		}
	}
	return out;
}

/** Reports `blocked` and returns null unless the UI section, the skins and every key exist. */
export function uiReady(ctx: RowContext, keys: string[]): UiNames | null {
	if (!ctx.adapter.ui || ctx.adapter.ui.skins.length === 0) {
		ctx.blocked("UI section", "adapter has no ui.skins");
		return null;
	}
	const missing = missingNames(ctx, keys);
	if (missing.length > 0) {
		ctx.blocked(
			"frozen UI names",
			`accessible-name list not frozen for: ${missing.join(", ")} (pending the Q11 pack amendment)`,
		);
		return null;
	}
	return ctx.uiNames;
}

/** The URL of `path` for a combination (skin query parameter when the arm selects skins by query). */
export function comboUrl(ctx: RowContext, combo: Combo, path: string): string {
	const url = new URL(path, ctx.origin);
	const select = ctx.adapter.ui?.selectSkin;
	if (select?.kind === "query") url.searchParams.set(select.key, combo.skin);
	return url.toString();
}

/** Opens a context for the combination; `path` null opens no page navigation yet. */
export async function openCombo(
	ctx: RowContext,
	combo: Combo,
	path: string | null = "/",
	options: { reducedMotion?: "reduce" | "no-preference" } = {},
): Promise<{ context: BrowserContext; page: Page; opened: { url: string }[] }> {
	const driver = await ctx.browser();
	const stripe = ctx.run.stripe?.url;
	const { context, opened } = await driver.context(ctx.origin, {
		viewport: combo.viewport,
		colorScheme: combo.theme,
		reducedMotion: options.reducedMotion,
		allowOrigins: [
			...(stripe ? [stripe] : []),
			...(ctx.adapter.identity ? [ctx.adapter.identity.issuerUrl] : []),
		],
	});
	ctx.onCleanup(() => context.close());
	const select = ctx.adapter.ui?.selectSkin;
	if (select?.kind === "storage") {
		await context.addInitScript(
			({ key, value }) => {
				try {
					localStorage.setItem(key, value);
				} catch {
					// storage unavailable
				}
			},
			{ key: select.key, value: combo.skin },
		);
	}
	const page = await context.newPage();
	if (path !== null) await page.goto(comboUrl(ctx, combo, path));
	return { context, page, opened };
}

/** Horizontal overflow in CSS pixels (0 when the page fits its viewport). */
export function overflow(page: Page): Promise<number> {
	return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
}

export async function visible(
	page: Page,
	names: UiNames,
	key: string,
	timeout = 10_000,
): Promise<boolean> {
	try {
		await byName(page, names, key).first().waitFor({ state: "visible", timeout });
		return true;
	} catch {
		return false;
	}
}

/** Signs in through the issuer's login page in the browser (mouse clicks and text entry only). */
export async function browserSignIn(page: Page, username: string, password: string): Promise<void> {
	await page.waitForSelector('input[type="password"]', { timeout: 15_000 });
	const user = page.locator('input[type="text"], input[type="email"]').first();
	await user.click();
	await user.fill(username);
	const pass = page.locator('input[type="password"]').first();
	await pass.click();
	await pass.fill(password);
	await page.locator('input[type="submit"], button[type="submit"]').first().click();
}
