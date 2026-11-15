// Account API's Link analytics (Q10, A4), below /modules/account-api-link-analytics, where Session
// API forwards the owner's `GET /api/v1/links/{id}/analytics` and `.../analytics.csv`
// (http-contract §7). The guard is Required, so every caller is a verified subject; ownership is
// checked in Links' account view (published.owned_links) by that subject's owner key, and another
// account's link or an unknown ID is 404. Counts come from Analytics' published views.
//   GET /links/:id/analytics?from&to       counts, series, freshness, reconciliation, filter
//   GET /links/:id/analytics.csv?from&to   date,recorded_attempts,filtered_clicks
// The tier comes from the caller's Billing API grant (A7): Free shows 7 days and no breakdowns,
// Paid 90 days with breakdowns by device class, country and referrer host. Without a valid grant
// (Billing API down) the caller gets Free's view, and a range only Paid allows is 503, not 403.
// Each CSV export spends one of the month's exports with Billing API first (403 when none is left,
// 503 when Billing API can't say), so the allowance is enforced at the server.

import { createFailureLog } from "../../../runtime/tile-process.ts";
import { FREE_LIMITS, fetchGrant, spendExport } from "../../billing-api/billing/grant-client.ts";
import type { DatabaseReader, HttpTarget } from "../../dependencies.ts";
import { defineRoutes, type ModuleRequest, type ModuleResponse } from "../../entry.ts";
import { notFound, problem, unavailable } from "../../link-api/link-operations/contract.ts";
import { ownerKey } from "../../link-api/link-operations/view.ts";
import { FILTER_V1_BOT, UUID } from "../../redirect-service/redirect/click-event.ts";

/** Free's view, for a caller without a valid grant (and in tests without Billing API). */
export const TIER = {
	policy: "free-test-v1",
	lookbackDays: FREE_LIMITS.lookbackDays,
	breakdowns: false,
} as const;
export type Tier = {
	policy: string;
	lookbackDays: number;
	breakdowns: boolean;
	fallback?: boolean;
};
/** Each breakdown lists at most this many values, most filtered clicks first. */
export const BREAKDOWN_TOP = 10;
export const MAX_RANGE_DAYS = 366;
/** durable-clicks: analytics lag above 60 seconds is degraded. */
export const DELAYED_MS = 60_000;
export const FILTER = {
	version: "filter-v1",
	definition: `recordedAttempts counts every unique non-synthetic GET of the short link that was durably recorded before its redirect was sent, bots included; an attempt is not proof that anyone reached the destination. filteredClicks leaves out bots: an empty user agent, or one matching ${FILTER_V1_BOT.source} (any case).`,
} as const;

const DAY_MS = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const failure = createFailureLog("account-api");

export type AnalyticsDependencies = {
	links: DatabaseReader;
	analytics: DatabaseReader;
	/** Billing API (A7): the grant and the export allowance; absent in tests (Free, unmetered). */
	billingApi?: HttpTarget;
};

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const one = (value: string | string[] | undefined) =>
	typeof value === "string" ? value : undefined;

/** A `YYYY-MM-DD` date's UTC midnight, or undefined when it isn't a real date. */
function parseDay(text: string): number | undefined {
	if (!DATE.test(text)) return undefined;
	const ms = Date.parse(`${text}T00:00:00.000Z`);
	return Number.isNaN(ms) || day(ms) !== text ? undefined : ms;
}

/** The asked range, or the answer that refuses it (http-contract §7). */
export function analyticsRange(
	query: ModuleRequest["query"],
	now: number,
	tier: Tier = TIER,
): { from: number; to: number; earliest: number } | ModuleResponse {
	const today = Date.parse(`${day(now)}T00:00:00.000Z`);
	const earliest = today - (tier.lookbackDays - 1) * DAY_MS;
	const bound = (name: "from" | "to", fallback: number) => {
		const value = query[name];
		if (value === undefined) return fallback;
		const text = one(value);
		return text === undefined ? undefined : parseDay(text);
	};
	const from = bound("from", earliest);
	const to = bound("to", today);
	if (from === undefined || to === undefined)
		return problem(400, "invalid_request", "from and to are dates, YYYY-MM-DD (UTC).", false, {
			reason: from === undefined ? "from" : "to",
		});
	if (from > to || (to - from) / DAY_MS + 1 > MAX_RANGE_DAYS)
		return problem(
			400,
			"invalid_range",
			`from must not be after to, and a range is at most ${MAX_RANGE_DAYS} days.`,
			false,
		);
	if (from < earliest)
		return tier.fallback && from >= today - (90 - 1) * DAY_MS
			? problem(503, "billing_unavailable", "Your plan could not be checked; try again.", true, {
					retryAfterSeconds: 2,
				})
			: problem(
					403,
					"tier_restricted",
					`This plan shows the last ${tier.lookbackDays} days.`,
					false,
				);
	return { from, to, earliest };
}

/** A CSV cell a spreadsheet won't run: one starting with =, +, - or @ gets a leading '. */
export function csvCell(value: string | number): string {
	const text = String(value);
	const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
	return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export type BreakdownItem = {
	value: string | null;
	recordedAttempts: number;
	filteredClicks: number;
};
export type Breakdowns = {
	device: BreakdownItem[];
	country: BreakdownItem[];
	referrerHost: BreakdownItem[];
};

type Report = {
	linkId: string;
	range: { from: string; to: string };
	totals: { recordedAttempts: number; filteredClicks: number };
	series: { date: string; recordedAttempts: number; filteredClicks: number }[];
	breakdowns: Breakdowns | null;
	freshness: { asOf: string | null; delayed: boolean; lagMs: number | null };
	reconciliation: { status: "ok" | "delayed" | "incident" };
	filter: typeof FILTER;
	lookback: { maxDays: number; limitedByTier: boolean };
	tier: { policy: string; breakdowns: boolean };
};

/** The caller's tier from its grant (A7), or Free's (`fallback` when Billing API gave none). */
async function tierOf(request: ModuleRequest, dependencies: AnalyticsDependencies): Promise<Tier> {
	if (!dependencies.billingApi) return TIER;
	const authorization = request.headers.authorization;
	const grant = await fetchGrant(
		dependencies.billingApi,
		typeof authorization === "string" ? authorization : undefined,
		request.signal,
	);
	return grant
		? {
				policy: grant.policy,
				lookbackDays: grant.limits.lookbackDays,
				breakdowns: grant.limits.breakdowns,
			}
		: { ...TIER, fallback: true };
}

/** The owner's report for one link, or the answer that refuses it. */
async function report(
	request: ModuleRequest & { params: Record<string, string> },
	dependencies: AnalyticsDependencies,
	now: number,
): Promise<Report | ModuleResponse> {
	if (!request.caller.signedIn)
		return problem(401, "unauthenticated", "Sign in to see analytics.", false);
	const id = request.params.id ?? "";
	if (!UUID.test(id)) return notFound();
	const tier = await tierOf(request, dependencies);
	const range = analyticsRange(request.query, now, tier);
	if (!("from" in range)) return range;
	const owner = ownerKey(request.caller.principal.subject);
	let created: Date;
	try {
		const [link] = await dependencies.links.query<{ created_at: Date }>(
			"SELECT created_at FROM published.owned_links WHERE owner_key = $1 AND id = $2::uuid",
			[owner, id],
		);
		if (!link) return notFound();
		created = link.created_at;
	} catch (error) {
		failure("analytics ownership", error);
		return unavailable("storage_unavailable", "Analytics are unavailable; try again shortly.");
	}
	let rows: { day: string; recorded_attempts: string; filtered_clicks: string }[];
	let pipeline: { last_commit_at: Date; last_lag_ms: string } | undefined;
	let open: { events: string }[];
	let parts: { dimension: string; value: string; recorded: string; filtered: string }[] = [];
	try {
		[rows, [pipeline], open, parts] = await Promise.all([
			dependencies.analytics.query<{
				day: string;
				recorded_attempts: string;
				filtered_clicks: string;
			}>(
				`SELECT to_char(day, 'YYYY-MM-DD') AS day, recorded_attempts::text, filtered_clicks::text
				 FROM published.click_daily WHERE link_id = $1::uuid AND day BETWEEN $2::date AND $3::date`,
				[id, day(range.from), day(range.to)],
			),
			dependencies.analytics.query<{ last_commit_at: Date; last_lag_ms: string }>(
				"SELECT last_commit_at, last_lag_ms::text FROM published.click_pipeline",
			),
			dependencies.analytics.query<{ events: string }>(
				"SELECT events::text FROM published.click_quarantine_open WHERE link_id = $1::uuid OR link_id IS NULL",
				[id],
			),
			tier.breakdowns
				? dependencies.analytics.query<{
						dimension: string;
						value: string;
						recorded: string;
						filtered: string;
					}>(
						`SELECT dimension, value, sum(recorded_attempts)::text AS recorded, sum(filtered_clicks)::text AS filtered
						 FROM published.click_breakdowns WHERE link_id = $1::uuid AND day BETWEEN $2::date AND $3::date
						 GROUP BY dimension, value ORDER BY sum(filtered_clicks) DESC, sum(recorded_attempts) DESC, value`,
						[id, day(range.from), day(range.to)],
					)
				: Promise.resolve([]),
		]);
	} catch (error) {
		failure("analytics read", error);
		return unavailable("analytics_unavailable", "Analytics are unavailable; try again shortly.");
	}
	const counts = new Map(rows.map((row) => [row.day, row]));
	const series: Report["series"] = [];
	for (let at = range.from; at <= range.to; at += DAY_MS) {
		const row = counts.get(day(at));
		series.push({
			date: day(at),
			recordedAttempts: Number(row?.recorded_attempts ?? 0),
			filteredClicks: Number(row?.filtered_clicks ?? 0),
		});
	}
	const lagMs = pipeline ? Number(pipeline.last_lag_ms) : null;
	const delayed = lagMs !== null && lagMs > DELAYED_MS;
	const incident = open.some((row) => Number(row.events) > 0);
	return {
		linkId: id,
		range: { from: day(range.from), to: day(range.to) },
		totals: {
			recordedAttempts: series.reduce((sum, item) => sum + item.recordedAttempts, 0),
			filteredClicks: series.reduce((sum, item) => sum + item.filteredClicks, 0),
		},
		series,
		breakdowns: tier.breakdowns ? breakdownsOf(parts) : null,
		freshness: {
			asOf: pipeline ? pipeline.last_commit_at.toISOString() : null,
			delayed,
			lagMs,
		},
		reconciliation: { status: incident ? "incident" : delayed ? "delayed" : "ok" },
		filter: FILTER,
		// Older counts exist that this plan doesn't show.
		lookback: { maxDays: tier.lookbackDays, limitedByTier: created.getTime() < range.earliest },
		tier: { policy: tier.policy, breakdowns: tier.breakdowns },
	};
}

/** Breakdown rows as the three lists, each its top BREAKDOWN_TOP; '' (none recorded) is null. */
export function breakdownsOf(
	rows: readonly { dimension: string; value: string; recorded: string; filtered: string }[],
): Breakdowns {
	const out: Breakdowns = { device: [], country: [], referrerHost: [] };
	const lists: Record<string, BreakdownItem[]> = {
		device: out.device,
		country: out.country,
		referrer: out.referrerHost,
	};
	for (const row of rows) {
		const list = lists[row.dimension];
		if (!list || list.length >= BREAKDOWN_TOP) continue;
		list.push({
			value: row.value === "" ? null : row.value,
			recordedAttempts: Number(row.recorded),
			filteredClicks: Number(row.filtered),
		});
	}
	return out;
}

const isReport = (value: Report | ModuleResponse): value is Report => "linkId" in value;

export function analyticsRoutes(now: () => number = Date.now) {
	const routes = defineRoutes<AnalyticsDependencies>({
		"GET /links/:id/analytics": async (request, dependencies) => {
			const answer = await report(request, dependencies, now());
			return isReport(answer) ? { body: answer } : answer;
		},
		"GET /links/:id/analytics.csv": async (request, dependencies) => {
			const answer = await report(request, dependencies, now());
			if (!isReport(answer)) return answer;
			// A7: one of the month's exports, spent before the file is sent.
			if (dependencies.billingApi) {
				const authorization = request.headers.authorization;
				const spent = await spendExport(
					dependencies.billingApi,
					typeof authorization === "string" ? authorization : undefined,
					request.signal,
				);
				if (spent.kind === "refused") return { status: spent.status, body: spent.body };
				if (spent.kind === "unavailable")
					return unavailable(
						"billing_unavailable",
						"The export allowance could not be checked; try again.",
						2,
					);
			}
			const lines = [
				"date,recorded_attempts,filtered_clicks",
				...answer.series.map((item) =>
					[item.date, item.recordedAttempts, item.filteredClicks].map(csvCell).join(","),
				),
			];
			return {
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Content-Disposition": `attachment; filename="qrwty-${answer.linkId}-${answer.range.from}-${answer.range.to}.csv"`,
				},
				body: `${lines.join("\r\n")}\r\n`,
			};
		},
	});
	return async (
		request: ModuleRequest,
		dependencies: AnalyticsDependencies,
	): Promise<ModuleResponse> => {
		const response = await routes(request, dependencies);
		const body = response.body as { error?: unknown } | undefined;
		if (typeof body?.error !== "string") return response;
		return response.status === 404
			? notFound()
			: problem(response.status ?? 400, "invalid_request", "Invalid request.", false, {
					headers: response.headers?.Allow ? { Allow: String(response.headers.Allow) } : {},
				});
	};
}
