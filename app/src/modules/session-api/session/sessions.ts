// Who the browser is (http-contract §3): no session cookie, a guest, an account session, or a
// cookie that is invalid, expired or revoked, which is refused (401) and never treated as a guest.
// An account session's access token is refreshed at the issuer shortly before it expires; when the
// issuer refuses the refresh token the session ends.

import type { KeyRing } from "../../../runtime/settings.ts";
import { createFailureLog } from "../../../runtime/tile-process.ts";
import {
	type CookieSession,
	parseSessionCookie,
	readCookie,
	SESSION_ABSOLUTE_SECONDS,
	SESSION_COOKIE,
	SESSION_IDLE_SECONDS,
} from "./cookies.ts";
import { seal, sha256, unseal } from "./crypto.ts";
import { GrantRefused, type OidcClient } from "./oidc.ts";
import type { SessionStore } from "./store.ts";

/** What a session's sealed blob holds: the tokens and the profile shown to its own browser. */
export type SealedTokens = {
	subject: string;
	access: string;
	refresh: string | null;
	email: string | null;
	name: string | null;
};
export type Browser =
	| { kind: "none" }
	| { kind: "refused"; code: "unauthenticated" | "session_expired" }
	| { kind: "guest"; cookie: CookieSession & { kind: "guest" } }
	| {
			kind: "account";
			cookie: CookieSession & { kind: "account" };
			id: Buffer;
			subjectKey: Buffer;
			tokens: SealedTokens;
			generation: number;
			accessExpiresAt: Date;
	  };

const failure = createFailureLog("session-api");
const aad = (id: Buffer) => `qrwty:session-tokens:v1:${id.toString("hex")}`;
export const sealTokens = (ring: KeyRing, id: Buffer, tokens: SealedTokens) =>
	seal(ring, JSON.stringify(tokens), aad(id));
export const openTokens = (ring: KeyRing, id: Buffer, sealed: Uint8Array) => {
	const text = sealed.length ? unseal(ring, sealed, aad(id)) : undefined;
	return text === undefined ? undefined : (JSON.parse(text) as SealedTokens);
};
export const sessionId = (cookie: CookieSession & { kind: "account" }) => sha256(cookie.token);
export const ABSOLUTE_SECONDS = SESSION_ABSOLUTE_SECONDS;

/** Refresh when the access token has less than this left. */
const REFRESH_MARGIN_MS = 60_000;

export async function identify(
	ring: KeyRing,
	store: SessionStore,
	headers: Record<string, string | string[] | undefined>,
	now = Date.now(),
): Promise<Browser> {
	const value = readCookie(headers.cookie, SESSION_COOKIE);
	if (value === undefined) return { kind: "none" };
	const cookie = parseSessionCookie(ring, value);
	if (!cookie) return { kind: "refused", code: "unauthenticated" };
	if (cookie.kind === "guest") {
		if (
			cookie.issuedAt * 1000 + SESSION_ABSOLUTE_SECONDS * 1000 <= now ||
			cookie.issuedAt * 1000 > now + 60_000
		)
			return { kind: "refused", code: "session_expired" };
		return { kind: "guest", cookie };
	}
	const id = sessionId(cookie);
	const row = await store.useSession(id, SESSION_IDLE_SECONDS);
	if (row.status !== "active")
		return {
			kind: "refused",
			code: row.status === "unknown" ? "unauthenticated" : "session_expired",
		};
	const tokens = openTokens(ring, id, row.tokens_sealed);
	if (!tokens) return { kind: "refused", code: "session_expired" };
	return {
		kind: "account",
		cookie,
		id,
		subjectKey: row.subject_key,
		tokens,
		generation: row.token_generation,
		accessExpiresAt: row.access_expires_at,
	};
}

/** A valid access token for the account session: the stored one, or a refreshed one (stored only
 * when no other replica refreshed first; then theirs is used). `refused` when the issuer no
 * longer accepts the refresh token: the session is revoked. */
export async function accessToken(
	ring: KeyRing,
	store: SessionStore,
	oidc: OidcClient,
	browser: Browser & { kind: "account" },
	signal: AbortSignal,
): Promise<string | "refused"> {
	if (browser.accessExpiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS)
		return browser.tokens.access;
	if (!browser.tokens.refresh) {
		await store.revokeSession(browser.id);
		return "refused";
	}
	let fresh: Awaited<ReturnType<OidcClient["refresh"]>>;
	try {
		fresh = await oidc.refresh(browser.tokens.refresh, signal);
	} catch (error) {
		if (!(error instanceof GrantRefused)) throw error;
		// Another replica may have rotated this refresh token a moment ago: use what it stored.
		const again = await identify(ring, store, {
			cookie: `${SESSION_COOKIE}=${browser.cookie.value}`,
		});
		if (again.kind === "account" && again.generation !== browser.generation)
			return again.tokens.access;
		failure("session refresh refused", error);
		await store.revokeSession(browser.id);
		return "refused";
	}
	const tokens = {
		...browser.tokens,
		access: fresh.access,
		refresh: fresh.refresh ?? browser.tokens.refresh,
	};
	const stored = await store.storeTokens(
		browser.id,
		browser.generation,
		sealTokens(ring, browser.id, tokens),
		fresh.accessExpiresAt,
	);
	if (!stored) {
		const again = await identify(ring, store, {
			cookie: `${SESSION_COOKIE}=${browser.cookie.value}`,
		});
		if (again.kind === "account") return again.tokens.access;
		return "refused";
	}
	return fresh.access;
}
