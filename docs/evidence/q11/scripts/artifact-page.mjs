// Derives the published artifact page from docs/design/prototype/index.html: the same head links
// and body without the document wrapper (the host adds its own), plus one Google Fonts stylesheet
// so the hosted view shows Nunito. tokens.css, app.css, qr.js and app.js are published unchanged
// beside it. Usage: node docs/evidence/q11/scripts/artifact-page.mjs <out.html>
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PROTO } from "./lib.mjs";

const html = await readFile(join(PROTO, "index.html"), "utf8");
const head = html.slice(html.indexOf("<head>") + 6, html.indexOf("</head>"));
const body = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"));
const keep = head
	.split("\n")
	.map((l) => l.trim())
	.filter((l) => /^<title>|claude:viewport-fit-sides|rel="stylesheet"/.test(l));
const fonts =
	'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" />';
const out = [keep[0], keep[1], fonts, ...keep.slice(2), body.trim()].join("\n");
await writeFile(process.argv[2], `${out}\n`);
console.log(`wrote ${process.argv[2]} (${out.length} bytes)`);
