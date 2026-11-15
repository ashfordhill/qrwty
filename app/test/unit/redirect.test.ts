// A4: the Redirect service's stub body, offline, with fake Links, Hot routes and Click events.
import { describe, expect, it } from "vitest";
import type {
	CacheClient,
	DatabaseReader,
	QueuePublisher,
} from "../../src/modules/dependencies.ts";
import type { ModuleRequest, ModuleResponse } from "../../src/modules/entry.ts";
import { parseClick } from "../../src/modules/redirect-service/redirect/click-event.ts";
import {
	CLICK_HEADER,
	cachedRoute,
	PUBLISH_MS,
	redirects,
	VALIDITY_MS,
} from "../../src/modules/redirect-service/redirect/redirect.ts";

const LINK = "0f6f8e5e-6a43-4b8f-9b8e-1c2d3e4f5a6b";
const EVENT = "11111111-2222-4333-8444-555555555555";
type Row = {
	link_id: string;
	state: string;
	version: number;
	expires_at: Date | null;
	destination: string | null;
};
const active = (extra: Partial<Row> = {}): Row => ({
	link_id: LINK,
	state: "active",
	version: 1,
	expires_at: null,
	destination: "https://example.com/a?b=c",
	...extra,
});

function setup(
	options: { rows?: Record<string, Row>; publish?: (message: Uint8Array) => Promise<void> } = {},
) {
	let clock = Date.parse("2026-11-15T12:00:00.000Z");
	const rows = options.rows ?? { Abcdef1234: active() };
	const reads: string[] = [];
	const links: DatabaseReader = {
		async query<R>(_sql: string, values?: readonly unknown[]) {
			const slug = String(values?.[0]);
			reads.push(slug);
			await new Promise((resolve) => setTimeout(resolve, 5));
			const row = rows[slug];
			return (row ? [row] : []) as R[];
		},
	};
	const cache = new Map<string, string>();
	const hotRoutes: CacheClient = {
		async get(key) {
			return cache.get(key);
		},
		async set(key, value) {
			cache.set(key, value);
		},
		async delete(key) {
			cache.delete(key);
		},
	};
	const published: { message: Uint8Array; messageId?: string }[] = [];
	const clickEvents: QueuePublisher = {
		async publish(message, publishOptions) {
			published.push({ message, messageId: publishOptions?.messageId });
			await (options.publish ?? (async () => {}))(message);
		},
	};
	const handler = redirects({
		links,
		hotRoutes,
		clickEvents,
		origin: new URL("https://qrwty.io"),
		now: () => clock,
		newEventId: () => EVENT,
	});
	const call = (method: string, path: string, headers: ModuleRequest["headers"] = {}) =>
		handler({
			method,
			path,
			rawPath: path,
			query: {},
			headers: { "x-forwarded-host": "qrwty.io", ...headers },
			body: undefined,
			caller: { signedIn: false },
			signal: new AbortController().signal,
		});
	return {
		call,
		cache,
		reads,
		published,
		rows,
		advance: (ms: number) => {
			clock += ms;
		},
	};
}
const header = (response: ModuleResponse, name: string) =>
	(response.headers as Record<string, string> | undefined)?.[name];

describe("redirect", () => {
	it("answers 302 to the saved destination only after the click is published", async () => {
		const t = setup();
		const response = await t.call("GET", "/Abcdef1234", {
			"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile",
			referer: "https://News.Example.org/path?q=secret",
			cookie: "a=b",
		});
		expect(response.status).toBe(302);
		expect(header(response, "Location")).toBe("https://example.com/a?b=c");
		expect(header(response, CLICK_HEADER)).toBe(EVENT);
		expect(t.published).toHaveLength(1);
		expect(t.published[0]?.messageId).toBe(EVENT);
		const parsed = parseClick(t.published[0]?.message as Uint8Array);
		expect(parsed).toEqual({
			ok: true,
			event: {
				schemaVersion: 1,
				eventId: EVENT,
				linkId: LINK,
				eventTime: "2026-11-15T12:00:00.000Z",
				synthetic: false,
				deviceClass: "mobile",
				country: null,
				referrerHost: "news.example.org",
			},
		});
		const text = Buffer.from(t.published[0]?.message as Uint8Array).toString();
		for (const secret of ["secret", "path", "a=b", "iPhone", "example.com/a"])
			expect(text).not.toContain(secret);
	});

	it("HEAD answers as GET would, without an event or its header", async () => {
		const t = setup();
		const response = await t.call("HEAD", "/Abcdef1234");
		expect(response.status).toBe(302);
		expect(header(response, "Location")).toBe("https://example.com/a?b=c");
		expect(header(response, CLICK_HEADER)).toBeUndefined();
		expect(response.body).toBeUndefined();
		expect(t.published).toHaveLength(0);
	});

	it("refuses unknown, malformed, other hosts and other methods without Location", async () => {
		const t = setup();
		const cases: [string, string, ModuleRequest["headers"], number][] = [
			["GET", "/Zzzzzzzzzz", {}, 404],
			["GET", "/short", {}, 404],
			["GET", "/Abcdef1234/x", {}, 404],
			["GET", "/Abcdef1234", { "x-forwarded-host": "evil.example" }, 404],
			["POST", "/Abcdef1234", {}, 405],
		];
		for (const [method, path, headers, status] of cases) {
			const response = await t.call(method, path, headers);
			expect(response.status, `${method} ${path}`).toBe(status);
			expect(header(response, "Location")).toBeUndefined();
			expect(header(response, "Content-Type")).toBe("text/html; charset=utf-8");
		}
		const allowed = await t.call("PUT", "/Abcdef1234");
		expect(header(allowed, "Allow")).toBe("GET, HEAD");
		expect(t.published).toHaveLength(0);
		// No negative caching: the unknown slug is read again.
		await t.call("GET", "/Zzzzzzzzzz");
		expect(t.reads.filter((slug) => slug === "Zzzzzzzzzz")).toHaveLength(2);
	});

	it("410 for disabled, deleted and expired links; 403 for blocked; no event", async () => {
		const t = setup({
			rows: {
				Disabled01: active({ state: "disabled", destination: null }),
				Deleted001: active({ state: "deleted", destination: null }),
				Expired001: active({ expires_at: new Date("2026-11-15T11:59:59.000Z") }),
				Blocked001: active({ state: "blocked", destination: null }),
			},
		});
		for (const [slug, status] of [
			["Disabled01", 410],
			["Deleted001", 410],
			["Expired001", 410],
			["Blocked001", 403],
		] as const) {
			const response = await t.call("GET", `/${slug}`);
			expect(response.status, slug).toBe(status);
			expect(header(response, "Location")).toBeUndefined();
		}
		expect(t.published).toHaveLength(0);
	});

	it("a failed or late publish is 503 with Retry-After and no Location", async () => {
		const rejected = setup({ publish: () => Promise.reject(new Error("Publisher queue full")) });
		const no = await rejected.call("GET", "/Abcdef1234");
		expect(no.status).toBe(503);
		expect(header(no, "Location")).toBeUndefined();
		expect(header(no, "Retry-After")).toBe("2");

		const late = setup({ publish: () => new Promise(() => {}) });
		const started = performance.now();
		const unknown = await late.call("GET", "/Abcdef1234");
		expect(performance.now() - started).toBeLessThan(PUBLISH_MS + 300);
		expect(unknown.status).toBe(503);
		expect(header(unknown, "Location")).toBeUndefined();
		// The event may be stored, so its ID is on the answer.
		expect(header(unknown, CLICK_HEADER)).toBe(EVENT);
	});

	it("rechecks expiry after the ACK: 410 that carries the event ID", async () => {
		const box: { advance?: (ms: number) => void } = {};
		const t = setup({
			rows: { Abcdef1234: active({ expires_at: new Date("2026-11-15T12:00:00.500Z") }) },
			publish: async () => box.advance?.(1000),
		});
		box.advance = t.advance;
		const response = await t.call("GET", "/Abcdef1234");
		expect(response.status).toBe(410);
		expect(header(response, "Location")).toBeUndefined();
		expect(header(response, CLICK_HEADER)).toBe(EVENT);
	});

	it("serves a valid cache entry, refills one past its deadline, and coalesces misses", async () => {
		const t = setup();
		await t.call("GET", "/Abcdef1234");
		expect(t.reads).toEqual(["Abcdef1234"]);
		// Each cached hit still publishes and waits for its ACK.
		await t.call("GET", "/Abcdef1234");
		expect(t.reads).toHaveLength(1);
		expect(t.published).toHaveLength(2);
		// The source changes; the entry keeps serving only until its absolute deadline.
		t.rows.Abcdef1234 = active({ state: "disabled", destination: null, version: 2 });
		t.advance(VALIDITY_MS - 1);
		expect((await t.call("GET", "/Abcdef1234")).status).toBe(302);
		t.advance(1);
		expect((await t.call("GET", "/Abcdef1234")).status).toBe(410);
		expect(t.reads).toHaveLength(2);

		const cold = setup();
		const answers = await Promise.all(
			Array.from({ length: 20 }, () => cold.call("GET", "/Abcdef1234")),
		);
		expect(answers.every((answer) => answer.status === 302)).toBe(true);
		expect(cold.reads).toHaveLength(1);
	});

	it("reads the database when the cache fails, and 503 when both do", async () => {
		const down: CacheClient = {
			get: () => Promise.reject(new Error("Cache unavailable")),
			set: () => Promise.reject(new Error("Cache unavailable")),
			delete: () => Promise.reject(new Error("Cache unavailable")),
		};
		const published: Uint8Array[] = [];
		const request: ModuleRequest = {
			method: "GET",
			path: "/Abcdef1234",
			rawPath: "/Abcdef1234",
			query: {},
			headers: { "x-forwarded-host": "qrwty.io" },
			body: undefined,
			caller: { signedIn: false },
			signal: new AbortController().signal,
		};
		const handler = (links: DatabaseReader) =>
			redirects({
				links,
				hotRoutes: down,
				clickEvents: {
					publish: async (message) => {
						published.push(message);
					},
				},
				origin: new URL("https://qrwty.io"),
				onFailure: () => {},
			});
		const cacheOnlyDown = await handler({
			query: async <R>() => [active()] as R[],
		})(request);
		expect(cacheOnlyDown.status).toBe(302);
		expect(published).toHaveLength(1);
		const bothDown = await handler({
			query: () => Promise.reject(new Error("Query read timeout")),
		})(request);
		expect(bothDown.status).toBe(503);
		expect(header(bothDown, "Location")).toBeUndefined();
		expect(header(bothDown, "Retry-After")).toBe("2");
		expect(published).toHaveLength(1);
	});

	it("never trusts a cache entry past its deadline or claiming a longer one", () => {
		const at = 1_000_000;
		const entry = (validatedUntil: number) =>
			JSON.stringify({
				linkId: LINK,
				state: "active",
				version: 1,
				expiresAt: null,
				destination: "https://example.com/",
				validatedUntil,
			});
		expect(cachedRoute(entry(at + 1), at)?.linkId).toBe(LINK);
		expect(cachedRoute(entry(at), at)).toBeUndefined();
		expect(cachedRoute(entry(at + VALIDITY_MS + 1), at)).toBeUndefined();
		expect(cachedRoute("{", at)).toBeUndefined();
		expect(cachedRoute(undefined, at)).toBeUndefined();
	});
});
