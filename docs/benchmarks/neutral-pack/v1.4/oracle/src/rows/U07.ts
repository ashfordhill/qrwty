import type { Page } from "@playwright/test";
import { byName, VIEWPORTS } from "../browser/driver.ts";
import type { RowContext } from "../context.ts";
import { defineRow } from "./lib/row.ts";
import type { Combo } from "./lib/ui.ts";
import { comboUrl, matrix, openCombo, uiReady } from "./lib/ui.ts";

/** Recorded mobile lab profile: 4× CPU slowdown, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up. */
export const LAB_PROFILE = {
	cpuSlowdown: 4,
	latencyMs: 150,
	downloadBps: 200_000,
	uploadBps: 93_750,
};

async function load(
	ctx: RowContext,
	combo: Combo,
	path: string,
): Promise<{ page: Page; jsBytes: number }> {
	const { page, context } = await openCombo(ctx, combo, null);
	const cdp = await context.newCDPSession(page);
	await cdp.send("Network.enable");
	await cdp.send("Network.emulateNetworkConditions", {
		offline: false,
		latency: LAB_PROFILE.latencyMs,
		downloadThroughput: LAB_PROFILE.downloadBps,
		uploadThroughput: LAB_PROFILE.uploadBps,
	});
	await cdp.send("Emulation.setCPUThrottlingRate", { rate: LAB_PROFILE.cpuSlowdown });
	const scripts = new Map<string, number>();
	const types = new Map<string, string>();
	cdp.on("Network.responseReceived", (e: { requestId: string; type: string }) =>
		types.set(e.requestId, e.type),
	);
	cdp.on("Network.loadingFinished", (e: { requestId: string; encodedDataLength: number }) => {
		if (types.get(e.requestId) === "Script") scripts.set(e.requestId, e.encodedDataLength);
	});
	await page.addInitScript(() => {
		const w = window as unknown as { __oracle: { lcp: number; cls: number; inp: number } };
		w.__oracle = { lcp: 0, cls: 0, inp: 0 };
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) w.__oracle.lcp = e.startTime;
		}).observe({ type: "largest-contentful-paint", buffered: true });
		new PerformanceObserver((list) => {
			for (const e of list.getEntries() as (PerformanceEntry & {
				value: number;
				hadRecentInput: boolean;
			})[])
				if (!e.hadRecentInput) w.__oracle.cls += e.value;
		}).observe({ type: "layout-shift", buffered: true });
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) w.__oracle.inp = Math.max(w.__oracle.inp, e.duration);
		}).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
	});
	await page.goto(comboUrl(ctx, combo, path), { waitUntil: "networkidle" });
	const jsBytes = [...scripts.values()].reduce((a, b) => a + b, 0);
	return { page, jsBytes };
}

export default defineRow({
	id: "U07",
	title: "Performance under the recorded mobile lab profile",
	scope: "Each skin × light/dark (mobile lab profile)",
	expected:
		"Documented mobile lab profile meets agreed budgets; field metrics explicitly pending until collected",
	requires: ["publicEntry", "browser"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's built UI and the frozen accessible-name list (Q11 amendment)",
	params: {
		lcpMs: 2_500,
		inpMs: 200,
		cls: 0.1,
		routeJsBytes: 200 * 1024,
		errorPageJsBytes: 20 * 1024,
	},
	async run(ctx) {
		const names = uiReady(ctx, ["create.destination"]);
		if (!names) return;
		ctx.observed.labProfile = LAB_PROFILE;
		for (const combo of matrix(ctx, [VIEWPORTS.mobile])) {
			const { page, jsBytes } = await load(ctx, combo, "/");
			await byName(page, names, "create.destination").first().click();
			await page.waitForTimeout(1_000);
			const m = await page.evaluate(
				() =>
					(window as unknown as { __oracle: { lcp: number; cls: number; inp: number } }).__oracle,
			);
			ctx.check(
				`${combo.label}: LCP`,
				m.lcp > 0 && m.lcp <= ctx.params.lcpMs,
				`≤ ${ctx.params.lcpMs} ms`,
				m.lcp,
			);
			ctx.check(
				`${combo.label}: INP (lab interaction)`,
				m.inp <= ctx.params.inpMs,
				`≤ ${ctx.params.inpMs} ms`,
				m.inp,
			);
			ctx.check(`${combo.label}: CLS`, m.cls <= ctx.params.cls, `≤ ${ctx.params.cls}`, m.cls);
			ctx.check(
				`${combo.label}: initial route JS`,
				jsBytes <= ctx.params.routeJsBytes,
				`≤ ${ctx.params.routeJsBytes} compressed bytes`,
				jsBytes,
			);
			const errorPage = await load(ctx, combo, "/ZzZzZzZzZz");
			ctx.check(
				`${combo.label}: error page stays small`,
				errorPage.jsBytes <= ctx.params.errorPageJsBytes,
				`≤ ${ctx.params.errorPageJsBytes} compressed JS bytes (no dashboard bundle)`,
				errorPage.jsBytes,
			);
		}
		ctx.notRun(
			"field metrics",
			"LCP/INP/CLS at the 75th percentile need real field data; pending until collected",
		);
	},
});
