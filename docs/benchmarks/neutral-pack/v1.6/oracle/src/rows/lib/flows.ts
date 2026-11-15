// Shared row helpers over the external contract (http-contract.md).
// Durations and deadlines use the monotonic clock (performance.now); wall-clock time is kept
// only for timestamps that are recorded or compared with the arm's own clock (pack v1.4).
import { performance } from "node:perf_hooks";
import { replicasWithRole } from "../../adapter.ts";
import { Client, errorCode, type RequestOptions, type Response } from "../../client/client.ts";
import { type HeldConnection, openConnection, targetFromUrl } from "../../client/raw.ts";
import type { Api } from "../../client/session.ts";
import type { RowContext } from "../../context.ts";

export interface Link {
	id: string;
	shortUrl: string;
	slug: string;
	destination: string;
	version: number;
	state: string;
	expiresAt: string | null;
	owned?: boolean;
	claim?: { token: string; expiresAt: string };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG = /^[0-9A-Za-z]{10}$/;

export function slugOf(shortUrl: string): string {
	return new URL(shortUrl).pathname.slice(1);
}

export function asLink(response: Response): Link | null {
	const body = response.json as Record<string, unknown> | undefined;
	if (!body || typeof body.id !== "string" || typeof body.shortUrl !== "string") return null;
	return { ...(body as unknown as Link), slug: slugOf(body.shortUrl as string) };
}

/** Creates a guest link through a fresh actor; throws when the arm refuses. */
export async function createGuest(
	ctx: RowContext,
	destination: string,
	options: { api?: Api; expiresAt?: string } = {},
): Promise<{ api: Api; link: Link; response: Response }> {
	const api = options.api ?? ctx.api();
	const response = await api.createLink(destination, { expiresAt: options.expiresAt });
	const link = asLink(response);
	if (response.status !== 201 || !link) {
		throw new Error(
			`guest create of ${destination} returned ${response.status} ${errorCode(response) ?? ""}`,
		);
	}
	return { api, link, response };
}

export function redirectReplicaUrls(ctx: RowContext): { name: string; url: string }[] {
	return replicasWithRole(ctx.adapter, "redirect").map((r) => ({ name: r.name, url: r.url }));
}

/** GET/HEAD/... of `/{slug}` at a base URL with Host = public origin. No redirect following. */
export function hitSlug(
	ctx: RowContext,
	baseUrl: string,
	slug: string,
	method = "GET",
	options: RequestOptions & { userAgent?: string; query?: string } = {},
): Promise<Response> {
	const client = new Client(baseUrl, ctx.origin);
	const headers = { ...(options.headers ?? {}) };
	if (options.userAgent !== undefined) headers["User-Agent"] = options.userAgent;
	return client.request(method, `/${slug}${options.query ?? ""}`, {
		...options,
		headers,
		noCookies: true,
	});
}

export async function poll<T>(
	fn: () => Promise<T>,
	until: (value: T) => boolean,
	timeoutMs: number,
	intervalMs = 500,
): Promise<{ value: T; ok: boolean; elapsedMs: number }> {
	const start = performance.now();
	let value = await fn();
	while (!until(value) && performance.now() - start < timeoutMs) {
		await new Promise((r) => setTimeout(r, intervalMs));
		value = await fn();
	}
	return { value, ok: until(value), elapsedMs: performance.now() - start };
}

/**
 * Opens `n` connections to `baseUrl` and holds them idle (nothing sent). F06 measures memory
 * with them open, then sends one request on each (`hitSlug` option `held`), so the cost of the
 * sockets themselves is in the baseline.
 */
export async function holdConnections(
	baseUrl: string,
	n: number,
	batch = 250,
): Promise<HeldConnection[]> {
	const target = targetFromUrl(baseUrl);
	const settled: PromiseSettledResult<HeldConnection>[] = [];
	for (let i = 0; i < n; i += batch) {
		const size = Math.min(batch, n - i);
		settled.push(
			...(await Promise.allSettled(Array.from({ length: size }, () => openConnection(target)))),
		);
	}
	const held = settled
		.filter((r): r is PromiseFulfilledResult<HeldConnection> => r.status === "fulfilled")
		.map((r) => r.value);
	if (held.length < n) {
		for (const h of held) h.socket.destroy();
		const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
		throw new Error(
			`opened ${held.length} of ${n} idle connections: ${String(failed?.reason).slice(0, 200)}`,
		);
	}
	return held;
}

export function parallel<T>(n: number, fn: (i: number) => Promise<T>): Promise<T[]> {
	return Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
}

/** Short description of a response for `observed` fields (no bodies with secrets). */
export function brief(r: Response): Record<string, unknown> {
	return {
		status: r.status,
		code: errorCode(r) ?? null,
		location: r.header("location") ?? null,
		cacheControl: r.header("cache-control") ?? null,
		clickEvent: r.header("qrwty-click-event") ?? null,
		retryAfter: r.header("retry-after") ?? null,
	};
}

export function isError(r: Response, status: number, code?: string): boolean {
	return r.status === status && (code === undefined || errorCode(r) === code);
}

/** True when a text or JSON body mentions any of the given private values. */
export function leaks(r: Response, values: string[]): string[] {
	return values.filter((v) => v.length > 0 && r.text.includes(v));
}

export async function withFault<T>(
	ctx: RowContext,
	kind: "refuse" | "stall" | "latency" | "break",
	dependency: string,
	body: () => Promise<T>,
	options: { latencyMs?: number } = {},
): Promise<T> {
	const proxies = ctx.proxies(dependency);
	if (proxies.length === 0) throw new Error(`no Toxiproxy proxy is declared for ${dependency}`);
	const toxi = ctx.toxiproxy();
	await toxi.fault(kind, proxies, options);
	try {
		return await body();
	} finally {
		await toxi.restore(proxies);
	}
}

/** Subscribes `api` to the paid plan through the Stripe fixture and delivers the events. */
export async function subscribe(
	ctx: RowContext,
	api: Api,
): Promise<{ sessionId: string; subscriptionId: string }> {
	const checkout = await api.mutate(
		"POST",
		"/api/v1/billing/checkout",
		{ plan: "paid-monthly" },
		{ idempotencyKey: true },
	);
	const url = (checkout.json as { url?: string } | undefined)?.url;
	if (checkout.status !== 200 || !url) throw new Error(`checkout returned ${checkout.status}`);
	const sessionId = new URL(url).pathname.split("/").pop() ?? "";
	const stripe = ctx.stripe();
	const { subscription, events } = stripe.completeCheckout(sessionId);
	for (const event of events) await stripe.deliver(event);
	await poll(
		() => api.billing(),
		(r) => isPaid(r),
		30_000,
	);
	return { sessionId, subscriptionId: subscription.id };
}

/** Free or paid is read from `policy` (the frozen revision names of decisions §4). */
export const PAID_POLICY = "paid-test-v1";
export const FREE_POLICY = "free-test-v1";

export function isPaid(r: Response): boolean {
	return (r.json as { policy?: unknown } | undefined)?.policy === PAID_POLICY;
}

export function billingOf(r: Response): {
	tier?: string;
	policy?: string;
	subscription?: {
		status?: string;
		paidThrough?: string | null;
		graceUntil?: string | null;
		cancelAtPeriodEnd?: boolean;
	};
	usage?: {
		ownedLinkCreates?: { used: number; limit: number };
		csvExports?: { used: number; limit: number };
	};
} {
	return (r.json ?? {}) as ReturnType<typeof billingOf>;
}

/** Browser-facing API replicas (role `session`); the public entry when the arm lists none. */
export function apiReplicaUrls(ctx: RowContext): string[] {
	const urls = replicasWithRole(ctx.adapter, "session").map((r) => r.url);
	return urls.length > 0 ? urls : [ctx.adapter.publicEntry.url];
}

/** Every UI key a browser row needs must be in the frozen name list. */
export function missingNames(ctx: RowContext, keys: string[]): string[] {
	const names = ctx.uiNames;
	if (!names) return keys;
	return keys.filter((k) => !names[k]);
}

/** Deep equality of JSON values, independent of object key order. */
export function sameJson(a: unknown, b: unknown): boolean {
	const canonical = (v: unknown): unknown =>
		Array.isArray(v)
			? v.map(canonical)
			: v && typeof v === "object"
				? Object.fromEntries(
						Object.keys(v as object)
							.sort()
							.map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
					)
				: v;
	return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/**
 * Moves the test clock to `targetOffsetMs` in steps of at most 12 hours, touching each actor's
 * session at every step, so the 24-hour idle timeout does not end sessions the row still needs.
 */
export async function moveClockKeepingSessions(
	ctx: RowContext,
	targetOffsetMs: number,
	actors: Api[],
): Promise<void> {
	const step = 12 * 3_600_000;
	let current = ctx.clock.offsetMs;
	while (Math.abs(targetOffsetMs - current) > step) {
		current += Math.sign(targetOffsetMs - current) * step;
		await ctx.clock.set(current);
		for (const actor of actors) await actor.session();
	}
	await ctx.clock.set(targetOffsetMs);
}

export interface Observation {
	replica: string;
	/** Wall-clock send time: compared only with times the arm enforces (A08's expiresAt). */
	sentWallMs: number;
	/** Monotonic send time (performance.now): compared with the oracle's own instants (A07). */
	sentMono: number;
	status: number;
	location: string | null;
}

/**
 * GETs `/{slug}` on every redirect replica in a loop for `durationMs` (monotonic). Each
 * observation records the wall-clock and the monotonic send time.
 */
export async function watchSlug(
	ctx: RowContext,
	slug: string,
	durationMs: number,
	intervalMs = 250,
): Promise<Observation[]> {
	const replicas = redirectReplicaUrls(ctx);
	const out: Observation[] = [];
	const end = performance.now() + durationMs;
	await Promise.all(
		replicas.map(async (replica) => {
			while (performance.now() < end) {
				const sentWallMs = Date.now();
				const sentMono = performance.now();
				try {
					const r = await hitSlug(ctx, replica.url, slug, "GET", { timeoutMs: 10_000 });
					out.push({
						replica: replica.name,
						sentWallMs,
						sentMono,
						status: r.status,
						location: r.header("location") ?? null,
					});
				} catch {
					out.push({ replica: replica.name, sentWallMs, sentMono, status: 0, location: null });
				}
				await new Promise((r) => setTimeout(r, intervalMs));
			}
		}),
	);
	return out;
}

/**
 * Observations sent later than `deadlineMono` (a monotonic instant, performance.now) that still
 * show the old allowed result.
 */
export function lateOld(
	observations: Observation[],
	deadlineMono: number,
	isOld: (o: Observation) => boolean,
): Observation[] {
	return observations.filter((o) => o.sentMono > deadlineMono && isOld(o));
}

/** The last observation of each replica. */
export function lastPerReplica(observations: Observation[]): Observation[] {
	const last = new Map<string, Observation>();
	for (const o of observations) last.set(o.replica, o);
	return [...last.values()];
}

export async function operatorBlock(
	ctx: RowContext,
	linkId: string,
	reason: string,
	unblock = false,
): Promise<import("../../client/client.ts").Response> {
	const operator = await ctx.signedIn("operator");
	return operator.mutate(
		"POST",
		`/api/v1/operator/links/${encodeURIComponent(linkId)}/${unblock ? "unblock" : "block"}`,
		{ reason },
		{ idempotencyKey: false },
	);
}

/**
 * Runs the adapter's productionProfileCheck for one process and forbidden setting. The command
 * exits 0 when the check ran and prints {"refused": bool, "reason": "<named reason>"}.
 */
export async function profileCheck(
	ctx: RowContext,
	process: string,
	setting: { category: string; name: string },
): Promise<{
	refused: boolean;
	reason: string | null;
	exitCode: number | null;
	process: string;
	setting: string;
}> {
	const spec = ctx.adapter.productionProfileCheck;
	if (!spec) throw new Error("adapter has no productionProfileCheck");
	const { runSpec } = await import("../../faults/commands.ts");
	const out = await runSpec("productionProfileCheck", spec.command, ctx.run.loaded.baseDir, {
		process,
		setting: setting.name,
		category: setting.category,
	});
	ctx.commands.log.push(out);
	const json = (out.json ?? {}) as { refused?: unknown; reason?: unknown };
	const reason = typeof json.reason === "string" && json.reason.trim() ? json.reason : null;
	return {
		refused: out.exitCode === 0 && json.refused === true && !!reason,
		reason,
		exitCode: out.exitCode,
		process,
		setting: setting.name,
	};
}
