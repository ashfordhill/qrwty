// A4: click event v1, the Click aggregator's decisions (with a fake database), and Link
// analytics' range rules and CSV cells, offline.
import { describe, expect, it } from "vitest";
import {
	analyticsRange,
	csvCell,
	TIER,
} from "../../src/modules/account-api/link-analytics/routes.ts";
import { clickAggregator } from "../../src/modules/analytics-worker/clicks/aggregate.ts";
import type { DatabaseReadWriter } from "../../src/modules/dependencies.ts";
import type { ModuleMessage, ModuleResponse } from "../../src/modules/entry.ts";
import {
	deviceClass,
	encodeClick,
	parseClick,
	referrerHost,
} from "../../src/modules/redirect-service/redirect/click-event.ts";

const NOW = Date.parse("2026-11-15T12:00:00.000Z");
const event = (extra: Record<string, unknown> = {}) => ({
	schemaVersion: 1,
	eventId: "11111111-2222-4333-8444-555555555555",
	linkId: "0f6f8e5e-6a43-4b8f-9b8e-1c2d3e4f5a6b",
	eventTime: "2026-11-15T11:59:59.123Z",
	synthetic: false,
	deviceClass: "desktop",
	country: null,
	referrerHost: null,
	...extra,
});
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));

describe("click event v1", () => {
	it("classes devices with filter-v1's bot rule", () => {
		expect(deviceClass(undefined)).toBe("bot");
		expect(deviceClass("  ")).toBe("bot");
		expect(deviceClass("curl/8.5.0")).toBe("bot");
		expect(deviceClass("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("bot");
		expect(deviceClass("facebookexternalhit/1.1")).toBe("bot");
		expect(deviceClass("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile/15E148")).toBe("mobile");
		expect(deviceClass("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari")).toBe("mobile");
		expect(deviceClass("Mozilla/5.0 (Linux; Android 15; SM-X910) Safari")).toBe("tablet");
		expect(deviceClass("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)")).toBe("tablet");
		expect(deviceClass("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140")).toBe("desktop");
		expect(deviceClass("Something/1.0")).toBe("unknown");
	});

	it("keeps only a referrer's lowercase host, never a path, query or IP", () => {
		expect(referrerHost("https://News.Example.org/a/b?q=1#x")).toBe("news.example.org");
		expect(referrerHost("http://example.com.")).toBe("example.com");
		expect(referrerHost("https://192.0.2.7/x")).toBeNull();
		expect(referrerHost("https://[2001:db8::1]/x")).toBeNull();
		expect(referrerHost("android-app://com.example")).toBeNull();
		expect(referrerHost("not a url")).toBeNull();
		expect(referrerHost(undefined)).toBeNull();
	});

	it("parses v1, accepts unknown fields and refuses anything else with a reason", () => {
		expect(parseClick(encodeClick(event() as never))).toEqual({ ok: true, event: event() });
		expect(parseClick(bytes({ ...event(), future: "field" })).ok).toBe(true);
		const reasons: [unknown, string][] = [
			["{", "malformed_json"],
			[[1], "not_an_object"],
			[event({ schemaVersion: 2 }), "unsupported_schema_version"],
			[event({ eventId: "x" }), "invalid_event_id"],
			[event({ linkId: 7 }), "invalid_link_id"],
			[event({ eventTime: "2026-11-15T12:00:00Z" }), "invalid_event_time"],
			[event({ eventTime: "2026-02-30T12:00:00.000Z" }), "invalid_event_time"],
			[event({ synthetic: "no" }), "invalid_synthetic"],
			[event({ deviceClass: "fridge" }), "invalid_device_class"],
			[event({ country: "usa" }), "invalid_country"],
			[event({ referrerHost: "a.com/path" }), "invalid_referrer_host"],
		];
		for (const [value, reason] of reasons) {
			const parsed = parseClick(typeof value === "string" ? Buffer.from(value) : bytes(value));
			expect(parsed.ok ? "ok" : parsed.reason, JSON.stringify(value)).toBe(reason);
		}
	});
});

describe("click aggregator", () => {
	function fake(options: { failing?: boolean } = {}) {
		const calls: { sql: string; values: readonly unknown[] }[] = [];
		const seen = new Set<string>();
		const db = {
			async query<R>(sql: string, values: readonly unknown[] = []) {
				if (options.failing) throw new Error("Query read timeout");
				calls.push({ sql, values });
				if (sql.includes("record_click")) {
					const first = !seen.has(String(values[0]));
					seen.add(String(values[0]));
					return [{ first }] as R[];
				}
				return [] as R[];
			},
		} as unknown as DatabaseReadWriter;
		return { db, calls };
	}
	const message = (body: Uint8Array, messageId?: string): ModuleMessage => ({
		body,
		...(messageId === undefined ? {} : { messageId }),
		headers: {},
		attempt: 1,
		source: "click-events--analytics-worker--analytics-worker-click-aggregator",
	});
	const id = event().eventId;

	it("records an event once, by its ID, then counts a repeat as a duplicate", async () => {
		const t = fake();
		const aggregate = clickAggregator({ db: t.db, now: () => NOW });
		expect(await aggregate(message(bytes(event()), id))).toBe("recorded");
		expect(await aggregate(message(bytes(event()), id))).toBe("duplicate");
		const recorded = t.calls.filter((call) => call.sql.includes("record_click"));
		expect(recorded[0]?.values).toEqual([id, event().linkId, event().eventTime, false, false]);
		expect(t.calls.filter((call) => call.sql.includes("purge_expired"))).toHaveLength(1);
	});

	it("passes bot and synthetic flags to the aggregate", async () => {
		const t = fake();
		const aggregate = clickAggregator({ db: t.db, now: () => NOW });
		await aggregate(message(bytes(event({ deviceClass: "bot" })), id));
		expect(t.calls[0]?.values.slice(3)).toEqual([false, true]);
	});

	it("quarantines poison, mismatched and out-of-horizon events instead of counting them", async () => {
		const t = fake();
		const aggregate = clickAggregator({ db: t.db, now: () => NOW });
		expect(await aggregate(message(Buffer.from("not json"), "m-1"))).toBe(
			"quarantined:malformed_json",
		);
		expect(await aggregate(message(bytes(event()), "another-id"))).toBe(
			"quarantined:message_id_mismatch",
		);
		expect(
			await aggregate(message(bytes(event({ eventTime: "2026-10-01T00:00:00.000Z" })), id)),
		).toBe("quarantined:beyond_replay_horizon");
		expect(
			await aggregate(message(bytes(event({ eventTime: "2026-11-15T12:10:00.000Z" })), id)),
		).toBe("quarantined:future_event_time");
		expect(await aggregate(message(Buffer.from("x".repeat(70_000)), "m-2"))).toBe(
			"quarantined:malformed_json",
		);
		const quarantined = t.calls.filter((call) => call.sql.includes("quarantine_click"));
		expect(quarantined).toHaveLength(5);
		expect(quarantined.at(-1)?.values[2]).toBe("malformed_json_truncated");
		expect((quarantined.at(-1)?.values[3] as Buffer | undefined)?.length).toBe(65536);
		expect(t.calls.some((call) => call.sql.includes("record_click"))).toBe(false);
	});

	it("throws when the database fails, so the message is not acknowledged", async () => {
		const aggregate = clickAggregator({ db: fake({ failing: true }).db, now: () => NOW });
		await expect(aggregate(message(bytes(event()), id))).rejects.toThrow("Query read timeout");
	});
});

describe("link analytics range", () => {
	const ok = (value: ReturnType<typeof analyticsRange>) => {
		if (!("from" in value)) throw new Error(JSON.stringify(value));
		return {
			from: new Date(value.from).toISOString().slice(0, 10),
			to: new Date(value.to).toISOString().slice(0, 10),
		};
	};
	const refused = (value: ReturnType<typeof analyticsRange>) => {
		const response = value as ModuleResponse;
		return [response.status, (response.body as { error: { code: string } }).error.code];
	};

	it("defaults to the last 7 days, today included", () => {
		expect(ok(analyticsRange({}, NOW))).toEqual({ from: "2026-11-09", to: "2026-11-15" });
		expect(TIER.lookbackDays).toBe(7);
	});

	it("refuses bad dates, inverted or long ranges and ranges past the tier's lookback", () => {
		expect(refused(analyticsRange({ from: "2026-11-31" }, NOW))).toEqual([400, "invalid_request"]);
		expect(refused(analyticsRange({ to: ["2026-11-14", "2026-11-15"] }, NOW))).toEqual([
			400,
			"invalid_request",
		]);
		expect(refused(analyticsRange({ from: "2026-11-15", to: "2026-11-14" }, NOW))).toEqual([
			400,
			"invalid_range",
		]);
		expect(refused(analyticsRange({ from: "2025-01-01", to: "2026-11-15" }, NOW))).toEqual([
			400,
			"invalid_range",
		]);
		expect(refused(analyticsRange({ from: "2026-11-08" }, NOW))).toEqual([403, "tier_restricted"]);
		expect(ok(analyticsRange({ from: "2026-11-12", to: "2026-11-13" }, NOW))).toEqual({
			from: "2026-11-12",
			to: "2026-11-13",
		});
	});

	it("makes CSV cells spreadsheet-safe", () => {
		expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
		expect(csvCell("+1")).toBe("'+1");
		expect(csvCell("-1")).toBe("'-1");
		expect(csvCell("@x")).toBe("'@x");
		expect(csvCell('a,"b"')).toBe('"a,""b"""');
		expect(csvCell(12)).toBe("12");
		expect(csvCell("2026-11-15")).toBe("2026-11-15");
	});
});
