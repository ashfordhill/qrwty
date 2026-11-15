// Q11 screenshots: core screens x light/dark x desktop (1440x900) / mobile (360x800), one state
// sheet per flow (every state in a 360 px phone frame, both themes) and the token sheet.
// Usage (repo root): node docs/evidence/q11/scripts/shots.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, context, OUT, SHEETS, serve, VIEWPORTS } from "./lib.mjs";

export const CORE = [
	["create", "create.blank"],
	["result", "result.ready"],
	["library", "links.populated"],
	["analytics", "clicks.available"],
	["billing", "plans.free"],
];
const url = (origin, state) => `${origin}/index.html?shot=1&state=${state}#${state.split(".")[0]}`;

async function main() {
	const dir = join(OUT, "screenshots");
	await mkdir(join(dir, "screens"), { recursive: true });
	await mkdir(join(dir, "states"), { recursive: true });
	const srv = await serve();
	const browser = await chromium.launch();
	const index = [];
	const problems = [];
	for (const theme of ["light", "dark"]) {
		for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
			const { ctx, external, errors } = await context(browser, srv.origin, { viewport: vp, colorScheme: theme });
			const page = await ctx.newPage();
			for (const [name, state] of CORE) {
				await page.setViewportSize({ width: vp.width, height: vp.height });
				await page.goto(url(srv.origin, state));
				await page.waitForTimeout(150);
				const file = `screens/${name}-${theme}-${vpName}.png`;
				// Above the fold exactly as the device shows it.
				await page.screenshot({ path: join(dir, file.replace(".png", "-fold.png")) });
				// Whole page; on mobile the viewport grows so the fixed tab bar sits at the true bottom.
				if (vp.isMobile) {
					const h = await page.evaluate(() => document.documentElement.scrollHeight);
					await page.setViewportSize({ width: vp.width, height: h });
					await page.waitForTimeout(80);
				}
				await page.screenshot({ path: join(dir, file), fullPage: true });
				index.push({ screen: name, state, theme, viewport: `${vpName} ${vp.width}x${vp.height}`, file, fold: file.replace(".png", "-fold.png") });
			}
			if (external.length || errors.length) problems.push({ theme, vpName, external, errors });
			await ctx.close();
		}
		// State sheets: each state in a 360 px wide, 1200 px tall frame.
		const { ctx, external, errors } = await context(browser, srv.origin, { viewport: { width: 1560, height: 900 }, colorScheme: theme });
		const page = await ctx.newPage();
		for (const [view, states] of Object.entries(SHEETS)) {
			const frames = states
				.map(
					(s) =>
						`<figure><figcaption>${view}.${s}</figcaption><iframe title="${view}.${s}" src="${url(srv.origin, `${view}.${s}`)}" width="360" height="1200"></iframe></figure>`,
				)
				.join("");
			await page.setContent(
				`<!doctype html><meta name="color-scheme" content="light dark"><style>body{margin:0;padding:24px;background:${theme === "dark" ? "#05090c" : "#c9d6dd"};font:700 14px system-ui;color:${theme === "dark" ? "#e8f4fa" : "#071c28"}}main{display:grid;grid-template-columns:repeat(4,360px);gap:24px}figure{margin:0;display:grid;gap:6px}iframe{border:0;border-radius:12px;background:#fff}</style><h1 style="margin:0 0 16px;font-size:18px">${view} states, ${theme}, 360 px frames</h1><main>${frames}</main>`,
			);
			// Off-screen frames are not painted, so the viewport grows to the whole sheet first.
			await page.setViewportSize({ width: 1560, height: await page.evaluate(() => document.documentElement.scrollHeight) });
			await page.waitForTimeout(1200);
			const file = `states/${view}-states-${theme}.png`;
			await page.screenshot({ path: join(dir, file), fullPage: true });
			await page.setViewportSize({ width: 1560, height: 900 });
			index.push({ sheet: view, theme, states, file });
		}
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto(`${srv.origin}/index.html?shot=1&state=tokens.sheet#tokens`);
		await page.waitForTimeout(120);
		await page.screenshot({ path: join(dir, `screens/token-sheet-${theme}-desktop.png`), fullPage: true });
		index.push({ screen: "token-sheet", theme, viewport: "desktop 1440x900", file: `screens/token-sheet-${theme}-desktop.png` });
		if (external.length || errors.length) problems.push({ theme, sheets: true, external, errors });
		await ctx.close();
	}
	await browser.close();
	await srv.close();
	await writeFile(join(dir, "index.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), problems, index }, null, 2)}\n`);
	console.log(JSON.stringify({ files: index.length, problems }));
}
main();
