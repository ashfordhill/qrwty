import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { chromium, expect as browserExpect } from "@playwright/test";
import type { Browser, Page, Request } from "@playwright/test";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const qr = { id: "af387361-4071-41bb-a224-f8a953cb3909", title: "A link", destination: "https://example.com", createdAt: "2026-10-01T12:00:00.000Z" };
const second = { ...qr, id: "bf387361-4071-41bb-a224-f8a953cb3909", title: null, createdAt: "2026-09-01T12:00:00.000Z" };
const session = { id: qr.id, csrfToken: "a".repeat(64) };
const png = Buffer.from("server-generated-image");
type Reply = { status?: number; body?: unknown; binary?: Buffer };
let browser: Browser;
let server: ViteDevServer;
let page: Page;
let origin: string;
let calls: Request[];
let pageErrors: string[];

beforeAll(async () => {
  server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
}, 30000);
afterAll(async () => { await browser?.close(); await server?.close(); });
afterEach(async () => {
  await page?.context().close();
  expect(pageErrors ?? []).toEqual([]);
});

async function open(respond: (request: Request, path: string) => Reply) {
  page = await browser.newPage();
  calls = []; pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", entry => { if (entry.type() === "error") pageErrors.push(entry.text()); });
  await page.route("**/_api/qrwty/**", async route => {
    const request = route.request();
    calls.push(request);
    const path = new URL(request.url()).pathname.replace("/_api/qrwty", "");
    const reply = respond(request, path);
    await route.fulfill({ status: reply.status ?? 200, contentType: reply.binary ? "image/png" : "application/json",
      body: reply.binary ?? (reply.status === 204 ? "" : JSON.stringify(reply.body)) });
  });
  await page.goto(origin);
}
function standard(request: Request, path: string): Reply {
  if (path === "/auth/session") return { body: session };
  if (path === "/api/qr" && request.method() === "GET") return { body: { items: [qr, second], nextCursor: null } };
  return { status: 404, body: { error: "NOT_FOUND", message: "QR not found" } };
}
const hook = (id: string) => page.getByTestId(id);

describe("qrwty workflows", () => {
  test("auth gate, registration, logout, login, and CSRF", async () => {
    await open((request, path) => {
      if (path === "/auth/session") return { status: 401, body: { error: "UNAUTHENTICATED", message: "Sign in" } };
      if (path === "/auth/register") return { status: 201, body: session };
      if (path === "/auth/login") return { body: session };
      if (path === "/auth/logout") return { status: 204 };
      return standard(request, path);
    });
    await browserExpect(hook("auth-email")).toBeVisible();
    await browserExpect(hook("qr-create-form")).toHaveCount(0);
    await hook("auth-email").fill("person@example.com");
    await hook("auth-password").fill("a-long-password");
    await hook("auth-register").click();
    await browserExpect(hook("qr-create-form")).toBeVisible();
    expect(calls.find(r => r.url().endsWith("/auth/register"))!.postDataJSON()).toEqual({ email: "person@example.com", password: "a-long-password" });
    await hook("auth-logout").click();
    await browserExpect(hook("auth-login")).toBeVisible();
    expect(calls.find(r => r.url().endsWith("/auth/logout"))!.headers()["x-csrf-token"]).toBe(session.csrfToken);
    await hook("auth-password").fill("a-long-password");
    await hook("auth-login").click();
    await browserExpect(hook("qr-create-form")).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  });

  test("lists, paginates, validates destinations, and creates with CSRF", async () => {
    let created = false;
    const added = { ...qr, id: "cf387361-4071-41bb-a224-f8a953cb3909", title: "New title", createdAt: "2026-10-02T12:00:00.000Z" };
    await open((request, path) => {
      if (path === "/api/qr" && request.method() === "POST") { created = true; return { status: 201, body: added }; }
      if (path === "/api/qr") {
        const query = new URL(request.url()).searchParams;
        expect(query.get("limit")).toBe("25");
        return { body: query.has("cursor") ? { items: [second], nextCursor: null } : { items: created ? [added, qr] : [qr], nextCursor: created ? null : "next-page" } };
      }
      return standard(request, path);
    });
    await browserExpect(hook("qr-row")).toHaveCount(1);
    await browserExpect(hook("qr-public-link")).toHaveText(`${origin}/q/${qr.id}`);
    await page.getByRole("button", { name: "Load more" }).click();
    await browserExpect(hook("qr-row")).toHaveCount(2);
    await browserExpect(hook("qr-row").nth(1)).toContainText("Untitled");
    await hook("qr-destination").fill("https://user:password@example.com");
    await hook("qr-create").click();
    await browserExpect(page.getByRole("alert")).toContainText("without credentials");
    expect(calls.filter(r => r.method() === "POST")).toHaveLength(0);
    await hook("qr-destination").fill("https://example.com/new");
    await hook("qr-title").fill("New title");
    await hook("qr-create").click();
    await browserExpect(hook("qr-destination")).toHaveValue("");
    await browserExpect(hook("qr-title")).toHaveValue("");
    await browserExpect(hook("qr-row").first()).toHaveAttribute("data-qr-id", added.id);
    const mutation = calls.find(r => r.method() === "POST")!;
    expect(mutation.headers()["x-csrf-token"]).toBe(session.csrfToken);
    expect(mutation.postDataJSON()).toEqual({ destination: "https://example.com/new", title: "New title" });
  });

  test("selection gates actions, edit clears title and keeps selection, downloads server bytes", async () => {
    await open((request, path) => {
      if (request.method() === "PATCH") return { body: { ...qr, ...request.postDataJSON() } };
      if (path.endsWith("/image")) return { binary: png };
      return standard(request, path);
    });
    await browserExpect(hook("qr-row")).toHaveCount(2);
    await browserExpect(hook("qr-image-download")).toHaveCount(0);
    await hook("qr-select").first().click();
    await hook("qr-edit-title").fill("");
    await hook("qr-edit-destination").fill("https://example.com/changed");
    await hook("qr-edit-save").click();
    await browserExpect(hook("qr-row").first()).toContainText("Untitled");
    await browserExpect(hook("qr-image-download")).toBeVisible();
    const patch = calls.find(r => r.method() === "PATCH")!;
    expect(patch.headers()["x-csrf-token"]).toBe(session.csrfToken);
    expect(patch.postDataJSON()).toEqual({ destination: "https://example.com/changed", title: null });
    const downloading = page.waitForEvent("download");
    await hook("qr-image-download").click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`qr-${qr.id}.png`);
    expect(await readFile((await download.path())!)).toEqual(png);
    await hook("qr-select").nth(1).click();
    await browserExpect(hook("qr-row").first().getByTestId("qr-image-download")).toHaveCount(0);
    await browserExpect(hook("qr-row").nth(1).getByTestId("qr-image-download")).toBeVisible();
  });

  test("activity shows all UTC days, total requests, and invalid-range errors", async () => {
    let activityCalls = 0;
    await open((request, path) => {
      if (path.endsWith("/activity")) {
        activityCalls++;
        if (activityCalls > 1) return { status: 400, body: { error: "INVALID_RANGE", message: "Date range is too wide" } };
        const query = new URL(request.url()).searchParams;
        const from = query.get("from")!, to = query.get("to")!;
        expect((Date.parse(to) - Date.parse(from)) / 86400000).toBe(29);
        return { body: { total: 2, days: [{ date: from, count: 0 }, { date: to, count: 2 }] } };
      }
      return standard(request, path);
    });
    await hook("qr-select").first().click();
    await hook("qr-activity").click();
    await browserExpect(hook("activity-total")).toHaveText("2 requests");
    await browserExpect(hook("activity-day")).toHaveCount(2);
    await browserExpect(hook("activity-day").first()).toHaveAttribute("data-count", "0");
    await hook("activity-from").fill("2020-01-01");
    await hook("activity-apply").click();
    await browserExpect(page.getByRole("alert")).toHaveText("Date range is too wide");
    await browserExpect(hook("activity-total")).toHaveCount(0);
  });

  test("inline API errors retain forms and expired sessions return to auth", async () => {
    let edits = 0;
    await open((request, path) => {
      if (path === "/api/qr" && request.method() === "POST") return { status: 400, body: { error: "INVALID", message: "Destination rejected" } };
      if (request.method() === "PATCH") {
        edits++;
        return { status: edits === 1 ? 404 : 401, body: { error: "FAILED", message: edits === 1 ? "QR not found" : "Sign in" } };
      }
      return standard(request, path);
    });
    await hook("qr-destination").fill("https://example.com");
    await hook("qr-create").click();
    await browserExpect(page.getByRole("alert")).toHaveText("Destination rejected");
    await browserExpect(hook("qr-destination")).toHaveValue("https://example.com");
    await hook("qr-select").first().click();
    await hook("qr-edit-save").click();
    await browserExpect(hook("qr-row").first().getByRole("alert")).toHaveText("QR not found");
    await hook("qr-edit-save").click();
    await browserExpect(hook("auth-login")).toBeVisible();
    await browserExpect(hook("qr-row")).toHaveCount(0);
  });
});
