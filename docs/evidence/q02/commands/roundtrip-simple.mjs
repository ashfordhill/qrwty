// Q02: reopen the saved project in a fresh browser context, switch the browser-local view to
// Simple (localStorage only, never part of the design) and re-export the Simple PNG by mouse.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "/home/ash/github/jeeves/node_modules/@playwright/test/index.mjs";

const [roundDir, shotDir, recordFile] = process.argv.slice(2);
const id = "d1e59607-0616-418d-83d5-4cfe5bcb4b11";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const designRev = async () =>
  (await (await fetch(`http://127.0.0.1:4310/projects/${id}/design`)).json()).design.revision;
for (const d of [roundDir, shotDir]) await mkdir(d, { recursive: true });
const record = { project: id, revisionBefore: await designRev() };
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:4300/?project=${id}`);
  const board = page.locator('.board[data-layout="ready"][data-board="ready"]');
  await board.waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Simple", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".board .react-flow__edge").length === 27, null, { timeout: 15_000 });
  await board.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(600);
  record.simple = {
    nodes: await page.locator(".board .react-flow__node").count(),
    edges: await page.locator(".board .react-flow__edge").count(),
  };
  await page.screenshot({ path: join(shotDir, "04-reopened-simple.png") });
  await page.getByRole("button", { name: "Export diagram", exact: true }).click();
  const pngEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await pngEvent;
  const pngPath = join(roundDir, png.suggestedFilename());
  await png.saveAs(pngPath);
  const capEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download capture details" }).click();
  const cap = await capEvent;
  const capPath = join(roundDir, cap.suggestedFilename());
  await cap.saveAs(capPath);
  await page.getByRole("button", { name: "Close export diagram" }).click();
  const pngBytes = await readFile(pngPath);
  const capBytes = await readFile(capPath);
  record.png = { file: png.suggestedFilename(), bytes: pngBytes.length, sha256: sha(pngBytes) };
  record.capture = { file: cap.suggestedFilename(), bytes: capBytes.length, sha256: sha(capBytes) };
  record.pageErrors = errors;
  record.revisionAfter = await designRev();
  await context.close();
} finally {
  await browser.close();
  await writeFile(recordFile, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record));
}
