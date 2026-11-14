import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { byName } from "../browser/driver.ts";
import { decodePng, decodeSvg } from "../browser/qr.ts";
import { missingNames } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

const KEYS = [
	"create.destination",
	"create.submit",
	"result.shortUrl",
	"result.copy",
	"result.open",
	"result.downloadPng",
	"result.downloadSvg",
];

export default defineRow({
	id: "A01",
	title: "Logged-out browser creates, copies, opens and downloads QR",
	scope: "Local; staging subset",
	expected:
		"No sign-in step; the copied text is shortUrl; the opened navigation targets the exact destination; both downloads decode (jsQR on the PNG, the SVG rasterized then decoded) to shortUrl",
	requires: ["publicEntry", "browser"],
	coverage: "double",
	async run(ctx) {
		const missing = missingNames(ctx, KEYS);
		if (missing.length > 0) {
			ctx.blocked(
				"frozen UI names",
				`accessible-name list not frozen for: ${missing.join(", ")} (pending the Q11 pack amendment)`,
			);
			return;
		}
		const names = ctx.uiNames ?? {};
		const driver = await ctx.browser();
		const { context, opened } = await driver.context(ctx.origin);
		ctx.onCleanup(() => context.close());
		const page = await context.newPage();
		const authRequests: string[] = [];
		page.on("request", (r) => {
			const u = new URL(r.url());
			if (
				u.pathname.startsWith("/auth/") ||
				(ctx.adapter.identity && r.url().startsWith(ctx.adapter.identity.issuerUrl))
			) {
				authRequests.push(u.pathname);
			}
		});
		const destination = `https://example.com/oracle/a01/${randomUUID()}?q=1&B=2`;
		await page.goto(`${ctx.origin}/`);
		ctx.check(
			"logged-out create page",
			new URL(page.url()).origin === new URL(ctx.origin).origin && !page.url().includes("/auth/"),
			"the create screen loads without a sign-in redirect",
			page.url(),
		);
		await byName(page, names, "create.destination").fill(destination);
		await byName(page, names, "create.submit").click();
		const shortField = byName(page, names, "result.shortUrl");
		await shortField.waitFor({ timeout: 15_000 });
		const shortUrl = (
			(await shortField.inputValue().catch(() => null)) ??
			(await shortField.textContent()) ??
			""
		).trim();
		const shortOk = new RegExp(
			`^${ctx.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[0-9A-Za-z]{10}$`,
		).test(shortUrl);
		ctx.check("short URL shown", shortOk, "<origin>/<10 base62 characters>", shortUrl);
		ctx.check(
			"no sign-in step",
			authRequests.length === 0,
			"no /auth/* or issuer request during create",
			authRequests,
		);

		await byName(page, names, "result.copy").click();
		const copied = await page
			.evaluate(() => navigator.clipboard.readText())
			.catch((e: Error) => `clipboard error: ${e.message}`);
		ctx.check("copied text", copied === shortUrl, `clipboard equals ${shortUrl}`, copied);

		const pngDownload = page.waitForEvent("download", { timeout: 15_000 });
		await byName(page, names, "result.downloadPng").click();
		const png = await readFile(await (await pngDownload).path());
		await ctx.artifact("qr.png", png);
		const pngData = decodePng(png);
		ctx.check("PNG decodes to shortUrl", pngData === shortUrl, shortUrl, pngData);

		const svgDownload = page.waitForEvent("download", { timeout: 15_000 });
		await byName(page, names, "result.downloadSvg").click();
		const svg = (await readFile(await (await svgDownload).path())).toString("utf8");
		await ctx.artifact("qr.svg", svg);
		const svgDecoded = await decodeSvg(driver.browser, svg);
		ctx.check("SVG decodes to shortUrl", svgDecoded.data === shortUrl, shortUrl, svgDecoded.data);

		await byName(page, names, "result.open").click();
		const deadline = Date.now() + 15_000;
		while (Date.now() < deadline && !opened.some((o) => o.url === destination))
			await ctx.sleep(200);
		ctx.check(
			"open targets the exact destination",
			opened.some((o) => o.url === destination),
			destination,
			opened.map((o) => o.url),
		);
	},
});
