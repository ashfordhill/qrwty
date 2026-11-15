// Guest admission (Q09, decisions §3 and §4): an approximate, distributed and bounded limit per
// admission key, kept in Link API's Admission cache (Valkey). The key is Session API's keyed hash of
// the client address (IPv4 /32, IPv6 /64; never the address itself), or `unverified` for every
// request that reached Session API without the Worker's signed address.
//
// The generated cache client has only get, set and delete: no INCR, SET NX or script (A-found gap
// AG-31), so no copy can count atomically in Valkey. Instead each Link API copy (a random tag per
// process) counts its own admissions exactly in memory and is the only writer of its own count,
//   adm:v1:<policy>:<key>:<tag> = "<window start ms>:<count>"
// and the copies that count a key list their tags in its directory, adm:v1:<policy>:<key>. A request
// reads the directory, raises its copy's count (an intent, written before anything is read), reads
// the other copies' counts, and is admitted while the sum is within the limit; otherwise its intent
// is taken back. The commands go in that order on the one cache connection, so once copies know
// each other the limit holds across them. Two copies that start counting a key at the same moment
// may miss each other until one lists itself again (next request): then each copy still admits at
// most the limit, so the worst case is copies x limit; when the cache is unavailable each copy
// limits alone the same way. A copy's window starts at its first admission for the key and lasts
// the policy's window; every value expires with it (decisions §3: within 24 hours).
import { randomBytes } from "node:crypto";
import type { CacheClient } from "../../dependencies.ts";

export type Policy = { readonly name: string; readonly limit: number; readonly windowMs: number };

/** decisions §4: 10 guest creations per 60 seconds per admission key, then 429 with Retry-After. */
export const GUEST_CREATE: Policy = Object.freeze({
	name: "guest-admission-test-v1",
	limit: 10,
	windowMs: 60_000,
});
/** Public abuse reports (http-contract §8, "429 when limited"): 5 per 10 minutes per key. */
export const ABUSE_REPORT: Policy = Object.freeze({
	name: "abuse-report-v1",
	limit: 5,
	windowMs: 600_000,
});

/** Session API's header: the admission key of the request's client. */
export const ADMISSION_KEY_HEADER = "qrwty-admission-key";
/** The one key shared by every request whose client address wasn't verified. */
export const UNVERIFIED = "unverified";
const KEY = /^[A-Za-z0-9_-]{43}$/;
const TAG = /^[A-Za-z0-9_-]{1,16}$/;

/** The admission key a request carries: Session API's keyed hash, else the shared `unverified`. */
export function admissionKey(headers: Record<string, string | string[] | undefined>): string {
	const value = headers[ADMISSION_KEY_HEADER];
	return typeof value === "string" && KEY.test(value) ? value : UNVERIFIED;
}

export type Decision = { admitted: true } | { admitted: false; retryAfterSeconds: number };
export type Admission = (cache: CacheClient, policy: Policy, key: string) => Promise<Decision>;

const MAX_TAGS = 16;
const SKEW_MS = 5_000;

/** A directory as stored: its tags, or none when it is absent or not one (it is then rewritten). */
function parseTags(text: string | undefined): string[] {
	if (!text || text.length > 1024) return [];
	try {
		const value = JSON.parse(text) as unknown;
		return Array.isArray(value)
			? value.filter((tag): tag is string => typeof tag === "string" && TAG.test(tag)).slice(-MAX_TAGS)
			: [];
	} catch {
		return [];
	}
}

/** A copy's count as stored: its window start and count, or undefined. */
function parseCount(text: string | undefined, limit: number) {
	const m = /^([0-9]{1,15}):([0-9]{1,6})$/.exec(text ?? "");
	if (!m) return undefined;
	const count = Math.min(Number(m[2]), limit + 1);
	return count > 0 ? { s: Number(m[1]), n: count } : undefined;
}

/**
 * One process's admission: its tag, its exact local counts (at most `maxKeys` keys, the oldest
 * forgotten first) and the clock. `onFailure` hears a cache failure (the process's failure log,
 * which writes at most one line a second).
 */
export function createAdmission(
	options: {
		tag?: string;
		now?: () => number;
		maxKeys?: number;
		onFailure?: (error: unknown) => void;
	} = {},
): Admission {
	const tag = options.tag ?? randomBytes(9).toString("base64url");
	if (!TAG.test(tag)) throw new Error("Invalid admission tag");
	const now = options.now ?? Date.now;
	const maxKeys = options.maxKeys ?? 20_000;
	const local = new Map<string, { s: number; n: number }>();

	const remember = (name: string, entry: { s: number; n: number }) => {
		local.delete(name);
		local.set(name, entry);
		while (local.size > maxKeys) {
			const oldest = local.keys().next().value;
			if (oldest === undefined) break;
			local.delete(oldest);
		}
	};

	return async (cache, policy, key) => {
		const name = `adm:v1:${policy.name}:${key}`;
		const countKey = (t: string) => `${name}:${t}`;
		let tags: string[] = [];
		let cacheUp = true;
		try {
			tags = parseTags(await cache.get(name));
		} catch (error) {
			cacheUp = false;
			options.onFailure?.(error);
		}
		// The intent, taken synchronously, so concurrent requests of this copy count each other.
		const at = now();
		const live = (start: number) => at < start + policy.windowMs && at >= start - SKEW_MS;
		const current = local.get(name);
		const entry = current && live(current.s) ? current : { s: at, n: 0 };
		entry.n += 1;
		remember(name, entry);
		const seconds = (end: number) => Math.max(1, Math.ceil((end - at) / 1000));
		const ttl = seconds(entry.s + policy.windowMs) + 2;
		const refuse = (end: number): Decision => {
			entry.n = Math.max(0, entry.n - 1);
			if (cacheUp)
				cache
					.set(countKey(tag), `${entry.s}:${entry.n}`, ttl)
					.catch((error: unknown) => options.onFailure?.(error));
			return { admitted: false, retryAfterSeconds: seconds(end) };
		};
		if (entry.n > policy.limit) return refuse(entry.s + policy.windowMs);
		if (!cacheUp) return { admitted: true };

		// In this order on the connection: this copy's count, its listing, then the others' counts.
		const others = tags.filter((t) => t !== tag);
		const writes: Promise<unknown>[] = [cache.set(countKey(tag), `${entry.s}:${entry.n}`, ttl)];
		if (others.length === tags.length || entry.n === 1)
			writes.push(
				cache.set(
					name,
					JSON.stringify([...others.slice(-(MAX_TAGS - 1)), tag]),
					seconds(at + policy.windowMs) + 5,
				),
			);
		const reads = others.map((t) => cache.get(countKey(t)));
		const settled = await Promise.allSettled([...writes, ...reads]);
		const failed = settled.find((result) => result.status === "rejected");
		if (failed?.status === "rejected") {
			options.onFailure?.(failed.reason);
			return { admitted: true };
		}
		let total = entry.n;
		let firstEnd = entry.s + policy.windowMs;
		for (const result of settled.slice(writes.length)) {
			const count = parseCount(
				(result as PromiseFulfilledResult<string | undefined>).value,
				policy.limit,
			);
			if (!count || !live(count.s)) continue;
			total += count.n;
			firstEnd = Math.min(firstEnd, count.s + policy.windowMs);
		}
		return total > policy.limit ? refuse(firstEnd) : { admitted: true };
	};
}

/** This process's admission (one per Link API copy, shared by its two modules). */
let processAdmission: Admission | undefined;
export function sharedAdmission(onFailure: (error: unknown) => void): Admission {
	processAdmission ??= createAdmission({ onFailure });
	return processAdmission;
}
