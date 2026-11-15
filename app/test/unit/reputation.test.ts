// The Web Risk adapter against an in-process stand-in for its HTTP target (no socket).
import { describe, expect, it } from "vitest";
import type { HttpTarget } from "../../src/modules/dependencies.ts";
import { webRiskReputation } from "../../src/modules/link-api/link-operations/reputation.ts";

function target(answer: (url: URL, signal: AbortSignal) => Promise<Response>) {
	const urls: URL[] = [];
	const http: HttpTarget = {
		request: (path, init) => {
			const url = new URL(path, "https://webrisk.test");
			urls.push(url);
			return answer(url, init?.signal as AbortSignal);
		},
	};
	return { http, urls };
}
const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Web Risk uris.search", () => {
	it("asks for the three threat types and the exact destination", async () => {
		const { http, urls } = target(async () => json(200, {}));
		expect(await webRiskReputation(http)("https://example.com/a?b=1&c=%2F")).toBe("clean");
		const url = urls[0];
		expect(url?.pathname).toBe("/v1/uris:search");
		expect(url?.searchParams.getAll("threatTypes")).toEqual([
			"MALWARE",
			"SOCIAL_ENGINEERING",
			"UNWANTED_SOFTWARE",
		]);
		expect(url?.searchParams.get("uri")).toBe("https://example.com/a?b=1&c=%2F");
	});
	it("reads a threat", async () => {
		const { http } = target(async () => json(200, { threat: { threatTypes: ["MALWARE"] } }));
		expect(await webRiskReputation(http)("https://example.com/oracle/unsafe/x")).toBe("threat");
	});
	it("is unavailable on an error status, bad JSON, an oversized body or a network error", async () => {
		const failures: unknown[] = [];
		const onFailure = (e: unknown) => failures.push(e);
		for (const answer of [
			async () => json(500, { error: {} }),
			async () => json(429, {}),
			async () => new Response("not json", { status: 200 }),
			async () => new Response("x".repeat(70_000), { status: 200 }),
			async () => {
				throw new TypeError("fetch failed");
			},
		]) {
			const { http } = target(answer);
			expect(await webRiskReputation(http, { onFailure })("https://example.com/")).toBe(
				"unavailable",
			);
		}
		expect(failures.length).toBeGreaterThanOrEqual(4);
	});
	it("gives up at its deadline", async () => {
		const { http } = target(
			(_url, signal) =>
				new Promise((_resolve, reject) =>
					signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
				),
		);
		const started = performance.now();
		expect(await webRiskReputation(http, { deadlineMs: 50 })("https://example.com/")).toBe(
			"unavailable",
		);
		expect(performance.now() - started).toBeLessThan(1_000);
	});
});
