import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Client } from "../src/client/client.ts";
import { CaptureProxy } from "../src/observe/capture-proxy.ts";
import { deriveStatus, RunWriter, readResults, summaryTable } from "../src/observe/results.ts";
import { redactHeaders, redactText, redactValue, registerSecret } from "../src/redact.ts";
import type { ResultLine } from "../src/types.ts";
import { httpServer } from "./helpers.ts";

describe("capture proxy", () => {
	it("records status, headers, event header and monotonic times; never cookies or tokens", async () => {
		const upstream = await httpServer((req, res) => {
			if (req.url === "/AbCdEfGhIj") {
				res.writeHead(302, {
					Location: "https://example.com/x",
					"Cache-Control": "no-store",
					"QRWTY-Click-Event": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
					"Set-Cookie": "s=1",
				});
				return res.end();
			}
			res.writeHead(404);
			res.end("nope");
		});
		const proxy = await new CaptureProxy(upstream.url).start();
		const client = new Client(proxy.url, "http://qrwty.localhost:1");
		await client.request("GET", "/AbCdEfGhIj", {
			headers: { Cookie: "secret=1", Authorization: "Bearer abcdefghijkl" },
			edge: { token: "edge-secret", clientIp: "1.2.3.4" },
		});
		await client.request("GET", "/missing");
		const [hit, miss] = proxy.entries;
		expect(hit.status).toBe(302);
		expect(hit.clickEvent).toBe("1b4e28ba-2fa1-11d2-883f-0016d3cca427");
		expect(hit.location).toBe("https://example.com/x");
		expect(hit.requestHeaders.cookie).toBeUndefined();
		expect(hit.requestHeaders.authorization).toBeUndefined();
		expect(hit.requestHeaders["x-oracle-edge-token"]).toBeUndefined();
		expect(hit.responseHeaders["set-cookie"]).toBeUndefined();
		expect(hit.headMono).toBeGreaterThanOrEqual(hit.startMono);
		expect(miss.status).toBe(404);
		expect(proxy.forSlug("AbCdEfGhIj")).toHaveLength(1);
		await upstream.close();
		const broken = await client.request("GET", "/AbCdEfGhIj");
		expect(broken.status).toBe(502);
		expect(proxy.entries.at(-1)?.upstreamError).toBeTruthy();
		await proxy.close();
	});
});

describe("results", () => {
	it("derives status with failed > blocked > not run > passed", () => {
		const c = (status: ResultLine["status"]) => ({
			name: "x",
			status,
			expected: "",
			observed: null,
		});
		expect(deriveStatus([])).toBe("blocked");
		expect(deriveStatus([c("passed")])).toBe("passed");
		expect(deriveStatus([c("passed"), c("not run")])).toBe("not run");
		expect(deriveStatus([c("not run"), c("blocked")])).toBe("blocked");
		expect(deriveStatus([c("blocked"), c("failed")])).toBe("failed");
	});

	it("writes redacted results.jsonl with artifact hashes and a summary", async () => {
		registerSecret("super-secret-password-1");
		const dir = mkdtempSync(join(tmpdir(), "oracle-results-"));
		const writer = new RunWriter(dir, "run-1");
		const artifact = await writer.artifact("A09", "capture.json", {
			password: "x",
			note: "has super-secret-password-1 inside",
			ok: true,
		});
		expect(artifact.path).toBe("artifacts/run-1/A09/capture.json");
		expect(readFileSync(join(dir, artifact.path), "utf8")).not.toContain("super-secret-password-1");
		const line: ResultLine = {
			runId: "run-1",
			arm: "b",
			commit: "abc1234",
			images: {},
			environment: {},
			acceptanceId: "A09",
			status: "passed",
			startedAt: "2026-11-14T00:00:00Z",
			endedAt: "2026-11-14T00:01:00Z",
			command: "node src/cli.ts run",
			expected: "x",
			observed: {
				checks: [
					{ name: "c", status: "passed", expected: "", observed: "Bearer abcdefghijklmnop" },
				],
				clockOffsets: [],
				params: {},
			},
			artifacts: [artifact],
			notes: "",
		};
		writer.write(line);
		const [back] = readResults(join(dir, "results.jsonl"));
		expect(JSON.stringify(back)).not.toContain("abcdefghijklmnop");
		expect(summaryTable([back])).toContain("| A09 | passed | 1/0/0/0 |");
	});
});

describe("redaction", () => {
	it("removes registered secrets, key patterns and credential headers", () => {
		registerSecret("my-edge-token-value");
		expect(redactText("x my-edge-token-value y sk_" + "test_abcdefghijk whsec_" + "abcdefgh")).toBe(
			"x [redacted] y [redacted] [redacted]",
		);
		expect(
			redactHeaders({
				Cookie: "a=1",
				"Set-Cookie": "b",
				"X-CSRF-Token": "t",
				Location: "https://x",
			}),
		).toEqual({ location: "https://x" });
		expect(
			redactValue({ claim: { token: "proof", expiresAt: "t" }, nested: [{ password: "p" }] }),
		).toEqual({
			claim: { token: "[redacted]", expiresAt: "t" },
			nested: [{ password: "[redacted]" }],
		});
	});
});
