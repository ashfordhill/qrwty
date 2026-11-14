import { describe, expect, it } from "vitest";
import worker from "../src/index.ts";
import { type Build, route, SECURITY_HEADERS, shortCommit, utcLabel } from "../src/router.ts";

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

describe("worker entry", () => {
	it("reads the build from the environment", async () => {
		const response = worker.fetch(new Request("https://qrwty.io/build.json"), {
			BUILD_COMMIT: build.commit,
			BUILT_AT: build.builtAt,
		});
		expect(await response.json()).toEqual(build);
	});

	it("falls back to unknown without build variables", async () => {
		const response = worker.fetch(new Request("https://qrwty.io/healthz"), {});
		expect(await response.json()).toEqual({ ok: true, commit: "unknown", builtAt: "unknown" });
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
