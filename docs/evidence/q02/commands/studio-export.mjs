// Q02: export the saved QRWTY project through the studio by mouse, then reopen it and
// re-export the saved design. Read-only: clicks only Generate project, Preview scaffold,
// Download project ZIP, Export diagram, Source & diagnostics, Download source JSON, PNG,
// Download capture details and the dialogs' Close buttons.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "/home/ash/github/jeeves/node_modules/@playwright/test/index.mjs";

const [outDir, roundDir, shotDir, recordFile] = process.argv.slice(2);
const id = "d1e59607-0616-418d-83d5-4cfe5bcb4b11";
const web = "http://127.0.0.1:4300";
const api = "http://127.0.0.1:4310";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const record = { project: id, steps: [] };
const step = (name, data = {}) => {
  record.steps.push({ at: new Date().toISOString(), step: name, ...data });
  console.log(name, JSON.stringify(data));
};
const getJson = async (path) => (await fetch(`${api}${path}`)).json();
const designRev = async () => (await getJson(`/projects/${id}/design`)).design.revision;
for (const d of [outDir, roundDir, shotDir]) await mkdir(d, { recursive: true });

const ready = (page) =>
  page
    .locator('.board[data-layout="ready"][data-board="ready"]')
    .waitFor({ state: "visible", timeout: 30_000 });
const saveDownload = async (download, dir) => {
  const path = join(dir, download.suggestedFilename());
  await download.saveAs(path);
  const bytes = await readFile(path);
  return { file: download.suggestedFilename(), bytes: bytes.length, sha256: sha(bytes) };
};

const browser = await chromium.launch({ headless: true });
record.browser = browser.version();
try {
  record.projectsBefore = await getJson("/projects");
  record.revisionBefore = await designRev();

  // 1. Studio export by mouse.
  let context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  let page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${web}/?project=${id}`);
  await ready(page);
  step("opened", { title: await page.title() });
  await page.getByRole("button", { name: "Generate project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  const runnable = dialog.getByRole("checkbox", { name: "Runnable processes" });
  step("generate dialog", { runnableProcessesChecked: await runnable.isChecked() });
  const previewResponse = page.waitForResponse((r) => r.url().endsWith("/experimental-generation/preview"));
  await page.getByRole("button", { name: "Preview scaffold", exact: true }).click();
  const previewRes = await previewResponse;
  const previewBody = await previewRes.body();
  await writeFile(join(outDir, "generation-preview.json"), previewBody);
  const preview = JSON.parse(previewBody.toString("utf8"));
  const status = page.getByText(/^Ready: \d+ files/);
  await status.waitFor({ state: "visible" });
  step("preview", {
    http: previewRes.status(),
    bodySha256: sha(previewBody),
    status: preview.status,
    archive: preview.archive,
    readyText: await status.textContent(),
  });
  await page.screenshot({ path: join(shotDir, "01-generate-preview.png") });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project ZIP", exact: true }).click();
  const zip = await saveDownload(await downloadEvent, outDir);
  await page.getByText(/Project ZIP downloaded/).waitFor({ state: "visible" });
  step("download", { ...zip, matchesPreview: zip.sha256 === preview.archive.sha256 });
  await page.screenshot({ path: join(shotDir, "02-generate-downloaded.png") });
  await page.getByRole("button", { name: "Close generate experimental project" }).click();
  record.revisionAfterExport = await designRev();
  record.pageErrorsExport = errors.splice(0);
  await context.close();

  // 2. Round trip: a fresh browser context reopens the project and re-exports the saved design.
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${web}/?project=${id}`);
  await ready(page);
  const nodes = await page.locator(".board .react-flow__node").count();
  const edges = await page.locator(".board .react-flow__edge").count();
  const projectMenu = await page.getByRole("button", { name: /^Project:/ }).first().textContent().catch(() => null);
  step("reopened", { nodes, edges, projectMenu });
  await page.screenshot({ path: join(shotDir, "03-reopened-simple.png") });
  await page.getByRole("button", { name: "Export diagram", exact: true }).click();
  await page.getByRole("button", { name: "Source & diagnostics", exact: true }).click();
  const srcEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download source JSON", exact: true }).click();
  const source = await saveDownload(await srcEvent, roundDir);
  step("source json", source);
  await page.getByRole("button", { name: /^Close source/i }).click().catch(async () => {
    await page.keyboard.press("Escape");
  });
  // PNG of the Simple view.
  const exportOpen = await page.getByRole("button", { name: "PNG", exact: true }).isVisible().catch(() => false);
  if (!exportOpen) await page.getByRole("button", { name: "Export diagram", exact: true }).click();
  const pngEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await saveDownload(await pngEvent, roundDir);
  const capEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download capture details" }).click();
  const cap = await saveDownload(await capEvent, roundDir);
  step("simple png", { png, capture: cap });
  await page.getByRole("button", { name: "Close export diagram" }).click();
  record.revisionAfterRoundTrip = await designRev();
  record.pageErrorsRoundTrip = errors.splice(0);
  await context.close();
  record.projectsAfter = await getJson("/projects");
} finally {
  await browser.close();
  await writeFile(recordFile, `${JSON.stringify(record, null, 2)}\n`);
}
