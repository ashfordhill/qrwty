// Slugs (decisions §3): 10 base62 characters from a CSPRNG, about 60 bits; never a reserved path.
import { randomBytes } from "node:crypto";

export const SLUG_LENGTH = 10;
export const SLUG_PATTERN = /^[0-9A-Za-z]{10}$/;
/** At most this many retries after a collision, then 503 slug_allocation_failed. */
export const MAX_COLLISION_RETRIES = 5;

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** Bytes at or above 248 (= 4 × 62) are discarded so every character is equally likely. */
const UNBIASED_LIMIT = 248;

/** First path segments the application owns (http-contract §1); compared case-insensitively. */
export const RESERVED_PATHS = [
	"api",
	"auth",
	"assets",
	"static",
	"app",
	"account",
	"pricing",
	"billing",
	"login",
	"logout",
	"healthz",
	"readyz",
	".well-known",
	"favicon.ico",
	"robots.txt",
] as const;

export function isReservedSlug(slug: string): boolean {
	return (RESERVED_PATHS as readonly string[]).includes(slug.toLowerCase());
}

/** One random slug. `random` is the CSPRNG (injectable for tests only). */
export function randomSlug(random: (size: number) => Uint8Array = randomBytes): string {
	let slug = "";
	while (slug.length < SLUG_LENGTH) {
		for (const byte of random(16)) {
			if (byte >= UNBIASED_LIMIT) continue;
			slug += ALPHABET[byte % ALPHABET.length];
			if (slug.length === SLUG_LENGTH) break;
		}
	}
	return slug;
}

/**
 * The candidates for one create, at most 1 + MAX_COLLISION_RETRIES: random slugs, never a
 * reserved one, after any slugs a test-profile fault point forces first.
 */
export function* slugCandidates(
	forced: readonly string[] = [],
	random: (size: number) => Uint8Array = randomBytes,
): Generator<string> {
	let given = 0;
	for (const slug of forced) {
		if (given > MAX_COLLISION_RETRIES) return;
		given++;
		yield slug;
	}
	while (given <= MAX_COLLISION_RETRIES) {
		const slug = randomSlug(random);
		if (isReservedSlug(slug)) continue;
		given++;
		yield slug;
	}
}
