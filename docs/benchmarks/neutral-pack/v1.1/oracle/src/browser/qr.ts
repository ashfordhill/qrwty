// QR decoding: jsQR 1.4.0 over pngjs 7.0.0 for PNG; SVG is rasterized in the browser first.

import type { Browser } from "@playwright/test";
import jsQRModule from "jsqr";
import { PNG } from "pngjs";

// jsqr is CommonJS: module.exports is the function and also carries it as `default`.
const jsQR = jsQRModule.default;

/** Decodes a PNG buffer; returns the QR payload or null. */
export function decodePng(png: Buffer): string | null {
	const image = PNG.sync.read(png);
	const result = jsQR(
		new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.length),
		image.width,
		image.height,
	);
	return result?.data ?? null;
}

/**
 * Rasterizes an SVG in Chromium on an opaque white canvas, then decodes it as a PNG.
 * `sizePx` is the rendered edge length; small sizes test practical scan sizes.
 */
export async function decodeSvg(
	browser: Browser,
	svg: string,
	sizePx = 600,
): Promise<{ data: string | null; png: Buffer }> {
	const page = await browser.newPage();
	try {
		const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
		await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');
		const pngDataUrl = await page.evaluate(
			async ({ src, size }) => {
				const img = new Image();
				img.src = src;
				await img.decode();
				const canvas = document.createElement("canvas");
				canvas.width = size;
				canvas.height = size;
				const g = canvas.getContext("2d");
				if (!g) throw new Error("no 2d context");
				g.fillStyle = "#ffffff";
				g.fillRect(0, 0, size, size);
				g.drawImage(img, 0, 0, size, size);
				return canvas.toDataURL("image/png");
			},
			{ src: dataUrl, size: sizePx },
		);
		const png = Buffer.from(pngDataUrl.split(",")[1], "base64");
		return { data: decodePng(png), png };
	} finally {
		await page.close();
	}
}
