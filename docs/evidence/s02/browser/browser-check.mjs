// S02: load every qrwty.io page in headless Chromium at phone and desktop widths, in light and
// dark. Records every request (any to another origin is aborted and counted), console errors,
// page errors and CSP violations, horizontal overflow, and a viewport screenshot.
//
//   node browser-check.mjs <base URL> <out dir> [--shots]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(
	"/home/ash/github/qrwty/docs/benchmarks/neutral-pack/v1.6/oracle/package.json",
);
const { chromium } = require("@playwright/test");
const [base, outDir, shotsFlag] = process.argv.slice(2);
const shots = shotsFlag === "--shots";
mkdirSync(outDir, { recursive: true });
const origin = new URL(base).origin;

const pages = [
	["home", "/"],
	["versions", "/versions/"],
	["design", "/versions/design/"],
	["a", "/versions/a/"],
	["a-deploy", "/versions/a/deploy/"],
	["b", "/versions/b/"],
	["original", "/versions/original/"],
	["missing", "/versions/missing.html"],
];
const viewports = {
	phone: { width: 390, height: 844, isMobile: true, hasTouch: true },
	desktop: { width: 1440, height: 900 },
};

const browser = await chromium.launch();
const results = [];
for (const [vpName, vp] of Object.entries(viewports)) {
	for (const scheme of ["light", "dark"]) {
		const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile ?? false, hasTouch: vp.hasTouch ?? false, colorScheme: scheme });
		for (const [name, path] of pages) {
			const page = await context.newPage();
			const requests = [];
			const external = [];
			const problems = [];
			await page.route("**/*", (route) => {
				const url = route.request().url();
				if (url.startsWith(origin) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
				external.push(url);
				return route.abort();
			});
			page.on("request", (r) => requests.push(`${r.method()} ${r.url().replace(origin, "")}`));
			page.on("console", (m) => {
				if (m.type() === "error" || m.type() === "warning") problems.push(`${m.type()}: ${m.text()}`);
			});
			page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
			const response = await page.goto(base + path, { waitUntil: "networkidle" });
			const info = await page.evaluate(() => ({
				title: document.title,
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
				images: [...document.images].map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0 })),
			}));
			// Lazy images: scroll to load them all, then check each decoded.
			await page.evaluate(async () => {
				for (const img of document.images) {
					img.loading = "eager";
					img.scrollIntoView();
					await new Promise((r) => setTimeout(r, 30));
				}
				await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
			});
			const images = await page.evaluate(() => [...document.images].map((i) => ({ src: i.getAttribute("src")?.slice(0, 80), ok: i.complete && i.naturalWidth > 0 })));
			await page.evaluate(() => window.scrollTo(0, 0));
			let interaction = null;
			if (name === "design") {
				// The prototype's own script must run under its CSP: the picker fills, a click navigates.
				const options = await page.locator("#pick-screen option").count();
				await page.locator("#dest").fill("https://example.com/a-long-path?x=1").catch(() => {});
				const shorten = page.getByRole("button", { name: /shorten/i }).first();
				let clicked = false;
				if (await shorten.count()) {
					await shorten.click();
					clicked = true;
					await page.waitForTimeout(1200);
				}
				const text = await page.locator("main").innerText().catch(() => "");
				interaction = { screenOptions: options, shortenClicked: clicked, resultShown: /qrwty\.io\//.test(text) };
			}
			if (shots && scheme === "light") await page.screenshot({ path: `${outDir}/${name}-${vpName}.png` });
			if (shots && scheme === "dark" && ["versions", "a"].includes(name)) await page.screenshot({ path: `${outDir}/${name}-${vpName}-dark.png` });
			results.push({
				page: path, viewport: vpName, scheme, status: response?.status(), title: info.title,
				requests: requests.length, sameOriginRequests: requests,
				externalRequests: external, problems,
				horizontalOverflowPx: Math.max(0, info.scrollWidth - info.clientWidth),
				images: { total: images.length, broken: images.filter((i) => !i.ok).map((i) => i.src) },
				interaction,
			});
			await page.close();
		}
		await context.close();
	}
}
await browser.close();
const summary = {
	base, checkedAt: new Date().toISOString(), chromium: "Playwright 1.63.0 (neutral pack v1.6 oracle install)",
	loads: results.length,
	externalRequests: results.reduce((n, r) => n + r.externalRequests.length, 0),
	problems: results.filter((r) => r.problems.length).map((r) => ({ page: r.page, viewport: r.viewport, scheme: r.scheme, problems: r.problems })),
	brokenImages: results.filter((r) => r.images.broken.length).map((r) => ({ page: r.page, broken: r.images.broken })),
	overflow: results.filter((r) => r.horizontalOverflowPx > 0).map((r) => ({ page: r.page, viewport: r.viewport, px: r.horizontalOverflowPx })),
	results,
};
writeFileSync(`${outDir}/browser-check.json`, `${JSON.stringify(summary, null, 1)}\n`);
console.log(JSON.stringify({ loads: summary.loads, externalRequests: summary.externalRequests, problems: summary.problems, brokenImages: summary.brokenImages, overflow: summary.overflow, design: results.filter((r) => r.interaction).map((r) => r.interaction) }, null, 1));
