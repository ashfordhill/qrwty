// Q05: by mouse in the owner's studio, at the saved revision, in three fresh browser contexts:
//   1. reopen the project (Detailed, the default view), select Click events and read its Provider
//      (read only, no edit), then Export diagram -> Source & diagnostics -> Download source JSON,
//      and Export diagram -> PNG + Download capture details (the Detailed PNG);
//   2. View -> Simple, Export diagram -> PNG + Download capture details (the Simple PNG);
//   3. Generate project -> Preview scaffold -> Download project ZIP (the studio export).
// It clicks nothing that edits the design. Playwright comes from the frozen Jeeves copy's install.
//
//   node studio-mouse.mjs <frozen jeeves dir> <out dir> <screenshot dir> <record.json>
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [jeeves, outDir, shotDir, recordFile] = process.argv.slice(2);
const { chromium } = await import(join(jeeves, "node_modules/@playwright/test/index.mjs"));
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
for (const d of [outDir, shotDir]) await mkdir(d, { recursive: true });

const ready = (page) =>
  page.locator('.board[data-layout="ready"][data-board="ready"]').waitFor({ state: "visible", timeout: 30_000 });
const saveDownload = async (download, dir) => {
  const path = join(dir, download.suggestedFilename());
  await download.saveAs(path);
  const bytes = await readFile(path);
  return { file: download.suggestedFilename(), bytes: bytes.length, sha256: sha(bytes) };
};
const fresh = async (browser, errors) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${web}/?project=${id}`);
  await ready(page);
  return { context, page };
};
const exportPng = async (page, dir) => {
  await page.getByRole("button", { name: "Export diagram", exact: true }).click();
  const pngEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await saveDownload(await pngEvent, dir);
  const capEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download capture details" }).click();
  const capture = await saveDownload(await capEvent, dir);
  await page.getByRole("button", { name: "Close export diagram" }).click();
  return { png, capture };
};

const browser = await chromium.launch({ headless: true });
record.browser = browser.version();
const errors = [];
try {
  record.projectsBefore = await getJson("/projects");
  record.revisionBefore = await designRev();

  // 1. Detailed: reopen, read Click events' Provider, source JSON, Detailed PNG.
  let { context, page } = await fresh(browser, errors);
  step("opened detailed", {
    nodes: await page.locator(".board .react-flow__node").count(),
    edges: await page.locator(".board .react-flow__edge").count(),
    projectMenu: await page.getByRole("button", { name: /^Project:/ }).first().textContent().catch(() => null),
  });
  await page.screenshot({ path: join(shotDir, "01-reopened-detailed.png") });
  await page.locator(".board .react-flow__node").filter({ hasText: "Click events" }).first().click();
  const provider = page.getByLabel("Provider", { exact: true });
  await provider.waitFor({ state: "visible", timeout: 10_000 });
  step("click events provider", {
    value: await provider.inputValue(),
    shown: await provider.locator("option:checked").textContent(),
    options: await provider.locator("option").allTextContents(),
    disabled: await provider.isDisabled(),
  });
  await page.screenshot({ path: join(shotDir, "02-click-events-provider.png") });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export diagram", exact: true }).click();
  await page.getByRole("button", { name: "Source & diagnostics", exact: true }).click();
  const srcEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download source JSON", exact: true }).click();
  step("source json", await saveDownload(await srcEvent, outDir));
  await page.getByRole("button", { name: /^Close source/i }).click().catch(async () => {
    await page.keyboard.press("Escape");
  });
  if (await page.getByRole("button", { name: "Close export diagram" }).isVisible().catch(() => false))
    await page.getByRole("button", { name: "Close export diagram" }).click();
  step("detailed png", await exportPng(page, outDir));
  record.revisionAfterDetailed = await designRev();
  await context.close();

  // 2. Simple view (browser localStorage only), Simple PNG.
  ({ context, page } = await fresh(browser, errors));
  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Simple", exact: true }).click();
  await page.waitForTimeout(800);
  await ready(page);
  step("opened simple", {
    nodes: await page.locator(".board .react-flow__node").count(),
    edges: await page.locator(".board .react-flow__edge").count(),
  });
  await page.screenshot({ path: join(shotDir, "03-reopened-simple.png") });
  step("simple png", await exportPng(page, outDir));
  record.revisionAfterSimple = await designRev();
  await context.close();

  // 3. Studio export by mouse.
  ({ context, page } = await fresh(browser, errors));
  await page.getByRole("button", { name: "Generate project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  step("generate dialog", {
    runnableProcessesChecked: await dialog.getByRole("checkbox", { name: "Runnable processes" }).isChecked(),
  });
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
  await page.screenshot({ path: join(shotDir, "04-generate-preview.png") });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project ZIP", exact: true }).click();
  const zip = await saveDownload(await downloadEvent, outDir);
  await page.getByText(/Project ZIP downloaded/).waitFor({ state: "visible" });
  step("download", { ...zip, matchesPreview: zip.sha256 === preview.archive.sha256 });
  await page.getByRole("button", { name: "Close generate experimental project" }).click();
  record.revisionAfterExport = await designRev();
  await context.close();
  record.projectsAfter = await getJson("/projects");
} finally {
  record.pageErrors = errors;
  await browser.close();
  await writeFile(recordFile, `${JSON.stringify(record, null, 2)}\n`);
}
