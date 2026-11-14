// Q02: Generate project -> Preview scaffold by mouse, scroll the result into view, keep the
// dialog text and a screenshot. No download, no checkbox, no other control.
import { writeFile } from "node:fs/promises";
import { chromium } from "/home/ash/github/jeeves/node_modules/@playwright/test/index.mjs";

const [shot, textFile] = process.argv.slice(2);
const id = "d1e59607-0616-418d-83d5-4cfe5bcb4b11";
const rev = async () =>
  (await (await fetch(`http://127.0.0.1:4310/projects/${id}/design`)).json()).design.revision;
const before = await rev();
const browser = await chromium.launch({ headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`http://127.0.0.1:4300/?project=${id}`);
  await page.locator('.board[data-layout="ready"][data-board="ready"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Generate project", exact: true }).click();
  await page.getByRole("button", { name: "Preview scaffold", exact: true }).click();
  const ready = page.getByText(/^Ready: \d+ files/);
  await ready.waitFor({ state: "visible" });
  await ready.scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot });
  await writeFile(textFile, `${await page.getByRole("dialog").innerText()}\n`);
  await page.getByRole("button", { name: "Close generate experimental project" }).click();
} finally {
  await browser.close();
}
console.log(JSON.stringify({ revisionBefore: before, revisionAfter: await rev() }));
