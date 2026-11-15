// The public redirect (http-contract §5, durable-clicks), below
// /modules/redirect-service-resolve-and-redirect, where the qrwty.io Worker sends GET and HEAD
// /<slug> with the public host in X-Forwarded-Host. No session, identity or payment dependency.
//   1. host: the public origin's only (decisions: one domain, `primary`), else 404; slug: 10 base62
//      characters, else 404; GET and HEAD only, else 405 `Allow: GET, HEAD`;
//   2. route: Hot routes when its entry is still valid (an absolute `validatedUntil` at most 30 s
//      after the authoritative read, which no copy extends; no negative caching), else Links'
//      routing view `published.link_routes`, one read per slug per process at a time (miss
//      coalescing), at most MAX_READS in flight (admission); unavailable with no valid entry: 503;
//   3. state and expiry: unknown 404, disabled, deleted or expired 410, blocked 403;
//   4. GET only: a click event with a server-made ID, published to Click events and awaited; a
//      rejected, timed-out or unknown ACK is 503 with no Location (it carries the event ID, since
//      the event may be stored); HEAD answers as GET would, with no event;
//   5. after the ACK, expiry and the route's validity are checked again (410 or 503, with the
//      event's ID); only then 302 with the saved Location and `QRWTY-Click-Event`.
// Every answer is `no-store` (the generated HTTP service sets it). Errors are short HTML pages.
//
// Time budget. The diagram's Request timeout is 1000 ms, and the generated clients' own bounds are
// longer (publish 2000 ms, database statement and connection 2000 ms; A-found gap AG-26), so the
// stub bounds each call itself: the route read LOOKUP_MS, the publish PUBLISH_MS, the whole answer
// BUDGET_MS. The stub, not the admission's 503 DEADLINE (JSON, no event ID), always answers.

import { randomUUID } from "node:crypto";
import type { CacheClient, DatabaseReader, QueuePublisher } from "../../dependencies.ts";
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import { deviceClass, encodeClick, referrerHost, UUID } from "./click-event.ts";

export const SLUG = /^[0-9A-Za-z]{10}$/;
/** decisions §3: a cached route is valid at most 30 s after its authoritative read. */
export const VALIDITY_MS = 30_000;
export const BUDGET_MS = 850;
export const LOOKUP_MS = 400;
export const PUBLISH_MS = 500;
export const MAX_READS = 16;
export const RETRY_AFTER_SECONDS = 2;
export const CLICK_HEADER = "QRWTY-Click-Event";

export type Route = {
	linkId: string;
	state: "active" | "disabled" | "blocked" | "deleted";
	version: number;
	expiresAt: number | null;
	destination: string | null;
	validatedUntil: number;
};

export type RedirectDependencies = {
	links: DatabaseReader;
	hotRoutes: CacheClient;
	clickEvents: QueuePublisher;
	/** QRWTY_PUBLIC_ORIGIN_URL: the only host that redirects. */
	origin: URL;
	now?: () => number;
	newEventId?: () => string;
	onFailure?: (what: string, error: unknown) => void;
};

const STATES = new Set(["active", "disabled", "blocked", "deleted"]);
const one = (value: string | string[] | undefined) =>
	typeof value === "string" ? value : undefined;

/** `work`, or a rejection once `ms` pass (`work` itself goes on behind it). */
function within<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
	if (ms <= 0) return Promise.reject(new Error(`${what} (no time left)`));
	let timer: ReturnType<typeof setTimeout> | undefined;
	return Promise.race([
		work,
		new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error(`${what} (${ms} ms)`)), ms);
		}),
	]).finally(() => clearTimeout(timer));
}

const PAGE_STYLE =
	"body{font:16px/1.5 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;padding:0 16px}main{max-width:32rem;text-align:center}";

function page(
	status: number,
	title: string,
	text: string,
	head: boolean,
	headers: Record<string, string> = {},
): ModuleResponse {
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} · QRWTY</title><style>${PAGE_STYLE}</style></head><body><main><h1>${title}</h1><p>${text}</p></main></body></html>\n`;
	return {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8", ...headers },
		body: head ? undefined : html,
	};
}

const notFound = (head: boolean) => page(404, "Not found", "This short link doesn't exist.", head);
const gone = (head: boolean, headers?: Record<string, string>) =>
	page(410, "Link unavailable", "This short link is no longer active.", head, headers);
const blocked = (head: boolean, headers?: Record<string, string>) =>
	page(
		403,
		"Link blocked",
		"This short link was blocked for safety. Its destination isn't shown.",
		head,
		headers,
	);
const busy = (head: boolean, eventId?: string) =>
	page(503, "Try again", "This short link can't be followed right now. Try again shortly.", head, {
		"Retry-After": String(RETRY_AFTER_SECONDS),
		...(eventId ? { [CLICK_HEADER]: eventId } : {}),
	});

/** The answer a route refuses with at `at`, or undefined when it redirects. */
function refusal(route: Route, at: number, head: boolean, headers?: Record<string, string>) {
	if (route.state === "blocked") return blocked(head, headers);
	if (route.state !== "active" || route.destination === null) return gone(head, headers);
	if (route.expiresAt !== null && route.expiresAt <= at) return gone(head, headers);
	return undefined;
}

/** A cached entry, or undefined when it is missing, malformed or past its deadline. */
export function cachedRoute(text: string | undefined, at: number): Route | undefined {
	if (text === undefined) return undefined;
	let value: Partial<Route>;
	try {
		value = JSON.parse(text) as Partial<Route>;
	} catch {
		return undefined;
	}
	if (
		typeof value !== "object" ||
		value === null ||
		typeof value.linkId !== "string" ||
		!UUID.test(value.linkId) ||
		!STATES.has(value.state as string) ||
		!Number.isSafeInteger(value.version) ||
		!(value.expiresAt === null || Number.isSafeInteger(value.expiresAt)) ||
		!(value.destination === null || typeof value.destination === "string") ||
		!Number.isSafeInteger(value.validatedUntil) ||
		(value.validatedUntil as number) <= at ||
		(value.validatedUntil as number) > at + VALIDITY_MS
	)
		return undefined;
	return value as Route;
}

type RouteRow = {
	link_id: string;
	state: Route["state"];
	version: number;
	expires_at: Date | null;
	destination: string | null;
};

/** The redirect, with its own cache-fill coalescing and admission (per process). */
export function redirects(dependencies: RedirectDependencies) {
	const now = dependencies.now ?? Date.now;
	const newEventId = dependencies.newEventId ?? randomUUID;
	const failed = dependencies.onFailure ?? (() => {});
	const host = dependencies.origin.host.toLowerCase();
	const reads = new Map<string, Promise<Route | null>>();

	async function read(key: string, slug: string): Promise<Route | null> {
		const readAt = now();
		const [row] = await dependencies.links.query<RouteRow>(
			"SELECT link_id, state, version, expires_at, destination FROM published.link_routes WHERE domain_id = 1 AND slug = $1",
			[slug],
		);
		if (!row) return null;
		const route: Route = {
			linkId: row.link_id,
			state: row.state,
			version: row.version,
			expiresAt: row.expires_at === null ? null : row.expires_at.getTime(),
			destination: row.destination,
			validatedUntil: readAt + VALIDITY_MS,
		};
		// The entry keeps its own deadline: a slower, older fill landing after a newer one can't
		// make the old state live past its read + 30 s (the cache has no compare-and-set, AG-28).
		const seconds = Math.ceil((route.validatedUntil - now()) / 1000);
		if (seconds > 0)
			dependencies.hotRoutes
				.set(key, JSON.stringify(route), seconds)
				.catch((error: unknown) => failed("hot routes fill", error));
		return route;
	}

	async function lookup(slug: string, started: number): Promise<Route | null> {
		const key = `qrwty:route:v1:${host}:${slug}`;
		let text: string | undefined;
		try {
			text = await dependencies.hotRoutes.get(key);
		} catch (error) {
			failed("hot routes read", error);
		}
		const cached = cachedRoute(text, now());
		if (cached) return cached;
		let pending = reads.get(key);
		if (!pending) {
			if (reads.size >= MAX_READS) throw new Error("Route reads at capacity");
			pending = read(key, slug).finally(() => reads.delete(key));
			// A read no one waits for any longer still settles here, never unhandled.
			pending.catch(() => {});
			reads.set(key, pending);
		}
		return within(
			pending,
			Math.min(LOOKUP_MS, BUDGET_MS - (now() - started)),
			"Route read deadline",
		);
	}

	return async function redirect(request: ModuleRequest): Promise<ModuleResponse> {
		const started = now();
		const head = request.method === "HEAD";
		if (request.method !== "GET" && !head)
			return page(405, "Method not allowed", "Short links answer GET and HEAD.", false, {
				Allow: "GET, HEAD",
			});
		const asked = (one(request.headers["x-forwarded-host"]) ?? one(request.headers.host) ?? "")
			.trim()
			.toLowerCase();
		const slug = request.rawPath.slice(1);
		if (asked !== host || !SLUG.test(slug)) return notFound(head);

		let route: Route | null;
		try {
			route = await lookup(slug, started);
		} catch (error) {
			failed("route lookup", error);
			return busy(head);
		}
		if (route === null) return notFound(head);
		const refused = refusal(route, now(), head);
		if (refused) return refused;
		if (head) return { status: 302, headers: { Location: route.destination as string } };

		const eventId = newEventId();
		const event = encodeClick({
			schemaVersion: 1,
			eventId,
			linkId: route.linkId,
			eventTime: new Date(now()).toISOString(),
			synthetic: false, // QRWTY-Synthetic is honoured only from an authenticated edge: none yet
			deviceClass: deviceClass(one(request.headers["user-agent"])),
			country: null, // only from an authenticated edge: none yet
			referrerHost: referrerHost(one(request.headers.referer)),
		});
		// The deadline is fixed before the publish starts; with no time left, nothing is published.
		const deadline = Math.min(PUBLISH_MS, BUDGET_MS - (now() - started));
		if (deadline <= 0) return busy(false);
		try {
			await within(
				dependencies.clickEvents.publish(event, { messageId: eventId }),
				deadline,
				"Click publish deadline",
			);
		} catch (error) {
			failed("click publish", error);
			return busy(false, eventId);
		}
		const after = now();
		const late = refusal(route, after, false, { [CLICK_HEADER]: eventId });
		if (late) return late;
		if (after >= route.validatedUntil) return busy(false, eventId);
		return {
			status: 302,
			headers: { Location: route.destination as string, [CLICK_HEADER]: eventId },
		};
	};
}
