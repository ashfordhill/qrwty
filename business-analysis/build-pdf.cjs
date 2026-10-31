// Rebuilds a PDF from a markdown file. Run from this folder:
//   node build-pdf.cjs [input.md] [output.pdf]     (defaults: README.md -> report.pdf)
// Needs: `npx marked@15.0.12` (fetched on demand) and Playwright's Chromium
// (set PLAYWRIGHT_PKG to the playwright package directory if it is not the default below).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = __dirname + "/";
const pw = process.env.PLAYWRIGHT_PKG ||
  "/home/ash/github/jeeves/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright";
const { chromium } = require(pw);
const inFile = path.resolve(process.argv[2] || root + "README.md");
const outFile = path.resolve(process.argv[3] || root + "report.pdf");
const md = fs.readFileSync(inFile, "utf8");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qrwty-pdf-"));
fs.writeFileSync(tmp + "/in.md", md);
const slug = (t) => t.replace(/<[^>]+>/g, "").toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
// marked writes to a file (-o): piping its stdout silently drops the tail of outputs over ~150 KB.
execFileSync("npx", ["-y", "marked@15.0.12", "--gfm", "-i", tmp + "/in.md", "-o", tmp + "/out.html"], { stdio: "inherit" });
const body = fs.readFileSync(tmp + "/out.html", "utf8")
  .replace(/<h([1-4])>([\s\S]*?)<\/h\1>/g, (m, n, t) => `<h${n} id="${slug(t)}">${t}</h${n}>`)
  .replace(/<details>/g, "<details open>")
  .replace(/src="charts\//g, 'src="file://' + root + "charts/");
const css = `@page{size:A4;margin:18mm}
body{font:10.5pt/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111}
h1{font-size:21pt;line-height:1.2}h2{font-size:15pt;margin-top:1.6em;border-bottom:1px solid #ccc;padding-bottom:.2em;break-after:avoid}h3{font-size:12pt;break-after:avoid}
a{color:#1a57a8;text-decoration:none;word-break:break-word}
img{max-width:100%;display:block;margin:1em 0 .4em;page-break-inside:avoid;border:1px solid #ddd;border-radius:4px}
table{border-collapse:collapse;width:100%;font-size:8pt;page-break-inside:avoid;margin:.6em 0;table-layout:auto}th,td{overflow-wrap:break-word}td a{overflow-wrap:anywhere}
th,td{border:1px solid #999;padding:3px 5px;vertical-align:top;text-align:left}th{background:#eee}
details{margin:.3em 0 1em}summary{font-weight:600;font-size:9pt;color:#555}
hr{border:0;border-top:1px solid #ccc;margin:1.2em 0}
code{font-size:9.5pt}`;
(async () => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${(md.match(/^# (.+)$/m) || [, "qrwty report"])[1].replace(/[<&]/g, "")}</title><style>${css}</style></head><body>${body}</body></html>`;
  fs.writeFileSync(tmp + "/report.html", html);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto("file://" + tmp + "/report.html");
  await p.waitForLoadState("load");
  const bad = await p.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
  if (bad.length) console.log("broken images:", bad);
  await p.pdf({
    path: outFile, format: "A4", printBackground: true, displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
  });
  if (process.env.SHOT) { await p.setViewportSize({width: 900, height: 1200}); await p.screenshot({ path: process.env.SHOT, fullPage: false }); }
  await b.close();
  console.log("wrote " + outFile + "; html at", tmp + "/report.html");
})();
