// Q11 mouse-only walkthrough of the prototype, driven by the frozen accessible names:
// create -> result -> copy -> download QR -> save (sign-in) -> library -> edit/disable ->
// analytics -> export -> upgrade, in light and dark at desktop and mobile. Text goes in with
// fill(); every control is operated by click(); no keyboard events are sent.
// Also writes the QR export sample (docs/design/qr-export/) and decodes it at practical sizes.
// Usage (repo root): node docs/evidence/q11/scripts/walkthrough.mjs
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, context, decodePngBuffer, decodeSvg, OUT, REPO, serve, VIEWPORTS } from "./lib.mjs";

const DEST = "https://harbourline-bakery.example/orders/holiday-2026/preorder?pickup=saturday&branch=north-end&utm_source=counter-card";

async function main() {
	const names = JSON.parse(await readFile(join(REPO, "docs/design/accessible-names.json"), "utf8")).names;
	const srv = await serve();
	const browser = await chromium.launch();
	const shotsDir = join(OUT, "screenshots/walkthrough");
	await mkdir(shotsDir, { recursive: true });
	const runs = [];
	for (const theme of ["light", "dark"]) {
		for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
			const { ctx, external, errors } = await context(browser, srv.origin, { viewport: vp, colorScheme: theme });
			const page = await ctx.newPage();
			let keyboardUsed = false;
			const origPress = page.keyboard.press.bind(page.keyboard);
			page.keyboard.press = (...a) => {
				keyboardUsed = true;
				return origPress(...a);
			};
			const by = (key) => page.getByRole(names[key].role, { name: names[key].name, exact: true }).first();
			const steps = [];
			let n = 0;
			const step = async (label, fn) => {
				const t0 = Date.now();
				try {
					const detail = await fn();
					steps.push({ step: label, ok: true, ms: Date.now() - t0, ...(detail ? { detail } : {}) });
				} catch (e) {
					steps.push({ step: label, ok: false, error: String(e.message).split("\n")[0] });
				}
				if (theme === "light" && vpName === "desktop") await page.screenshot({ path: join(shotsDir, `${String(++n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`) });
			};
			let shortUrl = "";
			await page.goto(`${srv.origin}/index.html?shot=1#create`);
			await step("create: paste link and click Shorten", async () => {
				await by("create.destination").click();
				await by("create.destination").fill(DEST);
				await by("create.submit").click();
				await by("result.shortUrl").waitFor({ timeout: 5000 });
				shortUrl = (await by("result.shortUrl").textContent()).trim();
				if (!/^https:\/\/qrwty\.io\/[0-9A-Za-z]{10}$/.test(shortUrl)) throw new Error(`short URL ${shortUrl}`);
				return { shortUrl };
			});
			await step("result: copy short link", async () => {
				await by("result.copy").click();
				const copied = await page.evaluate(() => navigator.clipboard.readText());
				if (copied !== shortUrl) throw new Error(`clipboard ${copied}`);
				return { clipboard: copied };
			});
			await step("result: download QR as PNG and SVG", async () => {
				const wp = page.waitForEvent("download");
				await by("result.downloadPng").click();
				const png = await readFile(await (await wp).path());
				const ws = page.waitForEvent("download");
				await by("result.downloadSvg").click();
				const svg = (await readFile(await (await ws).path())).toString("utf8");
				const pngData = decodePngBuffer(png);
				const svgData = {};
				for (const size of [150, 300, 600]) svgData[size] = await decodeSvg(browser, svg, size);
				if (pngData !== shortUrl || Object.values(svgData).some((d) => d !== shortUrl)) throw new Error(`decode png=${pngData} svg=${JSON.stringify(svgData)}`);
				return { pngBytes: png.length, pngDecodes: true, svgDecodesAt: Object.keys(svgData).map(Number) };
			});
			await step("result: save to my links (sign-in stand-in)", async () => {
				await by("result.save").click();
				await page.getByRole("button", { name: "Continue as Alex Rivera", exact: true }).click();
				await by("result.saved").waitFor({ timeout: 3000 });
			});
			await step("library: open My links and the newest link", async () => {
				await by("nav.library").click();
				await by("library.firstItem").click();
				const h1 = (await page.locator("h1").first().textContent()).trim();
				if (h1 !== "harbourline-bakery.example") throw new Error(`opened ${h1}`);
				return { opened: h1 };
			});
			await step("link: change destination and save", async () => {
				await by("link.edit").click();
				await by("edit.destination").click();
				await by("edit.destination").fill(`${DEST.split("?")[0]}?pickup=sunday`);
				await by("edit.save").click();
				await by("link.saved").waitFor({ timeout: 3000 });
			});
			await step("link: disable with confirmation", async () => {
				await by("link.disable").click();
				await by("link.confirmDisable").click();
				await by("link.disabled").waitFor({ timeout: 3000 });
				await by("link.enable").click();
			});
			await step("analytics: open click analytics and export CSV", async () => {
				await by("link.analytics").click();
				await page.getByRole("heading", { name: "Click analytics", exact: true }).waitFor();
				const wc = page.waitForEvent("download");
				await by("analytics.export").click();
				const csv = (await readFile(await (await wc).path())).toString("utf8");
				if (!csv.startsWith("date,recorded_attempts,filtered_clicks\n")) throw new Error("csv header");
				return { csvRows: csv.trim().split("\n").length - 1 };
			});
			await step("billing: upgrade, pay on the stand-in, confirm", async () => {
				await by("nav.pricing").click();
				await by("billing.upgrade").click();
				await page.getByRole("button", { name: "Pay (test fixture)", exact: true }).click();
				await by("billing.confirming").waitFor({ timeout: 3000 });
				await by("billing.portal").waitFor({ timeout: 6000 });
				await by("billing.active").waitFor({ timeout: 1000 });
			});
			const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
			runs.push({ theme, viewport: vpName, passed: steps.every((s) => s.ok), keyboardUsed, overflowAtEnd: overflow, external, errors, steps });
			await ctx.close();
		}
	}

	// QR export sample: the deterministic example result, saved through the prototype's own buttons.
	const sampleDir = join(REPO, "docs/design/qr-export");
	await mkdir(sampleDir, { recursive: true });
	const { ctx } = await context(browser, srv.origin, { viewport: VIEWPORTS.desktop });
	const page = await ctx.newPage();
	await page.goto(`${srv.origin}/index.html?shot=1&state=result.ready#result`);
	const short = (await page.getByRole("textbox", { name: "Short link", exact: true }).textContent()).trim();
	const files = {};
	for (const [kind, label] of [["png", "Download PNG"], ["svg", "Download SVG"]]) {
		const w = page.waitForEvent("download");
		await page.getByRole("button", { name: label, exact: true }).click();
		const d = await w;
		const to = join(sampleDir, d.suggestedFilename());
		await copyFile(await d.path(), to);
		files[kind] = { file: `docs/design/qr-export/${d.suggestedFilename()}` };
	}
	const png = await readFile(join(REPO, files.png.file));
	const svg = (await readFile(join(REPO, files.svg.file))).toString("utf8");
	const qp = await browser.newPage();
	await qp.setContent("<!doctype html><body></body>");
	const meta = await qp.evaluate(async (b64) => {
		const img = new Image();
		img.src = `data:image/png;base64,${b64}`;
		await img.decode();
		const c = document.createElement("canvas");
		c.width = img.width;
		c.height = img.height;
		const g = c.getContext("2d");
		g.drawImage(img, 0, 0);
		const d = g.getImageData(0, 0, c.width, c.height).data;
		let opaque = true;
		const colours = new Set();
		for (let i = 0; i < d.length; i += 4) {
			if (d[i + 3] !== 255) opaque = false;
			colours.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
		}
		// Quiet zone: count white rows from the top edge.
		let quiet = 0;
		for (let y = 0; y < c.height; y++) {
			let white = true;
			for (let x = 0; x < c.width; x++) {
				const i = (y * c.width + x) * 4;
				if (d[i] !== 255) {
					white = false;
					break;
				}
			}
			if (!white) break;
			quiet++;
		}
		const scaled = {};
		for (const size of [600, 354, 236, 150, 120]) {
			const s = document.createElement("canvas");
			s.width = size;
			s.height = size;
			const sg = s.getContext("2d");
			sg.imageSmoothingEnabled = true;
			sg.drawImage(img, 0, 0, size, size);
			scaled[size] = s.toDataURL("image/png").split(",")[1];
		}
		return { width: img.width, height: img.height, opaque, colours: [...colours], quietPx: quiet, scaled };
	}, png.toString("base64"));
	await qp.close();
	const pngDecode = { native: decodePngBuffer(png) === short };
	for (const [size, b64] of Object.entries(meta.scaled)) pngDecode[size] = decodePngBuffer(Buffer.from(b64, "base64")) === short;
	const svgDecode = {};
	for (const size of [1200, 600, 300, 150, 120]) svgDecode[size] = (await decodeSvg(browser, svg, size)) === short;
	const modules = Number(/viewBox="0 0 (\d+) /.exec(svg)[1]);
	const sample = {
		shortUrl: short,
		files,
		png: { px: meta.width, opaque: meta.opaque, colours: meta.colours, modulesWithQuietZone: modules, pxPerModule: meta.width / modules, quietZonePx: meta.quietPx, quietZoneModules: meta.quietPx / (meta.width / modules), printWidthCmAt300dpi: Math.round((meta.width / 300) * 2.54 * 10) / 10 },
		svg: { bytes: svg.length, viewBoxModules: modules, opaqueGround: /<rect width="\d+" height="\d+" fill="#ffffff"\/>/.test(svg), crispEdges: svg.includes('shape-rendering="crispEdges"') },
		decodes: { decoder: "jsqr 1.4.0 (the oracle's)", pngNativeAndDownscaledPx: pngDecode, svgRasterizedPx: svgDecode },
		printSizes: "236 px = 2.0 cm and 354 px = 3.0 cm at 300 dpi; 120-150 px is a small on-screen code",
		humanScans: "not run: real-phone scans of the screen and of printed PNG/SVG are U06 human steps (Q12)",
	};
	await ctx.close();
	await browser.close();
	await srv.close();
	await writeFile(join(OUT, "results/walkthrough.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), runs }, null, 2)}\n`);
	await writeFile(join(OUT, "results/qr-export.json"), `${JSON.stringify(sample, null, 2)}\n`);
	console.log(JSON.stringify({ runs: runs.map((r) => ({ run: `${r.theme}/${r.viewport}`, passed: r.passed, keyboardUsed: r.keyboardUsed, overflow: r.overflowAtEnd, failed: r.steps.filter((s) => !s.ok), external: r.external.length, errors: r.errors })), sample: { ...sample, files: undefined } }, null, 1));
}
main();
