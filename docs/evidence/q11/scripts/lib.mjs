// Shared helpers for the Q11 checks: a static server for docs/design/prototype on 127.0.0.1 and
// Chromium from the neutral oracle's Playwright 1.63.0 install (nothing installed globally).
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
export const PROTO = join(REPO, "docs/design/prototype");
export const OUT = join(REPO, "docs/evidence/q11");
const oracleRequire = createRequire(join(REPO, "docs/benchmarks/neutral-pack/v1.4/oracle/package.json"));
export const { chromium } = oracleRequire("@playwright/test");
const jsqr = oracleRequire("jsqr");
export const jsQR = jsqr.default ?? jsqr;
export const { PNG } = oracleRequire("pngjs");

export const VIEWPORTS = {
	desktop: { width: 1440, height: 900 },
	mobile: { width: 360, height: 800, isMobile: true, hasTouch: true },
};

/** Every state of every flow in the prototype (view.state), as the state sheets show them. */
export const SHEETS = {
	create: ["blank", "pasted", "invalid", "submitting", "double", "offline", "rate", "reputation", "provider", "error"],
	result: ["ready", "copied", "copyFailed", "opened", "downloaded", "claimExpired", "alreadyClaimed", "saved"],
	signin: ["start", "success", "failure", "cancelled", "expired", "restored"],
	links: ["populated", "empty", "loading", "more", "stale", "network", "unauthorized", "signedOut"],
	link: ["view", "editing", "validation", "conflict", "saved", "confirmDisable", "disabled", "blocked", "confirmDelete"],
	clicks: ["available", "none", "delayed", "incident", "lookback", "bounds", "exportFailed", "exported", "paid"],
	plans: ["free", "limit", "checkout", "checkoutCancelled", "confirming", "active", "grace", "portalDown", "cancelScheduled", "downgraded", "deletion", "signedOut"],
	error: ["unknown", "deleted", "disabled", "blocked", "outage"],
};

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

/** Serves the prototype directory; returns { origin, requests, close }. */
export async function serve() {
	const requests = [];
	const server = createServer(async (req, res) => {
		const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^\/+/, "");
		requests.push(path);
		try {
			const body = await readFile(join(PROTO, path || "index.html"));
			res.writeHead(200, { "content-type": TYPES[extname(path || ".html")] ?? "application/octet-stream" });
			res.end(body);
		} catch {
			res.writeHead(404);
			res.end("not found");
		}
	});
	await new Promise((r) => server.listen(0, "127.0.0.1", r));
	const origin = `http://127.0.0.1:${server.address().port}`;
	return { origin, requests, close: () => new Promise((r) => server.close(r)) };
}

/** A context that records any request leaving the local origin and every console error. */
export async function context(browser, origin, { viewport = VIEWPORTS.desktop, colorScheme = "light", reducedMotion = "no-preference" } = {}) {
	const ctx = await browser.newContext({
		viewport: { width: viewport.width, height: viewport.height },
		isMobile: viewport.isMobile ?? false,
		hasTouch: viewport.hasTouch ?? false,
		colorScheme,
		reducedMotion,
		acceptDownloads: true,
	});
	await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
	const external = [];
	const errors = [];
	await ctx.route(
		(url) => !url.href.startsWith(origin) && !url.href.startsWith("data:") && !url.href.startsWith("blob:"),
		(route) => {
			external.push(route.request().url());
			return route.abort();
		},
	);
	ctx.on("page", (p) => {
		p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
		p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
	});
	return { ctx, external, errors };
}

/** WCAG 2.x relative luminance contrast of two #rrggbb or rgb() colours. */
export function contrast(a, b) {
	const rgb = (c) => {
		const m = c.match(/^#([0-9a-f]{6})$/i);
		if (m) return [0, 2, 4].map((i) => Number.parseInt(m[1].slice(i, i + 2), 16));
		const n = c.match(/rgba?\(([^)]+)\)/);
		return n[1].split(/[ ,/]+/).slice(0, 3).map(Number);
	};
	const lum = (c) => {
		const [r, g, bl] = rgb(c).map((v) => {
			const s = v / 255;
			return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
	};
	const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
}

export function decodePngBuffer(buf) {
	const img = PNG.sync.read(buf);
	return jsQR(new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length), img.width, img.height)?.data ?? null;
}

/** Rasterizes an SVG in Chromium at `size` px on white, then decodes it (as the oracle's U06 does). */
export async function decodeSvg(browser, svg, size) {
	const page = await browser.newPage();
	try {
		await page.setContent("<!doctype html><body style='margin:0'></body>");
		const b64 = Buffer.from(svg, "utf8").toString("base64");
		const dataUrl = await page.evaluate(
			async ({ src, size }) => {
				const img = new Image();
				img.src = src;
				await img.decode();
				const c = document.createElement("canvas");
				c.width = size;
				c.height = size;
				const g = c.getContext("2d");
				g.fillStyle = "#fff";
				g.fillRect(0, 0, size, size);
				g.drawImage(img, 0, 0, size, size);
				return c.toDataURL("image/png");
			},
			{ src: `data:image/svg+xml;base64,${b64}`, size },
		);
		return decodePngBuffer(Buffer.from(dataUrl.split(",")[1], "base64"));
	} finally {
		await page.close();
	}
}
