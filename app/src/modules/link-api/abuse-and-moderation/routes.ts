// Abuse and moderation's routes below /modules/link-api-abuse-and-moderation (Q09; http-contract
// §8). Session API forwards the public paths here; Link API is internal.
//   POST /reports                          {shortUrl, reason, details?}  202 {received: true}
//   GET  /operator/links/by-slug/:slug     operator only: the link, its reports, its last actions
//   POST /operator/links/:id/block         {reason}  operator only: 200 the link, now blocked
//   POST /operator/links/:id/unblock       {reason}  operator only: 200 the link, as before the block
// A report is bounded (ABUSE_REPORT per admission key; 200 reporter rows per link; details at most
// 1,000 characters) and never changes a link. An unknown or deleted link's report is 202 and
// stored nowhere. Anyone but an operator gets 404 on the operator routes (operator.ts). A block or
// unblock is one SQL call (the module's product SQL): the link's state and version, its version row
// and the operator action (actor, reason, time) commit together. The Redirect service keeps a route
// at most 30 s past its read (A4), so a block answers 403 everywhere within 30 s of the commit.
// Reports and actions are kept 13 months (decisions §3), purged in bounded batches as new ones come.
import { createHash } from "node:crypto";
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import { defineRoutes } from "../../entry.ts";
import type { Dependencies } from "../link-api-abuse-and-moderation.slots.ts";
import { notFound, problem, unavailable } from "../link-operations/contract.ts";
import { type LinkRow, linkView } from "../link-operations/view.ts";
import { ABUSE_REPORT, type Admission, admissionKey } from "./admission.ts";
import { type Operator, operatorOf } from "./operator.ts";

const SCHEMA = "m_link_api_abuse_and_moderation";
const REASONS = new Set(["phishing", "malware", "spam", "other"]);
const SLUG = /^[0-9A-Za-z]{10}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// C0 and C1 controls but tab and line breaks, which a report's details may hold.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;

export type ModerationContext = {
	origin: URL;
	subjects: ReadonlySet<string>;
	operatorKey: Uint8Array | undefined;
	admission: Admission;
	onFailure: (what: string, error: unknown) => void;
};

const invalid = (message: string) => problem(400, "invalid_request", message, false);
const fields = (body: unknown): Record<string, unknown> | undefined =>
	body !== null && typeof body === "object" && !Array.isArray(body)
		? (body as Record<string, unknown>)
		: undefined;

/** The slug of a short URL on the public origin (or a bare slug), else undefined. */
export function reportedSlug(value: string, origin: URL): string | undefined {
	if (SLUG.test(value)) return value;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return undefined;
	}
	if (url.host.toLowerCase() !== origin.host.toLowerCase()) return undefined;
	const slug = url.pathname.slice(1);
	return SLUG.test(slug) ? slug : undefined;
}

type OperatorRow = LinkRow & {
	owned: boolean;
	reports: string | number | null;
	last_report_at: Date | null;
	report_reasons: Record<string, number> | null;
	actions: { action: string; actor: string; reason: string; at: string }[] | null;
};
type ModerateRow = LinkRow & { outcome: string; owned: boolean | null };

export function moderationRoutes(context: ModerationContext) {
	/** The operator, or the 404 everyone else gets. */
	const operator = (request: ModuleRequest, reason: string): Operator | ModuleResponse => {
		const path = request.rawPath.replace(/^\/operator/, "");
		return (
			operatorOf(request, path, reason, {
				subjects: context.subjects,
				key: context.operatorKey,
			}) ?? notFound()
		);
	};
	const isAnswer = (value: Operator | ModuleResponse): value is ModuleResponse =>
		!("actor" in value);

	const moderate =
		(action: "block" | "unblock") =>
		async (
			request: ModuleRequest & { params: Record<string, string> },
			dependencies: Dependencies,
		): Promise<ModuleResponse> => {
			const body = fields(request.body);
			const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;
			const who = operator(request, typeof body?.reason === "string" ? body.reason : "");
			if (isAnswer(who)) return who;
			const id = request.params.id ?? "";
			if (!UUID.test(id)) return notFound();
			if (reason === undefined || reason.length < 1 || reason.length > 500 || CONTROL.test(reason))
				return invalid("Send a reason of 1 to 500 characters.");
			let row: ModerateRow | undefined;
			try {
				[row] = await dependencies.links.query<ModerateRow>(
					`SELECT * FROM ${SCHEMA}.moderate_link($1::uuid, $2, $3, $4, $5)`,
					[id, action, who.actor, reason, who.requestId],
				);
			} catch (error) {
				context.onFailure(`operator ${action}`, error);
				return unavailable("storage_unavailable", "Links are unavailable; try again.");
			}
			switch (row?.outcome) {
				case "changed":
				case "unchanged":
					return {
						status: 200,
						headers: { ETag: `"${row.version}"` },
						body: {
							...linkView(row, context.origin),
							owned: row.owned === true,
							changed: row.outcome === "changed",
						},
					};
				case "deleted":
					return problem(409, "link_deleted", "The link is deleted (a permanent tombstone).", false);
				case "replayed":
					return problem(409, "replayed", "This signed request was already used.", false);
				default:
					return notFound();
			}
		};

	return defineRoutes<Dependencies>({
		"POST /reports": async (request, dependencies) => {
			const body = fields(request.body);
			if (!body) return invalid("The body must be a JSON object.");
			const { shortUrl, reason, details } = body;
			if (Object.keys(body).some((name) => !["shortUrl", "reason", "details"].includes(name)))
				return invalid("Only shortUrl, reason and details may be sent.");
			if (typeof shortUrl !== "string" || shortUrl.length < 1 || shortUrl.length > 2048)
				return invalid("shortUrl must be the short link.");
			if (typeof reason !== "string" || !REASONS.has(reason))
				return invalid("reason must be phishing, malware, spam or other.");
			if (
				details !== undefined &&
				details !== null &&
				(typeof details !== "string" || [...details].length > 1000 || CONTROL.test(details))
			)
				return invalid("details must be text of at most 1,000 characters.");
			const key = admissionKey(request.headers);
			const decision = await context.admission(dependencies.admissionCache, ABUSE_REPORT, key);
			if (!decision.admitted)
				return problem(429, "rate_limited", "Too many reports from this network; try again later.", true, {
					retryAfterSeconds: decision.retryAfterSeconds,
				});
			const slug = reportedSlug(shortUrl.trim(), context.origin);
			if (slug !== undefined) {
				const reporter = createHash("sha256").update(`reporter\u0000${key}`).digest();
				try {
					await dependencies.links.query(`SELECT ${SCHEMA}.record_report($1, $2, $3, $4)`, [
						slug,
						reason,
						typeof details === "string" && details.trim() ? details.trim() : null,
						reporter,
					]);
				} catch (error) {
					context.onFailure("abuse report", error);
					return unavailable("storage_unavailable", "Reports are unavailable; try again.");
				}
			}
			return { status: 202, body: { received: true } };
		},
		"GET /operator/links/by-slug/:slug": async (request, dependencies) => {
			const who = operator(request, "");
			if (isAnswer(who)) return who;
			const slug = request.params.slug ?? "";
			if (!SLUG.test(slug)) return notFound();
			let row: OperatorRow | undefined;
			try {
				[row] = await dependencies.links.query<OperatorRow>(
					`SELECT * FROM ${SCHEMA}.operator_link($1)`,
					[slug],
				);
			} catch (error) {
				context.onFailure("operator lookup", error);
				return unavailable("storage_unavailable", "Links are unavailable; try again.");
			}
			if (!row) return notFound();
			return {
				status: 200,
				body: {
					...linkView(row, context.origin),
					state: row.state,
					slug: row.slug,
					owned: row.owned,
					reports: {
						total: Number(row.reports ?? 0),
						lastAt: row.last_report_at?.toISOString() ?? null,
						byReason: row.report_reasons ?? {},
					},
					actions: row.actions ?? [],
				},
			};
		},
		"POST /operator/links/:id/block": moderate("block"),
		"POST /operator/links/:id/unblock": moderate("unblock"),
	});
}
