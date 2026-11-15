import { describe, expect, it } from "vitest";
import worker from "../src/index.ts";
import {
	type Assets,
	type Build,
	contentSecurityPolicy,
	handle,
	route,
	SECURITY_HEADERS,
	shortCommit,
	utcLabel,
} from "../src/router.ts";

const build: Build = {
	commit: "0123456789abcdef0123456789abcdef01234567",
	builtAt: "2026-11-14T22:50:03Z",
};

function get(url: string, method = "GET"): Response {
	return route(new Request(url, { method }), build);
}

function expectSecurityHeaders(response: Response): void {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		expect(response.headers.get(name), name).toBe(value);
	}
	expect(response.headers.get("strict-transport-security")).toBeNull();
	// Stops Cloudflare's automatic Web Analytics from injecting its beacon script.
	expect(response.headers.get("cache-control")).toMatch(/(^|, )no-transform$/);
}

describe("route", () => {
	it("serves the placeholder page with the build line", async () => {
		const response = get("https://qrwty.io/");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
		const html = await response.text();
		expect(html).toContain("<title>QRWTY</title>");
		expect(html).toContain("Short links that never lose a click. In development.");
		expect(html).toContain("build <code>0123456</code>");
		expect(html).toContain('<time datetime="2026-11-14T22:50:03Z">2026-11-14 22:50:03 UTC</time>');
		expect(html).toContain('<a href="/versions/">Versions: what happened</a>');
	});

	it("makes no external requests from the page", async () => {
		const html = await get("https://qrwty.io/").text();
		expect(html).not.toMatch(/<script|<link|@import|url\(|https?:\/\//i);
		expect(html).toMatch(/@media \(prefers-color-scheme:dark\)/);
	});

	it("answers /healthz with ok and the build", async () => {
		const response = get("https://qrwty.io/healthz");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
		expect(response.headers.get("cache-control")).toBe("no-store, no-transform");
		expect(await response.json()).toEqual({
			ok: true,
			commit: build.commit,
			builtAt: build.builtAt,
		});
	});

	it("answers /build.json with the build object", async () => {
		const response = get("https://qrwty.io/build.json");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ commit: build.commit, builtAt: build.builtAt });
	});

	it("returns a small HTML 404 for any other path", async () => {
		for (const path of ["/x", "/healthz/", "/index.html", "/build.json/x", "/favicon.ico"]) {
			const response = get(`https://qrwty.io${path}`);
			expect(response.status, path).toBe(404);
			expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
			const html = await response.text();
			expect(html).toContain("<h1>404</h1>");
			expect(html.length).toBeLessThan(2048);
		}
	});

	it("redirects www to the apex with the same path and query", () => {
		for (const [from, to] of [
			["https://www.qrwty.io/", "https://qrwty.io/"],
			["https://www.qrwty.io/x", "https://qrwty.io/x"],
			["https://www.qrwty.io/a/b?c=1&d=2", "https://qrwty.io/a/b?c=1&d=2"],
			["http://www.qrwty.io/healthz", "https://qrwty.io/healthz"],
		]) {
			const response = get(from);
			expect(response.status, from).toBe(301);
			expect(response.headers.get("location"), from).toBe(to);
			expectSecurityHeaders(response);
		}
		expect(get("https://www.qrwty.io/x", "POST").status).toBe(301);
	});

	it("sends the security headers on every response and no HSTS", () => {
		for (const url of [
			"https://qrwty.io/",
			"https://qrwty.io/healthz",
			"https://qrwty.io/build.json",
			"https://qrwty.io/missing",
			"https://www.qrwty.io/x",
		]) {
			expectSecurityHeaders(get(url));
		}
		expectSecurityHeaders(get("https://qrwty.io/", "POST"));
		expectSecurityHeaders(get("https://qrwty.io/healthz", "HEAD"));
	});

	it("answers HEAD like GET without a body", async () => {
		const response = get("https://qrwty.io/healthz", "HEAD");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
		expect(await response.text()).toBe("");
		expect(get("https://qrwty.io/nope", "HEAD").status).toBe(404);
	});

	it("refuses other methods with 405", () => {
		for (const method of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
			const response = get("https://qrwty.io/healthz", method);
			expect(response.status, method).toBe(405);
			expect(response.headers.get("allow")).toBe("GET, HEAD");
		}
	});

	it("escapes build values in the page", async () => {
		const html = await route(new Request("https://qrwty.io/"), {
			commit: "<b>",
			builtAt: '"x"',
		}).text();
		expect(html).toContain("<code>&#60;b&#62;</code>");
		expect(html).toContain('datetime="&#34;x&#34;"');
	});
});

/** A stand-in for the static-assets binding: a few files, a trailing-slash redirect, 304s. */
function fakeAssets(): Assets & { seen: Request[] } {
	const files: Record<string, [string, string]> = {
		"/versions/": ["text/html; charset=utf-8", "<h1>versions</h1>"],
		"/versions/design/": ["text/html; charset=utf-8", "<h1>prototype</h1>"],
		"/versions/design/app.js": ["text/javascript", "console.log(1)"],
		"/versions/original/": ["text/html; charset=utf-8", "<h1>original</h1>"],
		"/versions/b/diagrams/x.png": ["image/png", "png"],
		"/versions/b/inventory.jsonl": ["", "{}"],
	};
	const seen: Request[] = [];
	return {
		seen,
		async fetch(request: Request): Promise<Response> {
			seen.push(request);
			const path = new URL(request.url).pathname;
			if (path === "/versions/a/index.html")
				return new Response(null, { status: 307, headers: { location: "/versions/a/" } });
			const file = files[path];
			if (!file) return new Response("not found", { status: 404 });
			const headers: Record<string, string> = {
				etag: '"e1"',
				"cache-control": "public, max-age=0",
			};
			if (file[0]) headers["content-type"] = file[0];
			if (request.headers.get("if-none-match") === '"e1"')
				return new Response(null, { status: 304, headers });
			// Bytes, so the Response adds no content type of its own (the real assets may send none).
			return new Response(new TextEncoder().encode(file[1]), { headers });
		},
	};
}

function serve(url: string, init: RequestInit = {}, assets: Assets | undefined = fakeAssets()) {
	return handle(new Request(url, init), build, assets);
}

describe("handle", () => {
	it("serves /versions/ from the assets with S01's headers and no-transform", async () => {
		const response = await serve("https://qrwty.io/versions/");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
		expect(response.headers.get("etag")).toBe('"e1"');
		expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
		expectSecurityHeaders(response);
		expect(await response.text()).toBe("<h1>versions</h1>");
	});

	it("caches files other than pages for an hour", async () => {
		const response = await serve("https://qrwty.io/versions/b/diagrams/x.png");
		expect(response.headers.get("content-type")).toBe("image/png");
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600, no-transform");
		expectSecurityHeaders(response);
	});

	it("lets the prototype run its own scripts and the original page link its stylesheet", async () => {
		const design = await serve("https://qrwty.io/versions/design/app.js");
		const csp = design.headers.get("content-security-policy") ?? "";
		expect(csp).toContain("script-src 'self'");
		expect(csp).toContain("img-src 'self' data: blob:");
		expect(csp).not.toMatch(/https?:|\*/);
		const original = (await serve("https://qrwty.io/versions/original/")).headers.get(
			"content-security-policy",
		);
		expect(original).toContain("style-src 'self' 'unsafe-inline'");
		expect(original).toContain("form-action 'none'");
		expect(original).not.toContain("script-src");
		expect(contentSecurityPolicy("/versions/a/")).toBe(SECURITY_HEADERS["content-security-policy"]);
		expect(contentSecurityPolicy("/versions/designs/")).toBe(
			SECURITY_HEADERS["content-security-policy"],
		);
	});

	it("answers a missing file with the HTML 404 page", async () => {
		const response = await serve("https://qrwty.io/versions/nope.html");
		expect(response.status).toBe(404);
		expect(await response.text()).toContain("<h1>404</h1>");
		expectSecurityHeaders(response);
	});

	it("passes the trailing-slash redirect and 304s through without a body", async () => {
		const moved = await serve("https://qrwty.io/versions/a/index.html");
		expect(moved.status).toBe(307);
		expect(moved.headers.get("location")).toBe("/versions/a/");
		expectSecurityHeaders(moved);
		const same = await serve("https://qrwty.io/versions/", {
			headers: { "if-none-match": '"e1"' },
		});
		expect(same.status).toBe(304);
		expect(await same.text()).toBe("");
		expectSecurityHeaders(same);
	});

	it("redirects /versions to /versions/", async () => {
		const response = await serve("https://qrwty.io/versions?x=1");
		expect(response.status).toBe(301);
		expect(response.headers.get("location")).toBe("https://qrwty.io/versions/?x=1");
		expectSecurityHeaders(response);
	});

	it("adds the trailing slash to a folder so its relative links resolve", async () => {
		const assets = fakeAssets();
		const response = await serve("https://qrwty.io/versions/a?x=1", {}, assets);
		expect(response.status).toBe(301);
		expect(response.headers.get("location")).toBe("https://qrwty.io/versions/a/?x=1");
		expectSecurityHeaders(response);
		expect(assets.seen).toHaveLength(0);
		expect((await serve("https://qrwty.io/versions/b/diagrams/x.png")).status).toBe(200);
	});

	it("serves JSON Lines as text", async () => {
		const response = await serve("https://qrwty.io/versions/b/inventory.jsonl");
		expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
	});

	it("answers HEAD without a body and refuses other methods", async () => {
		const assets = fakeAssets();
		const head = await serve("https://qrwty.io/versions/", { method: "HEAD" }, assets);
		expect(head.status).toBe(200);
		expect(await head.text()).toBe("");
		expect(assets.seen[0]?.method).toBe("GET");
		expect((await serve("https://qrwty.io/versions/nope.html", { method: "HEAD" })).status).toBe(
			404,
		);
		const post = await serve("https://qrwty.io/versions/", { method: "POST" }, assets);
		expect(post.status).toBe(405);
		expect(assets.seen).toHaveLength(1);
	});

	it("sends b.qrwty.io, any path and method, to B's record", async () => {
		for (const [url, method] of [
			["https://b.qrwty.io/", "GET"],
			["https://b.qrwty.io/api/v1/links?x=1", "POST"],
			["http://b.qrwty.io/healthz", "HEAD"],
		]) {
			const response = await serve(url as string, { method });
			expect(response.status, url).toBe(301);
			expect(response.headers.get("location")).toBe("https://qrwty.io/versions/b/");
			expectSecurityHeaders(response);
		}
	});

	it("keeps www, the placeholder and the 404s as route answers them", async () => {
		const www = await serve("https://www.qrwty.io/versions/b/");
		expect(www.status).toBe(301);
		expect(www.headers.get("location")).toBe("https://qrwty.io/versions/b/");
		const assets = fakeAssets();
		expect((await serve("https://qrwty.io/", {}, assets)).status).toBe(200);
		expect((await serve("https://qrwty.io/healthz", {}, assets)).status).toBe(200);
		expect((await serve("https://qrwty.io/versionsx", {}, assets)).status).toBe(404);
		expect(assets.seen).toHaveLength(0);
		expect((await handle(new Request("https://qrwty.io/versions/"), build)).status).toBe(404);
	});
});

describe("worker entry", () => {
	it("reads the build from the environment", async () => {
		const response = await worker.fetch(new Request("https://qrwty.io/build.json"), {
			BUILD_COMMIT: build.commit,
			BUILT_AT: build.builtAt,
		});
		expect(await response.json()).toEqual(build);
	});

	it("falls back to unknown without build variables", async () => {
		const response = await worker.fetch(new Request("https://qrwty.io/healthz"), {});
		expect(await response.json()).toEqual({ ok: true, commit: "unknown", builtAt: "unknown" });
	});

	it("serves /versions/ through the ASSETS binding", async () => {
		const response = await worker.fetch(new Request("https://qrwty.io/versions/"), {
			ASSETS: fakeAssets(),
		});
		expect(await response.text()).toBe("<h1>versions</h1>");
	});
});

describe("labels", () => {
	it("shortens a full SHA and keeps a suffix", () => {
		expect(shortCommit(build.commit)).toBe("0123456");
		expect(shortCommit(`${build.commit}-dirty`)).toBe("0123456-dirty");
		expect(shortCommit("unknown")).toBe("unknown");
	});

	it("formats UTC ISO times", () => {
		expect(utcLabel("2026-11-14T22:50:03Z")).toBe("2026-11-14 22:50:03 UTC");
		expect(utcLabel("2026-11-14T22:50:03.123Z")).toBe("2026-11-14 22:50:03 UTC");
		expect(utcLabel("unknown")).toBe("unknown");
	});
});
