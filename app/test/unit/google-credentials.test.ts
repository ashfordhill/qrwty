// Link API's Google identity for Web Risk (Q13, AG-13): the metadata server's token, its cache, and
// the adapter sending it. In-process stand-ins only (no socket, no metadata server).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { HttpTarget } from "../../src/modules/dependencies.ts";
import {
	METADATA_TOKEN_URL,
	metadataTokenSource,
	reputationCredentials,
} from "../../src/modules/link-api/link-operations/google-credentials.ts";
import { webRiskReputation } from "../../src/modules/link-api/link-operations/reputation.ts";
import { linkOperationsFromEnvironment } from "../../src/modules/link-api/link-operations/service.ts";

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function metadata(answers: Array<() => Response | Promise<Response>>) {
	const calls: Array<{ url: string; headers: Headers }> = [];
	const fake = (async (url: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: String(url), headers: new Headers(init?.headers) });
		const next = answers.shift();
		if (!next) throw new TypeError("fetch failed");
		return next();
	}) as typeof fetch;
	return { fake, calls };
}
const signal = () => AbortSignal.timeout(1_000);

describe("QRWTY_REPUTATION_CREDENTIALS", () => {
	it("is unset or metadata", () => {
		expect(reputationCredentials(undefined)).toBe("none");
		expect(reputationCredentials("")).toBe("none");
		expect(reputationCredentials("metadata")).toBe("metadata");
		for (const bad of ["Metadata", "key", "none", "true"])
			expect(() => reputationCredentials(bad)).toThrow(/^Invalid QRWTY_REPUTATION_CREDENTIALS/);
	});
	it("fails Link API's startup naming the variable", () => {
		const dir = mkdtempSync(join(tmpdir(), "qrwty-q13-config-"));
		const previous = process.env.SECRET_DIR;
		try {
			writeFileSync(
				join(dir, "link-replay-keys"),
				`k1 ${Buffer.alloc(32, 3).toString("base64url")}\n`,
			);
			process.env.SECRET_DIR = dir;
			const origin = { QRWTY_PUBLIC_ORIGIN_URL: "https://qrwty.io" };
			expect(() =>
				linkOperationsFromEnvironment({ ...origin, QRWTY_REPUTATION_CREDENTIALS: "key" }),
			).toThrow(/QRWTY_REPUTATION_CREDENTIALS/);
			expect(
				typeof linkOperationsFromEnvironment({
					...origin,
					QRWTY_REPUTATION_CREDENTIALS: "metadata",
				}),
			).toBe("function");
		} finally {
			if (previous === undefined) delete process.env.SECRET_DIR;
			else process.env.SECRET_DIR = previous;
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("the metadata server's token", () => {
	it("asks the metadata server with its header, and caches until a minute before expiry", async () => {
		let clock = 0;
		const { fake, calls } = metadata([
			() => json(200, { access_token: "first", expires_in: 3599, token_type: "Bearer" }),
			() => json(200, { access_token: "second", expires_in: 3599, token_type: "Bearer" }),
		]);
		const token = metadataTokenSource({ fetch: fake, now: () => clock });
		expect(await token(signal())).toBe("first");
		clock = 3_538_000;
		expect(await token(signal())).toBe("first");
		expect(calls).toHaveLength(1);
		clock = 3_539_001;
		expect(await token(signal())).toBe("second");
		expect(calls).toHaveLength(2);
		expect(calls[0]?.url).toBe(METADATA_TOKEN_URL);
		expect(calls[0]?.headers.get("metadata-flavor")).toBe("Google");
	});
	it("throws on an error status, an unexpected body or a network error, and caches no failure", async () => {
		for (const answer of [
			() => json(404, {}),
			() => json(200, { access_token: "", expires_in: 10, token_type: "Bearer" }),
			() => json(200, { access_token: "x", expires_in: 0, token_type: "Bearer" }),
			() => json(200, { access_token: "x", expires_in: 10, token_type: "MAC" }),
			() => {
				throw new TypeError("fetch failed");
			},
		]) {
			const { fake } = metadata([
				answer,
				() => json(200, { access_token: "ok", expires_in: 3599, token_type: "Bearer" }),
			]);
			const token = metadataTokenSource({ fetch: fake, now: () => 0 });
			await expect(token(signal())).rejects.toThrow();
			expect(await token(signal())).toBe("ok");
		}
	});
});

describe("Web Risk with a token", () => {
	function target(status = 200) {
		const seen: Headers[] = [];
		const http: HttpTarget = {
			request: async (_path, init) => {
				seen.push(new Headers(init?.headers));
				return json(status, {});
			},
		};
		return { http, seen };
	}
	it("sends the bearer token with the lookup", async () => {
		const { http, seen } = target();
		const check = webRiskReputation(http, { token: async () => "t0k" });
		expect(await check("https://example.com/")).toBe("clean");
		expect(seen[0]?.get("authorization")).toBe("Bearer t0k");
		expect(seen[0]?.get("accept")).toBe("application/json");
	});
	it("sends nothing without a token source", async () => {
		const { http, seen } = target();
		expect(await webRiskReputation(http)("https://example.com/")).toBe("clean");
		expect(seen[0]?.has("authorization")).toBe(false);
	});
	it("fails closed when the token can't be had, without calling Web Risk", async () => {
		const { http, seen } = target();
		const failures: unknown[] = [];
		const check = webRiskReputation(http, {
			token: async () => {
				throw new Error("metadata token: HTTP 404");
			},
			onFailure: (e) => failures.push(e),
		});
		expect(await check("https://example.com/")).toBe("unavailable");
		expect(seen).toHaveLength(0);
		expect(failures).toHaveLength(1);
	});
	it("bounds the token and the lookup with one deadline", async () => {
		const { http } = target();
		const started = performance.now();
		const check = webRiskReputation(http, {
			deadlineMs: 50,
			token: (s) =>
				new Promise((_resolve, reject) =>
					s.addEventListener("abort", () => reject(s.reason), { once: true }),
				),
		});
		expect(await check("https://example.com/")).toBe("unavailable");
		expect(performance.now() - started).toBeLessThan(1_000);
	});
	it("refuses Web Risk's 401 and 403 as unavailable", async () => {
		for (const status of [401, 403]) {
			const { http } = target(status);
			expect(
				await webRiskReputation(http, { token: async () => "t" })("https://example.com/"),
			).toBe("unavailable");
		}
	});
});
