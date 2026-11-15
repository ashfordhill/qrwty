// Decodes the prototype's QR encoder output with the oracle's jsQR 1.4.0 + pngjs 7.0.0.
// Usage (repo root): node docs/evidence/q11/scripts/qr-encoder-check.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInThisContext } from "node:vm";

const oracle = "docs/benchmarks/neutral-pack/v1.4/oracle/";
const require = createRequire(new URL(`../../../../${oracle}package.json`, import.meta.url));
const jsQR = require("jsqr").default ?? require("jsqr");
const { PNG } = require("pngjs");
runInThisContext(readFileSync(new URL("../../../design/prototype/qr.js", import.meta.url), "utf8"));
const { encode, QUIET } = globalThis.QrwtyQr;

function render(qr, scale) {
	const dim = (qr.size + QUIET * 2) * scale;
	const png = new PNG({ width: dim, height: dim });
	for (let y = 0; y < dim; y++)
		for (let x = 0; x < dim; x++) {
			const mx = Math.floor(x / scale) - QUIET;
			const my = Math.floor(y / scale) - QUIET;
			const dark = mx >= 0 && my >= 0 && mx < qr.size && my < qr.size && qr.modules[my][mx];
			const i = (y * dim + x) * 4;
			png.data[i] = dark ? 7 : 255;
			png.data[i + 1] = dark ? 28 : 255;
			png.data[i + 2] = dark ? 40 : 255;
			png.data[i + 3] = 255;
		}
	return png;
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const samples = ["https://qrwty.io/7Hq2xP9kLm", "a", "https://café-lumière.example/menu"];
for (let n = 0; n < 200; n++) {
	let s = "https://qrwty.io/";
	for (let i = 0; i < 10; i++) s += alphabet[Math.floor(rnd() * 62)];
	samples.push(s);
}
for (let len = 1; len <= 600; len += 37) samples.push("x".repeat(len) + "/é" + len);
let ok = 0;
const fails = [];
const versions = new Set();
for (const s of samples) {
	const qr = encode(s);
	versions.add(qr.version);
	const png = render(qr, 4);
	const got = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
	if (got?.data === s) ok++;
	else fails.push({ s: s.slice(0, 40), version: qr.version, got: got?.data?.slice(0, 40) ?? null });
}
console.log(JSON.stringify({ decoder: "jsqr 1.4.0", samples: samples.length, decoded: ok, versions: [...versions].sort((a, b) => a - b), fails: fails.slice(0, 5) }));
process.exit(fails.length ? 1 : 0);
