// Session API's cookies, CSRF, return paths and forwarding rules, and Account API's cursors,
// offline: an in-memory Sessions store and recorded downstream calls. No Docker, no network.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../../src/modules/account-api/my-links/routes.ts";
import type { ModuleRequest, ModuleResponse } from "../../src/modules/entry.ts";
import { ownerKey } from "../../src/modules/link-api/link-operations/view.ts";
import type { SessionContext } from "../../src/modules/session-api/session/context.ts";
import {
	csrfToken,
	csrfValid,
	newAccountCookie,
	newGuestCookie,
	parseSessionCookie,
	readCookie,
	SESSION_COOKIE,
} from "../../src/modules/session-api/session/cookies.ts";
import { seal, unseal } from "../../src/modules/session-api/session/crypto.ts";
import { forwardRoutes } from "../../src/modules/session-api/session/forward.ts";
import { sealTokens, sessionId } from "../../src/modules/session-api/session/sessions.ts";
import { safeReturnTo, withOutcome } from "../../src/modules/session-api/session/signin.ts";
import type { SessionStore } from "../../src/modules/session-api/session/store.ts";
import { keyRing } from "../../src/runtime/settings.ts";

const keyOf = (id: string) => createHash("sha256").update(id).digest().toString("base64url");
const ringOf = (...ids: string[]) =>
	keyRing().parse(Buffer.from(JSON.stringify(ids.map((id) => ({ id, key: keyOf(id) })))));
const ring = ringOf("k1");

describe("session cookies", () => {
	it("verifies a guest cookie it issued and refuses a forged or altered one", () => {
		const guest = newGuestCookie(ring, Date.now());
		expect(parseSessionCookie(ring, guest.value)).toMatchObject({ kind: "guest", id: guest.id });
		const forged = `${guest.value.slice(0, -2)}AA`;
		expect(parseSessionCookie(ring, forged)).toBeUndefined();
		expect(parseSessionCookie(ringOf("other"), guest.value)).toBeUndefined();
		expect(parseSessionCookie(ring, "garbage")).toBeUndefined();
	});
	it("keeps verifying after a rotation that adds a new first key", () => {
		const guest = newGuestCookie(ring, Date.now());
		// A new first key, k2, with k1 kept second.
		const real = ringOf("k2", "k1");
		expect(real.current.id).toBe("k2");
		expect(parseSessionCookie(real, guest.value)?.kind).toBe("guest");
		expect(csrfValid(real, guest.value, csrfToken(ring, guest.value))).toBe(true);
	});
	it("binds the CSRF token to its own session", () => {
		const a = newGuestCookie(ring, Date.now());
		const b = newAccountCookie();
		expect(csrfValid(ring, a.value, csrfToken(ring, a.value))).toBe(true);
		expect(csrfValid(ring, b.value, csrfToken(ring, a.value))).toBe(false);
		expect(csrfValid(ring, a.value, undefined)).toBe(false);
	});
	it("reads one cookie and treats a repeated name as invalid", () => {
		expect(readCookie("a=1; __Host-qrwty=v; b=2", SESSION_COOKIE)).toBe("v");
		expect(readCookie(undefined, SESSION_COOKIE)).toBeUndefined();
		expect(readCookie("__Host-qrwty=v; __Host-qrwty=w", SESSION_COOKIE)).toBe("");
	});
	it("seals tokens bound to their session", () => {
		const sealed = seal(ring, "secret text", "aad-1");
		expect(unseal(ring, sealed, "aad-1")).toBe("secret text");
		expect(unseal(ring, sealed, "aad-2")).toBeUndefined();
		expect(sealed.includes(Buffer.from("secret text"))).toBe(false);
	});
});

describe("return paths", () => {
	it("keeps a same-origin relative path and refuses everything else", () => {
		expect(safeReturnTo("/links?x=1#y")).toBe("/links?x=1#y");
		for (const bad of [
			"https://evil.example/",
			"//evil.example/",
			"/\\evil.example",
			"/a\\b",
			"/a\nb",
			"/auth/login",
			"",
			undefined,
			"links",
		])
			expect(safeReturnTo(bad)).toBe("/");
		expect(withOutcome("/links?x=1", "cancelled")).toBe("/links?x=1&signin=cancelled");
	});
});

describe("my-links cursors", () => {
	it("refuses a malformed cursor and another account's", () => {
		const alice = ownerKey("auth0|alice");
		const bob = ownerKey("auth0|bob");
		const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
		const cursor = encodeCursor(alice, "1763236800123456", id);
		expect(decodeCursor(alice, cursor)).toEqual({ createdUs: "1763236800123456", id });
		expect(decodeCursor(bob, cursor)).toBeUndefined();
		expect(decodeCursor(alice, "not-a-cursor")).toBeUndefined();
		expect(decodeCursor(alice, `${cursor}!`)).toBeUndefined();
	});
});

// The forwarding routes against an in-memory store and recorded downstream calls.
function forwarding() {
	const sessions = new Map<string, { subjectKey: Buffer; tokens: Buffer; revoked: boolean }>();
	const calls: { target: string; path: string; init: RequestInit }[] = [];
	const store = {
		useSession: async (id: Buffer) => {
			const row = sessions.get(id.toString("hex"));
			if (!row) return { status: "unknown" };
			if (row.revoked) return { status: "revoked" };
			return {
				status: "active",
				subject_key: row.subjectKey,
				tokens_sealed: row.tokens,
				token_generation: 1,
				access_expires_at: new Date(Date.now() + 300_000),
			};
		},
		revokeSession: async (id: Buffer) => {
			const row = sessions.get(id.toString("hex"));
			if (row) row.revoked = true;
			return undefined;
		},
	} as unknown as SessionStore;
	const target = (name: string) => ({
		request: async (path: string, init: RequestInit = {}) => {
			calls.push({ target: name, path, init });
			return new Response(JSON.stringify({ ok: true }), {
				status: 201,
				headers: { "content-type": "application/json", etag: '"1"' },
			});
		},
	});
	const context = {
		ring,
		origin: new URL("https://qrwty.io"),
		store,
		oidc: {} as SessionContext["oidc"],
		linkApi: target("link-api"),
		accountApi: target("account-api"),
		billingApi: target("billing-api"),
	};
	const routes = forwardRoutes();
	const call = (overrides: Partial<ModuleRequest>): Promise<ModuleResponse> =>
		routes(
			{
				method: "GET",
				path: "/api/v1/session",
				rawPath: overrides.path ?? "/api/v1/session",
				query: {},
				headers: {},
				body: undefined,
				caller: { signedIn: false },
				signal: new AbortController().signal,
				...overrides,
			},
			context,
		);
	const signIn = (subject: string) => {
		const cookie = newAccountCookie();
		const id = sessionId(cookie);
		sessions.set(id.toString("hex"), {
			subjectKey: ownerKey(subject),
			tokens: sealTokens(ring, id, {
				subject,
				access: "access-token-for-test",
				refresh: null,
				email: "owner@example.com",
				name: null,
			}),
			revoked: false,
		});
		return {
			cookie,
			revoke: () => (sessions.get(id.toString("hex")) ?? { revoked: false }).revoked,
		};
	};
	return { call, calls, signIn, sessions };
}
const code = (r: ModuleResponse) => (r.body as { error?: { code?: string } }).error?.code;
const cookieHeader = (value: string) => ({ cookie: `${SESSION_COOKIE}=${value}` });
const setCookies = (r: ModuleResponse) => [r.headers?.["Set-Cookie"] ?? []].flat();

describe("API forwarding", () => {
	it("issues a guest session with a CSRF token, and never an identity", async () => {
		const { call } = forwarding();
		const r = await call({});
		expect(r.body).toMatchObject({ authenticated: false, account: null });
		const [cookie] = setCookies(r);
		expect(cookie).toMatch(
			/^__Host-qrwty=g1\..+; Path=\/; Max-Age=\d+; Secure; HttpOnly; SameSite=Lax$/,
		);
	});
	it("refuses an unknown cookie, a cookieless mutation and a missing CSRF token", async () => {
		const { call, calls } = forwarding();
		const unknown = await call({ headers: cookieHeader(newAccountCookie().value) });
		expect(unknown.status).toBe(401);
		expect(setCookies(unknown)[0]).toMatch(/Max-Age=0/);
		const garbage = await call({
			method: "POST",
			path: "/api/v1/links",
			headers: { ...cookieHeader("g1.forged"), "x-csrf-token": "x".repeat(43) },
			body: { destination: "https://example.com" },
		});
		expect(garbage.status).toBe(401);
		const none = await call({ method: "POST", path: "/api/v1/links", body: {} });
		expect(none.status).toBe(401);
		const guest = newGuestCookie(ring, Date.now());
		const noCsrf = await call({
			method: "POST",
			path: "/api/v1/links",
			headers: cookieHeader(guest.value),
		});
		expect(noCsrf.status).toBe(403);
		expect(code(noCsrf)).toBe("csrf_failed");
		const bearer = await call({ path: "/api/v1/session", headers: { authorization: "Bearer x" } });
		expect(bearer.status).toBe(401);
		expect(calls).toHaveLength(0);
	});
	it("forwards a guest create with its guest scope and no bearer", async () => {
		const { call, calls } = forwarding();
		const guest = newGuestCookie(ring, Date.now());
		const r = await call({
			method: "POST",
			path: "/api/v1/links",
			headers: {
				...cookieHeader(guest.value),
				"x-csrf-token": csrfToken(ring, guest.value),
				"idempotency-key": "k1",
				authorization: undefined,
				"qrwty-guest-scope": "client-supplied",
			},
			body: { destination: "https://example.com" },
		});
		expect(r.status).toBe(201);
		expect(r.headers?.ETag).toBe('"1"');
		const [sent] = calls;
		const headers = sent?.init.headers as Record<string, string>;
		expect(sent?.path).toBe("/modules/link-api-link-operations/links");
		expect(headers.authorization).toBeUndefined();
		expect(headers["idempotency-key"]).toBe("k1");
		expect(headers["qrwty-guest-scope"]).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(headers["qrwty-guest-scope"]).not.toBe("client-supplied");
	});
	it("keeps owner routes for an account session and sends its bearer", async () => {
		const { call, calls, signIn } = forwarding();
		const guest = newGuestCookie(ring, Date.now());
		const asGuest = await call({ path: "/api/v1/me/links", headers: cookieHeader(guest.value) });
		expect(asGuest.status).toBe(401);
		const { cookie } = signIn("auth0|alice");
		const list = await call({
			path: "/api/v1/me/links",
			query: { cursor: "abc", limit: "5", other: "x" },
			headers: cookieHeader(cookie.value),
		});
		expect(list.status).toBe(201);
		const [sent] = calls;
		expect(sent?.target).toBe("account-api");
		expect(sent?.path).toBe("/modules/account-api-my-links/links?cursor=abc&limit=5");
		expect((sent?.init.headers as Record<string, string> | undefined)?.authorization).toBe(
			"Bearer access-token-for-test",
		);
		const patch = await call({
			method: "PATCH",
			path: "/api/v1/links/abc",
			headers: { ...cookieHeader(cookie.value), "if-match": '"1"' },
			body: { state: "disabled" },
		});
		expect(patch.status).toBe(403);
		const session = await call({ headers: cookieHeader(cookie.value) });
		expect(session.body).toMatchObject({
			authenticated: true,
			account: { email: "owner@example.com" },
		});
	});
	it("refuses a revoked session's cookie and clears it", async () => {
		const { call, signIn, sessions } = forwarding();
		const { cookie } = signIn("auth0|bob");
		for (const row of sessions.values()) row.revoked = true;
		const r = await call({ headers: cookieHeader(cookie.value) });
		expect(r.status).toBe(401);
		expect(code(r)).toBe("session_expired");
		expect(setCookies(r)[0]).toMatch(/^__Host-qrwty=; .*Max-Age=0/);
	});
});
