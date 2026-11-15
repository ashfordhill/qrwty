import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { byName } from "../browser/driver.ts";
import { decodePng, decodeSvg } from "../browser/qr.ts";
import { defineRow } from "./lib/row.ts";
import { matrix, openCombo, uiReady } from "./lib/ui.ts";

const KEYS = [
	"create.destination",
	"create.submit",
	"result.shortUrl",
	"result.downloadPng",
	"result.downloadSvg",
];

interface Scan {
	device?: string;
	medium?: "screen" | "print";
	format?: "png" | "svg";
	sizeMm?: number;
	result?: "decoded" | "failed";
	at?: string;
}

export default defineRow({
	id: "U06",
	title: "QR validation: automated decode plus recorded real-phone scans",
	scope: "One skin × light/dark × desktop/mobile; human scans recorded",
	expected: "Automated decode plus real-phone scan of screen and printed PNG/SVG at recorded sizes",
	requires: ["publicEntry", "browser"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's UI, the frozen accessible-name list and recorded human scans",
	async run(ctx) {
		const names = uiReady(ctx, KEYS);
		if (!names) return;
		const driver = await ctx.browser();
		for (const combo of matrix(ctx)) {
			const { page } = await openCombo(ctx, combo);
			const field = byName(page, names, "create.destination").first();
			await field.click();
			await field.fill(`https://example.com/oracle/u06/${randomUUID()}`);
			await byName(page, names, "create.submit").first().click();
			const short = byName(page, names, "result.shortUrl").first();
			await short.waitFor({ timeout: 15_000 });
			const shortUrl = (
				(await short.inputValue().catch(() => null)) ??
				(await short.textContent()) ??
				""
			).trim();
			const pngWait = page.waitForEvent("download");
			await byName(page, names, "result.downloadPng").first().click();
			const png = await readFile(await (await pngWait).path());
			ctx.check(
				`${combo.label}: PNG decodes`,
				decodePng(png) === shortUrl,
				shortUrl,
				decodePng(png),
			);
			const svgWait = page.waitForEvent("download");
			await byName(page, names, "result.downloadSvg").first().click();
			const svg = (await readFile(await (await svgWait).path())).toString("utf8");
			for (const size of [150, 300, 600]) {
				const decoded = await decodeSvg(driver.browser, svg, size);
				ctx.check(
					`${combo.label}: SVG decodes at ${size} px`,
					decoded.data === shortUrl,
					shortUrl,
					decoded.data,
				);
			}
		}
		const path = ctx.adapter.ui?.humanScans;
		if (!path) {
			ctx.notRun(
				"real-phone scans",
				"human step: no humanScans record yet (device, medium, format, size, result)",
			);
			return;
		}
		const scans =
			(
				JSON.parse(readFileSync(resolve(ctx.run.loaded.baseDir, path), "utf8")) as {
					scans?: Scan[];
				}
			).scans ?? [];
		for (const medium of ["screen", "print"] as const) {
			for (const format of ["png", "svg"] as const) {
				const found = scans.filter(
					(s) =>
						s.medium === medium && s.format === format && s.device && typeof s.sizeMm === "number",
				);
				ctx.check(
					`human scan: ${medium} ${format}`,
					found.length > 0 && found.every((s) => s.result === "decoded"),
					"a recorded real-phone scan with device and size that decoded",
					found,
				);
			}
		}
	},
});
