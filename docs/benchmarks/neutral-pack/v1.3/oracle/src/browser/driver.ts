// Browser driver: Playwright 1.63.0 Chromium. Destination opens are intercepted and fulfilled
// locally (never fetched); downloads are captured; UI is driven by accessible roles and names.
import {
	type Browser,
	type BrowserContext,
	chromium,
	type Locator,
	type Page,
} from "@playwright/test";

export interface ViewportSpec {
	name: string;
	width: number;
	height: number;
	isMobile?: boolean;
}

export const VIEWPORTS: Record<string, ViewportSpec> = {
	desktop: { name: "desktop", width: 1440, height: 900 },
	mobile: { name: "mobile", width: 360, height: 800, isMobile: true },
};

export interface OpenedDestination {
	url: string;
	at: string;
}

export class BrowserDriver {
	readonly browser: Browser;

	private constructor(browser: Browser) {
		this.browser = browser;
	}

	/**
	 * Every host except `allowedHosts` (the arm's origin, issuer and the oracle's fixtures) is made
	 * unresolvable, so a destination can never be fetched, even after a redirect.
	 */
	static async launch(allowedHosts: string[] = []): Promise<BrowserDriver> {
		const rules = [
			"MAP * ~NOTFOUND",
			...[...new Set(allowedHosts)].map((h) => `EXCLUDE ${h}`),
		].join(", ");
		return new BrowserDriver(
			await chromium.launch({ headless: true, args: [`--host-resolver-rules=${rules}`] }),
		);
	}

	/**
	 * A context for the arm's origin. Requests to any other origin (destinations) are fulfilled
	 * with a stub page and recorded in `opened`; the oracle never loads a third-party site.
	 */
	async context(
		origin: string,
		options: {
			viewport?: ViewportSpec;
			colorScheme?: "light" | "dark";
			reducedMotion?: "reduce" | "no-preference";
			allowOrigins?: string[];
		} = {},
	): Promise<{ context: BrowserContext; opened: OpenedDestination[] }> {
		const viewport = options.viewport ?? VIEWPORTS.desktop;
		const context = await this.browser.newContext({
			viewport: { width: viewport.width, height: viewport.height },
			isMobile: viewport.isMobile ?? false,
			hasTouch: viewport.isMobile ?? false,
			colorScheme: options.colorScheme ?? "light",
			reducedMotion: options.reducedMotion ?? "no-preference",
			acceptDownloads: true,
		});
		await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
		const allowed = new Set([
			new URL(origin).origin,
			...(options.allowOrigins ?? []).map((o) => new URL(o).origin),
		]);
		const opened: OpenedDestination[] = [];
		// Navigations that leave the allowed origins, including those reached through a redirect.
		context.on("request", (request) => {
			const url = new URL(request.url());
			if (
				!allowed.has(url.origin) &&
				request.isNavigationRequest() &&
				!opened.some((o) => o.url === request.url())
			) {
				opened.push({ url: request.url(), at: new Date().toISOString() });
			}
		});
		await context.route(
			(url) => !allowed.has(url.origin) && (url.protocol === "http:" || url.protocol === "https:"),
			async (route) => {
				const request = route.request();
				if (request.isNavigationRequest() && !opened.some((o) => o.url === request.url())) {
					opened.push({ url: request.url(), at: new Date().toISOString() });
				}
				await route.fulfill({
					status: 200,
					contentType: "text/html",
					body: "<!doctype html><title>oracle destination</title><p>oracle destination stub</p>",
				});
			},
		);
		return { context, opened };
	}

	async close(): Promise<void> {
		await this.browser.close();
	}
}

export interface UiName {
	role: string;
	name: string;
}

/** Logical UI names; the mapping is frozen by the pack amendment that carries Q11's assets. */
export type UiNames = Record<string, UiName>;

export function byName(page: Page, names: UiNames, key: string): Locator {
	const entry = names[key];
	if (!entry) throw new Error(`ui name ${key} is not in the frozen name list`);
	return page.getByRole(entry.role as Parameters<Page["getByRole"]>[0], {
		name: entry.name,
		exact: true,
	});
}
