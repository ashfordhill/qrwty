// The browser's cookies (http-contract §3): one session cookie, `__Host-qrwty`, and a short-lived
// sign-in binding cookie, `__Host-qrwty-signin`. `__Host-` makes the browser keep them Secure,
// host-only and on path /; they are HttpOnly, so scripts never read them, and SameSite=Lax.
//   guest:   g1.<16 random bytes>.<issued, unix seconds>.<MAC>  (stateless: a guest is only an
//            idempotency and abuse handle, never an identity)
//   account: a1.<32 random bytes>  (its SHA-256 names the row in sessions)

import type { KeyRing } from "../../../runtime/settings.ts";
import { mac, randomToken, verifyMac } from "./crypto.ts";

export const SESSION_COOKIE = "__Host-qrwty";
export const SIGNIN_COOKIE = "__Host-qrwty-signin";
/** Browser session limits (decisions §3): 7 days absolute, 24 hours idle. */
export const SESSION_ABSOLUTE_SECONDS = 7 * 24 * 3600;
export const SESSION_IDLE_SECONDS = 24 * 3600;
export const SIGNIN_SECONDS = 600;

/** The named cookie's value from a Cookie header; undefined when absent, "" when sent twice. */
export function readCookie(header: string | string[] | undefined, name: string) {
	const text = Array.isArray(header) ? header.join("; ") : (header ?? "");
	const values = text
		.split(";")
		.map((part) => part.trim())
		.filter((part) => part.startsWith(`${name}=`))
		.map((part) => part.slice(name.length + 1));
	if (values.length === 0) return undefined;
	return values.length === 1 ? (values[0] ?? "") : "";
}

export const setCookie = (name: string, value: string, maxAge: number) =>
	`${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
export const clearCookie = (name: string) => setCookie(name, "", 0);

export type CookieSession =
	| { kind: "guest"; id: string; issuedAt: number; value: string }
	| { kind: "account"; token: string; value: string };

export function newGuestCookie(ring: KeyRing, now: number): CookieSession & { kind: "guest" } {
	const id = randomToken(16);
	const issuedAt = Math.floor(now / 1000);
	const payload = `g1.${id}.${issuedAt.toString(36)}`;
	return { kind: "guest", id, issuedAt, value: `${payload}.${mac(ring, "guest", payload)}` };
}

export const newAccountCookie = (): CookieSession & { kind: "account" } => {
	const token = randomToken(32);
	return { kind: "account", token, value: `a1.${token}` };
};

/** The cookie's session, by shape and (for a guest) MAC; undefined when it was never issued here. */
export function parseSessionCookie(ring: KeyRing, value: string): CookieSession | undefined {
	const guest = /^(g1\.([A-Za-z0-9_-]{22})\.([0-9a-z]{1,8}))\.([A-Za-z0-9_-]{43})$/.exec(value);
	if (guest) {
		const [, payload, id, issued, signature] = guest;
		if (!payload || !id || !issued || !signature || !verifyMac(ring, "guest", payload, signature))
			return undefined;
		return { kind: "guest", id, issuedAt: Number.parseInt(issued, 36), value };
	}
	const account = /^a1\.([A-Za-z0-9_-]{43})$/.exec(value);
	if (account?.[1]) return { kind: "account", token: account[1], value };
	return undefined;
}

/** The CSRF token of a session cookie (http-contract §2): a MAC of the cookie's value. */
export const csrfToken = (ring: KeyRing, cookie: string) => mac(ring, "csrf", cookie);
export const csrfValid = (ring: KeyRing, cookie: string, given: string | undefined) =>
	given !== undefined &&
	/^[A-Za-z0-9_-]{43}$/.test(given) &&
	verifyMac(ring, "csrf", cookie, given);
/** The guest's idempotency scope for Link API (`QRWTY-Guest-Scope`): never the cookie itself. */
export const guestScope = (ring: KeyRing, guestId: string) => mac(ring, "guest-scope", guestId);
