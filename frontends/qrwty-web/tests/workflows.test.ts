import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { dailyCounts, recentRange } from "@jeeves/analytics";
import { artworkSettingsSchema, defaultSettings, renderArtwork } from "@jeeves/qr-artwork";
import type { Browser, Page } from "@playwright/test";
import { expect as browserExpect, chromium } from "@playwright/test";
import type { ViteDevServer } from "vite";
import { createServer } from "vite";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import type { PageProblems } from "./support/page-problems.ts";
import { observePageProblems } from "./support/page-problems.ts";

vi.setConfig({ testTimeout: 20000 });

const qr = {
  id: "af387361-4071-41bb-a224-f8a953cb3909",
  title: "A link",
  destination: "https://example.com",
  createdAt: "2026-10-01T12:00:00.000Z",
};
const second = {
  ...qr,
  id: "bf387361-4071-41bb-a224-f8a953cb3909",
  title: null,
  createdAt: "2026-09-01T12:00:00.000Z",
};
const session = { id: qr.id, csrfToken: "a".repeat(64) };
const png = Buffer.from("server-generated-image");
type Request = {
  url(): string;
  method(): string;
  headers(): Record<string, string>;
  postDataJSON(): Record<string, unknown>;
};
type Reply = { status?: number; body?: unknown; binary?: Buffer };
let browser: Browser;
let server: ViteDevServer;
let page: Page;
let origin: string;
let calls: Request[];
let problems: PageProblems;
let workers: number;
let respond: (request: Request, path: string) => Reply | Promise<Reply>;

beforeAll(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    plugins: [
      {
        name: "qrwty-disposable-api",
        enforce: "pre",
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith("/_api/qrwty/")) return next();
            void (async () => {
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(Buffer.from(chunk));
              const body = Buffer.concat(chunks).toString();
              const url = new URL(req.url!, origin);
              const request: Request = {
                url: () => url.href,
                method: () => req.method ?? "GET",
                headers: () =>
                  Object.fromEntries(
                    Object.entries(req.headers).map(([key, value]) => [
                      key,
                      Array.isArray(value) ? value.join(", ") : (value ?? ""),
                    ]),
                  ),
                postDataJSON: () => JSON.parse(body),
              };
              calls.push(request);
              const reply = await respond(request, url.pathname.replace("/_api/qrwty", ""));
              res.statusCode = reply.status ?? 200;
              if (reply.status !== 204)
                res.setHeader("content-type", reply.binary ? "image/png" : "application/json");
              res.end(
                reply.status === 204 ? undefined : (reply.binary ?? JSON.stringify(reply.body)),
              );
            })().catch(next);
          });
        },
      },
    ],
  });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
}, 30000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});
afterEach(async () => {
  try {
    problems?.assert("qrwty workflow");
    expect(workers).toBe(0);
  } finally {
    problems?.stop();
    await page?.context().close();
  }
});

async function open(handler: typeof respond, initialStatus?: number) {
  respond = handler;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  page = await context.newPage();
  calls = [];
  workers = 0;
  page.on("worker", () => workers++);
  problems = observePageProblems(page);
  const probe = initialStatus
    ? negative("GET", "/auth/session", initialStatus, "initial session probe")
    : undefined;
  await page.goto(origin);
  if (probe) {
    await browserExpect(
      initialStatus === 401
        ? hook("auth-email")
        : page.getByRole("button", { name: "Retry session check" }),
    ).toBeVisible();
    probe.finish();
  }
}
function negative(method: string, path: string, status: number, scenario: string) {
  return problems.expectHttp({
    method,
    url: `${origin}/_api/qrwty${path}`,
    status,
    scenario,
    resourceType: "fetch",
  });
}
function standard(request: Request, path: string): Reply {
  if (path === "/auth/session") return { body: session };
  if (path === "/api/qr" && request.method() === "GET")
    return { body: { items: [qr, second], nextCursor: null } };
  return { status: 404, body: { error: "NOT_FOUND", message: "QR not found" } };
}
const hook = (id: string) => page.getByTestId(id);

describe("qrwty workflows", () => {
  test("auth gate, registration, logout, login, and CSRF", async () => {
    await open((request, path) => {
      if (path === "/auth/session")
        return { status: 401, body: { error: "UNAUTHENTICATED", message: "Sign in" } };
      if (path === "/auth/register") return { status: 201, body: session };
      if (path === "/auth/login") return { body: session };
      if (path === "/auth/logout") return { status: 204 };
      return standard(request, path);
    }, 401);
    await browserExpect(hook("auth-email")).toBeVisible();
    await browserExpect(hook("qr-create-form")).toHaveCount(0);
    await hook("auth-email").fill("person@example.com");
    await hook("auth-password").fill("a-long-password");
    await hook("auth-register").click();
    await browserExpect(hook("qr-create-form")).toBeVisible();
    expect(calls.find((r) => r.url().endsWith("/auth/register"))!.postDataJSON()).toEqual({
      email: "person@example.com",
      password: "a-long-password",
    });
    await hook("auth-logout").click();
    await browserExpect(hook("auth-login")).toBeVisible();
    expect(calls.find((r) => r.url().endsWith("/auth/logout"))!.headers()["x-csrf-token"]).toBe(
      session.csrfToken,
    );
    await hook("auth-password").fill("a-long-password");
    await hook("auth-login").click();
    await browserExpect(hook("qr-create-form")).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  });

  test("lists, paginates, validates destinations, and creates with CSRF", async () => {
    let created = false;
    const added = {
      ...qr,
      id: "cf387361-4071-41bb-a224-f8a953cb3909",
      title: "New title",
      createdAt: "2026-10-02T12:00:00.000Z",
    };
    await open((request, path) => {
      if (path === "/api/qr" && request.method() === "POST") {
        created = true;
        return { status: 201, body: added };
      }
      if (path === "/api/qr") {
        const query = new URL(request.url()).searchParams;
        expect(query.get("limit")).toBe("25");
        return {
          body: query.has("cursor")
            ? { items: [second], nextCursor: null }
            : { items: created ? [added, qr] : [qr], nextCursor: created ? null : "next-page" },
        };
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
    expect(calls.filter((r) => r.method() === "POST")).toHaveLength(0);
    await hook("qr-destination").fill("https://example.com/new");
    await hook("qr-title").fill("New title");
    await hook("qr-create").click();
    await browserExpect(hook("qr-destination")).toHaveValue("");
    await browserExpect(hook("qr-title")).toHaveValue("");
    await browserExpect(hook("qr-row").first()).toHaveAttribute("data-qr-id", added.id);
    const mutation = calls.find((r) => r.method() === "POST")!;
    expect(mutation.headers()["x-csrf-token"]).toBe(session.csrfToken);
    expect(mutation.postDataJSON()).toEqual({
      destination: "https://example.com/new",
      title: "New title",
    });
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
    const patch = calls.find((r) => r.method() === "PATCH")!;
    expect(patch.headers()["x-csrf-token"]).toBe(session.csrfToken);
    expect(patch.postDataJSON()).toEqual({
      destination: "https://example.com/changed",
      title: null,
    });
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
        if (activityCalls > 1)
          return {
            status: 400,
            body: { error: "INVALID_RANGE", message: "Date range is too wide" },
          };
        const query = new URL(request.url()).searchParams;
        const from = query.get("from")!,
          to = query.get("to")!;
        expect((Date.parse(to) - Date.parse(from)) / 86400000).toBe(29);
        return {
          body: {
            total: 2,
            days: [
              { date: from, count: 0 },
              { date: to, count: 2 },
            ],
          },
        };
      }
      return standard(request, path);
    });
    await hook("qr-select").first().click();
    await hook("qr-activity").click();
    await browserExpect(hook("activity-total")).toHaveText("2 requests");
    await browserExpect(hook("activity-day")).toHaveCount(2);
    await browserExpect(hook("activity-day").first()).toHaveAttribute("data-count", "0");
    await hook("activity-from").fill("2020-01-01");
    const invalidRange = negative(
      "GET",
      `/api/qr/${qr.id}/activity?from=2020-01-01&to=${await hook("activity-to").inputValue()}`,
      400,
      "too-wide activity range",
    );
    await hook("activity-apply").click();
    await browserExpect(page.getByRole("alert")).toHaveText("Date range is too wide");
    await browserExpect(hook("activity-total")).toHaveCount(0);
    invalidRange.finish();
  });

  test("inline API errors retain forms and expired sessions return to auth", async () => {
    let edits = 0;
    await open((request, path) => {
      if (path === "/api/qr" && request.method() === "POST")
        return { status: 400, body: { error: "INVALID", message: "Destination rejected" } };
      if (request.method() === "PATCH") {
        edits++;
        return {
          status: edits === 1 ? 404 : 401,
          body: { error: "FAILED", message: edits === 1 ? "QR not found" : "Sign in" },
        };
      }
      return standard(request, path);
    });
    await hook("qr-destination").fill("https://example.com");
    const invalidCreate = negative("POST", "/api/qr", 400, "rejected destination");
    await hook("qr-create").click();
    await browserExpect(page.getByRole("alert")).toHaveText("Destination rejected");
    await browserExpect(hook("qr-destination")).toHaveValue("https://example.com");
    invalidCreate.finish();
    await hook("qr-select").first().click();
    const missingQr = negative("PATCH", `/api/qr/${qr.id}`, 404, "missing selected QR");
    await hook("qr-edit-save").click();
    await browserExpect(hook("qr-row").first().getByRole("alert")).toHaveText("QR not found");
    missingQr.finish();
    const expired = negative("PATCH", `/api/qr/${qr.id}`, 401, "expired session");
    await hook("qr-edit-save").click();
    await browserExpect(hook("auth-login")).toBeVisible();
    await browserExpect(hook("qr-row")).toHaveCount(0);
    expired.finish();
  });
});

test("session failure is retryable, and failed logout keeps the authenticated workspace", async () => {
  let probes = 0,
    logouts = 0;
  await open((request, path) => {
    if (path === "/auth/session" && probes++ === 0)
      return { status: 503, body: { message: "Session service unavailable" } };
    if (path === "/auth/logout")
      return ++logouts === 1
        ? { status: 500, body: { message: "Logout failed. Please retry." } }
        : { status: 204 };
    return standard(request, path);
  }, 503);
  await browserExpect(hook("auth-login")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry session check" }).click();
  await browserExpect(hook("qr-row")).toHaveCount(2);
  const failedLogout = negative("POST", "/auth/logout", 500, "failed logout retains workspace");
  await hook("auth-logout").click();
  await browserExpect(page.getByRole("alert")).toContainText("Logout failed");
  await browserExpect(hook("qr-row")).toHaveCount(2);
  failedLogout.finish();
  await hook("auth-logout").click();
  await browserExpect(hook("auth-login")).toBeVisible();
});

test("rejected login and library failure keep useful retry states", async () => {
  let logins = 0,
    lists = 0;
  await open((request, path) => {
    if (path === "/auth/session") return { status: 401, body: { message: "Sign in" } };
    if (path === "/auth/login")
      return ++logins === 1
        ? { status: 401, body: { message: "Check your email and password" } }
        : { body: session };
    if (path === "/api/qr" && lists++ === 0)
      return { status: 500, body: { message: "Library unavailable" } };
    return standard(request, path);
  }, 401);
  await hook("auth-email").fill("reader@example.test");
  await hook("auth-password").fill("a-long-password");
  const rejected = negative("POST", "/auth/login", 401, "invalid login");
  await hook("auth-login").click();
  await browserExpect(page.getByRole("alert")).toHaveText("Check your email and password");
  await browserExpect(hook("auth-email")).toHaveValue("reader@example.test");
  rejected.finish();
  const listFailure = negative("GET", "/api/qr?limit=25", 500, "library failure");
  await hook("auth-login").click();
  await browserExpect(page.getByRole("alert")).toContainText("Library unavailable");
  listFailure.finish();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await browserExpect(hook("qr-row")).toHaveCount(2);
});

test("a stale list cannot replace the refreshed result after creation", async () => {
  let release: (() => void) | undefined;
  let created = false;
  const added = { ...qr, title: "Fresh result" };
  await open(async (request, path) => {
    if (path === "/api/qr" && request.method() === "POST") {
      created = true;
      return { status: 201, body: added };
    }
    if (path === "/api/qr") {
      if (new URL(request.url()).searchParams.has("cursor")) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { body: { items: [second], nextCursor: "stale" } };
      }
      return {
        body: { items: created ? [added] : [qr], nextCursor: created ? null : "next-page" },
      };
    }
    return standard(request, path);
  });
  await page.getByRole("button", { name: "Load more" }).click();
  await browserExpect.poll(() => typeof release).toBe("function");
  await hook("qr-destination").fill("https://example.com/fresh");
  await hook("qr-create").click();
  await browserExpect(hook("qr-row")).toContainText("Fresh result");
  expect(release).toBeTypeOf("function");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/qr?limit=25&cursor=next-page"),
  );
  release!();
  await (await response).finished();
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await browserExpect(hook("qr-row")).toHaveCount(1);
  await browserExpect(hook("qr-row")).toContainText("Fresh result");
  await browserExpect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
});

const screenshots = process.env.QRWTY_SCREENSHOT_DIR;
async function capture(name: string) {
  if (!screenshots) return;
  await mkdir(screenshots, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshots}/${name}.png`, fullPage: true });
}
async function noOverflow() {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("copy and server preview work with accessible desktop and mobile navigation", async () => {
  const preview = await readFile(new URL("./fixtures/preview.png", import.meta.url));
  await open((request, path) =>
    path.endsWith("/image") ? { binary: preview } : standard(request, path),
  );
  await browserExpect(hook("qr-row")).toHaveCount(2);
  await hook("qr-row").first().getByRole("button", { name: "Copy public link" }).click();
  await browserExpect(hook("qr-row").first().getByRole("status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${origin}/q/${qr.id}`);
  await capture("library-desktop");
  await hook("qr-select").first().click();
  await page.getByRole("button", { name: "Preview QR", exact: true }).click();
  const previewImage = page.getByRole("img", { name: "QR code for A link" });
  await browserExpect(previewImage).toBeVisible();
  await browserExpect
    .poll(() => previewImage.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBe(512);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await noOverflow();
  await capture("details-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.getByRole("navigation").getByRole("link", { name: "Create QR" }).click();
  await browserExpect(hook("qr-create-form")).toBeInViewport();
  await browserExpect(
    page.getByRole("navigation").getByRole("link", { name: "Create QR" }),
  ).toHaveAttribute("aria-current", "page");
  await capture("library-mobile");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("signed-out and empty states remain readable on a phone", async () => {
  await open((request, path) => {
    if (path === "/auth/session") return { status: 401, body: { message: "Sign in" } };
    if (path === "/auth/register") return { status: 201, body: session };
    if (path === "/api/qr") return { body: { items: [], nextCursor: null } };
    return standard(request, path);
  }, 401);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await capture("auth-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await capture("auth-mobile");
  await hook("auth-email").fill("new@example.test");
  await hook("auth-password").fill("a-long-password");
  await hook("auth-register").click();
  await browserExpect(
    page.getByRole("heading", { name: "Your next idea starts with a link." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create your first QR link" }).click();
  await browserExpect(hook("qr-create-form")).toBeInViewport();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await noOverflow();
});

test("a previous session's late mutation cannot sign out a newly authenticated workspace", async () => {
  let release: (() => void) | undefined;
  await open(async (request, path) => {
    if (path === "/api/qr" && request.method() === "POST") {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { status: 401, body: { message: "Old session expired" } };
    }
    if (path === "/auth/logout") return { status: 204 };
    if (path === "/auth/login") return { body: session };
    return standard(request, path);
  });
  await hook("qr-destination").fill("https://example.com/pending");
  const expired = negative("POST", "/api/qr", 401, "late previous-session response");
  await hook("qr-create").click();
  await browserExpect.poll(() => typeof release).toBe("function");
  await hook("auth-logout").click();
  await hook("auth-email").fill("returning@example.test");
  await hook("auth-password").fill("a-long-password");
  await hook("auth-login").click();
  await browserExpect(hook("qr-row")).toHaveCount(2);
  const response = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().endsWith("/api/qr"),
  );
  release!();
  await (await response).finished();
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expired.finish();
  await browserExpect(hook("qr-row")).toHaveCount(2);
  await browserExpect(hook("auth-login")).toHaveCount(0);
});

function studioFixture(failFirstSave = false): typeof respond {
  const revisions: Record<string, unknown>[] = [];
  let fail = failFirstSave;
  const artifact = (settings: unknown, format: "png" | "svg", revision?: string) => {
    const canonicalUrl = `${origin}/q/${qr.id}`;
    const result = renderArtwork(canonicalUrl, settings, format);
    return {
      bytesBase64: result.bytes.toString("base64"),
      contentType: result.contentType,
      sha256: result.sha256,
      checks: result.checks,
      canonicalUrl,
      rendererVersion: result.rendererVersion,
      filename: `${qr.id}${revision ? `-${revision}` : ""}.${format}`,
    };
  };
  return (request, path) => {
    if (path === `/api/qr/${qr.id}/studio`)
      return {
        body: {
          qr,
          canonicalUrl: `${origin}/q/${qr.id}`,
          items: [...revisions].reverse(),
          nextCursor: null,
        },
      };
    if (path === `/api/qr/${qr.id}/artwork/preview`)
      return { body: artifact(request.postDataJSON().settings, "png") };
    if (path === `/api/qr/${qr.id}/artwork`) {
      if (fail) {
        fail = false;
        return {
          status: 503,
          body: { error: "UNAVAILABLE", message: "Save temporarily unavailable. Retry." },
        };
      }
      const input = request.postDataJSON();
      const existing = revisions.find((item) => item.id === input.requestId);
      if (existing) return { body: existing };
      const settings = artworkSettingsSchema.parse(input.settings);
      const result = {
        id: input.requestId,
        settings,
        savedAt: new Date().toISOString(),
        canonicalUrl: `${origin}/q/${qr.id}`,
        rendererVersion: "qr-artwork@0.1.0",
        pngSha256: artifact(settings, "png").sha256,
        svgSha256: artifact(settings, "svg").sha256,
      };
      revisions.push(result);
      return { status: 201, body: result };
    }
    if (path.startsWith(`/api/qr/${qr.id}/artwork/`) && path.endsWith("/export")) {
      const revision = revisions.find((item) => path.includes(String(item.id)));
      if (revision)
        return {
          body: artifact(
            revision.settings,
            new URL(request.url()).searchParams.get("format") as "png" | "svg",
            String(revision.id),
          ),
        };
    }
    return standard(request, path);
  };
}

test("Studio preserves a failed save identity and asks before replacing customized settings", async () => {
  await open(studioFixture(true));
  await page.getByTestId("qr-row").first().getByTestId("studio-open").click();
  await browserExpect(hook("studio-preview")).toBeVisible();
  const failed = negative(
    "POST",
    `/api/qr/${qr.id}/artwork`,
    503,
    "failed Studio save can be retried",
  );
  await hook("studio-save").click();
  await browserExpect(page.getByRole("alert")).toContainText("temporarily unavailable");
  failed.finish();
  await browserExpect(hook("studio-export-png")).toBeDisabled();
  await hook("studio-save").click();
  await browserExpect(hook("studio-export-png")).toBeEnabled();
  const saves = calls.filter((call) => call.url().endsWith(`/api/qr/${qr.id}/artwork`));
  expect(saves).toHaveLength(2);
  expect(saves[0]?.postDataJSON().requestId).toBe(saves[1]?.postDataJSON().requestId);
  expect(saves[1]?.headers()["x-csrf-token"]).toBe(session.csrfToken);
  await hook("studio-foreground").fill("#132C25");
  await page.getByRole("button", { name: "Forest Canopy", exact: true }).click();
  await browserExpect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await browserExpect(hook("studio-foreground")).toHaveValue("#132C25");
  await page.getByRole("button", { name: "Forest Canopy", exact: true }).click();
  await page.getByRole("button", { name: "Use preset", exact: true }).click();
  await browserExpect(hook("studio-foreground")).toHaveValue("#193F35");
  await hook("studio-foreground").fill("#EEEEEE");
  await browserExpect(hook("studio-save")).toBeDisabled();
  await browserExpect(hook("studio-export-png")).toBeDisabled();
  await browserExpect(page.getByRole("alert")).toContainText("contrast");
});

test("Studio has accessible responsive controls and a real server-rendered preview", async () => {
  await open(studioFixture());
  await page.getByTestId("qr-row").first().getByTestId("studio-open").click();
  await browserExpect(hook("studio-preview")).toBeVisible();
  await hook("studio-save").click();
  await browserExpect(hook("studio-export-png")).toBeEnabled();
  await browserExpect(hook("studio-foreground")).toHaveValue(defaultSettings.foreground);
  await browserExpect
    .poll(() => hook("studio-preview").evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBe(512);
  await noOverflow();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await capture("studio-desktop");
  // Skip navigation must focus content without erasing the Studio route.
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.getByRole("link", { name: "Skip to content" }).click();
  expect(page.url()).toContain(`#studio/${qr.id}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await capture("studio-mobile");
});

function analyticsReply(request: Request) {
  const query = new URL(request.url()).searchParams;
  const from = query.get("from")!,
    to = query.get("to")!;
  const days = dailyCounts({ from, to }, []).map((day, index) => ({ ...day, count: index % 7 }));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return {
    body: {
      from,
      to,
      total,
      totalResources: 2,
      activeResources: total ? 2 : 0,
      days,
      top: total
        ? [
            { id: qr.id, label: "Spring launch", count: Math.ceil(total * 0.7) },
            { id: second.id, label: "Packaging labels", count: Math.floor(total * 0.3) },
          ]
        : [],
    },
  };
}

describe("owner analytics", () => {
  test("scoped error retry, explicit custom apply and stale range responses", async () => {
    let first = true;
    await open(async (request, path) => {
      if (path === "/api/analytics") {
        if (first) {
          first = false;
          return { status: 503, body: { error: "UNAVAILABLE", message: "Try again" } };
        }
        const response = analyticsReply(request);
        if (response.body.days.length === 7)
          await new Promise((resolve) => setTimeout(resolve, 200));
        return response;
      }
      return standard(request, path);
    });
    const range = recentRange(30);
    const failed = negative(
      "GET",
      `/api/analytics?from=${range.from}&to=${range.to}`,
      503,
      "analytics temporarily unavailable",
    );
    await page.getByRole("link", { name: "Analytics", exact: true }).click();
    await browserExpect(page.getByRole("button", { name: "Retry analytics" })).toBeVisible();
    failed.finish();
    await page.getByRole("button", { name: "Retry analytics" }).click();
    await browserExpect(hook("analytics-result-range")).toContainText("30 days");
    await page.getByRole("button", { name: "Last 7 days", exact: true }).click();
    await page.getByRole("button", { name: "Last 90 days", exact: true }).click();
    await browserExpect(hook("analytics-result-range")).toContainText("90 days");
    await page.waitForTimeout(250);
    await browserExpect(hook("analytics-result-range")).toContainText("90 days");
    await hook("analytics-from").fill("2026-01-01");
    await hook("analytics-to").fill("2026-01-03");
    await browserExpect(hook("analytics-result-range")).toContainText("90 days");
    await browserExpect(
      page.getByText("Apply your date range to update the results."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Apply range", exact: true }).click();
    await browserExpect(hook("analytics-result-range")).toHaveText(
      "Showing 2026-01-01 – 2026-01-03 · 3 days · UTC",
    );
    await hook("analytics-from").fill("2026-03-01");
    await browserExpect(
      page.getByRole("button", { name: "Apply range", exact: true }),
    ).toBeDisabled();
    await browserExpect(hook("analytics-result-range")).toContainText("2026-01-01");
  });
  test("responsive analytics exposes a complete table and readable mouse controls", async () => {
    await open((request, path) =>
      path === "/api/analytics" ? analyticsReply(request) : standard(request, path),
    );
    await page.getByRole("link", { name: "Analytics", exact: true }).click();
    await browserExpect(hook("analytics-result-range")).toContainText("30 days");
    await browserExpect(page.getByRole("img", { name: /Scans over time/ })).toBeVisible();
    await page.getByText("View daily counts", { exact: true }).click();
    await browserExpect(page.getByRole("table", { name: /Scans over time/ })).toBeVisible();
    expect(
      await page
        .getByRole("table", { name: /Scans over time/ })
        .locator("tbody tr")
        .count(),
    ).toBe(30);
    await page.getByText("View daily counts", { exact: true }).click();
    await mkdir("/tmp/jeeves-p18-screenshots", { recursive: true });
    for (const [name, viewport] of [
      ["desktop", { width: 1440, height: 1000 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `/tmp/jeeves-p18-screenshots/analytics-${name}.png`,
        fullPage: true,
      });
    }
  });
});
