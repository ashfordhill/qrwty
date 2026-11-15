// Account API's Link analytics (Q10, A4), below /modules/account-api-link-analytics, where Session
// API forwards the owner's `GET /api/v1/links/{id}/analytics` and `.../analytics.csv`
// (http-contract §7). The guard is Required, so every caller is a verified subject; ownership is
// checked in Links' account view (published.owned_links) by that subject's owner key, and another
// account's link or an unknown ID is 404. Counts come from Analytics' published views.
//   GET /links/:id/analytics?from&to       counts, series, freshness, reconciliation, filter
//   GET /links/:id/analytics.csv?from&to   date,recorded_attempts,filtered_clicks
// The tier is free-test-v1's for every account (7-day lookback, no breakdowns) until A7's
// entitlements; the CSV export allowance is not metered until then either.

import { createFailureLog } from "../../../runtime/tile-process.ts";
import type { DatabaseReader } from "../../dependencies.ts";
import { defineRoutes, type ModuleRequest, type ModuleResponse } from "../../entry.ts";
import { notFound, problem, unavailable } from "../../link-api/link-operations/contract.ts";
import { ownerKey } from "../../link-api/link-operations/view.ts";
import { FILTER_V1_BOT, UUID } from "../../redirect-service/redirect/click-event.ts";

export const TIER = { policy: "free-test-v1", lookbackDays: 7, breakdowns: false } as const;
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

export type AnalyticsDependencies = { links: DatabaseReader; analytics: DatabaseReader };

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
): { from: number; to: number; earliest: number } | ModuleResponse {
	const today = Date.parse(`${day(now)}T00:00:00.000Z`);
	const earliest = today - (TIER.lookbackDays - 1) * DAY_MS;
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
		return problem(
			403,
			"tier_restricted",
			`This plan shows the last ${TIER.lookbackDays} days.`,
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

type Report = {
	linkId: string;
	range: { from: string; to: string };
	totals: { recordedAttempts: number; filteredClicks: number };
	series: { date: string; recordedAttempts: number; filteredClicks: number }[];
	breakdowns: null;
	freshness: { asOf: string | null; delayed: boolean; lagMs: number | null };
	reconciliation: { status: "ok" | "delayed" | "incident" };
	filter: typeof FILTER;
	lookback: { maxDays: number; limitedByTier: boolean };
};

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
	const range = analyticsRange(request.query, now);
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
	try {
		[rows, [pipeline], open] = await Promise.all([
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
		breakdowns: null,
		freshness: {
			asOf: pipeline ? pipeline.last_commit_at.toISOString() : null,
			delayed,
			lagMs,
		},
		reconciliation: { status: incident ? "incident" : delayed ? "delayed" : "ok" },
		filter: FILTER,
		// Older counts exist that this plan doesn't show.
		lookback: { maxDays: TIER.lookbackDays, limitedByTier: created.getTime() < range.earliest },
	};
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
