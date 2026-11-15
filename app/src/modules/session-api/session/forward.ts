// The browser's API (http-contract §2–4, §9), below /modules/session-api-api-forwarding, where the
// qrwty.io Worker sends /api/* with its public path. Session API is the only browser-facing
// service: it identifies the browser by its cookie, checks CSRF on every mutation, and calls Link
// API and Account API with the session's bearer (none for a guest, who carries an opaque guest
// scope instead). A browser-sent Authorization header is refused, never forwarded; an invalid,
// expired or revoked cookie is 401 and cleared, never a guest.
//   GET    /api/v1/session            {authenticated, csrfToken, account}; issues a guest session
//   POST   /api/v1/links              guest or owned create            -> Link API  POST /links
//   GET    /api/v1/links/:id          the caller's link                -> Link API  GET  /links/:id
//   PATCH  /api/v1/links/:id          edit, disable or enable          -> Link API  PATCH
//   DELETE /api/v1/links/:id          tombstone                        -> Link API  DELETE
//   POST   /api/v1/links/:id/claim    claim with the guest's proof     -> Link API  POST .../claim
//   GET    /api/v1/me/links           cursor pages                     -> Account API GET /links
//   GET    /api/v1/links/:id/analytics      the owner's counts         -> Account API (A4)
//   GET    /api/v1/links/:id/analytics.csv  the same as CSV            -> Account API (A4)
//   GET    /api/v1/me                 {account, ownedLinks}            -> Account API GET /me
//   DELETE /api/v1/me                 202 {deletionScheduled}          -> Link API  POST /account/erase,
//                                     then the issuer's user is deleted (A3b), then every session of
//                                     the account is revoked
//   POST   /api/v1/abuse-reports      202 {received}; guest or account  -> Link API  POST /reports (Q09)
//   GET    /api/v1/operator/links/by-slug/:slug, POST /api/v1/operator/links/:id/block|unblock
//                                     operator only, else 404           -> Link API  /operator/... (Q09)
// A guest create and a report carry QRWTY-Admission-Key, the keyed hash of the browser's network
// from the Worker's signed address (client-address.ts), for Link API's guest admission.

import { createFailureLog } from "../../../runtime/tile-process.ts";
import type { HttpTarget } from "../../dependencies.ts";
import { defineRoutes, type ModuleRequest, type ModuleResponse } from "../../entry.ts";
import { ADMISSION_KEY_HEADER } from "../../link-api/abuse-and-moderation/admission.ts";
import { OPERATOR_HEADERS } from "../../link-api/abuse-and-moderation/operator.ts";
import { notFound, problem } from "../../link-api/link-operations/contract.ts";
import { admissionKeyFor } from "./client-address.ts";
import type { SessionContext } from "./context.ts";
import {
	clearCookie,
	csrfToken,
	csrfValid,
	guestScope,
	newGuestCookie,
	SESSION_ABSOLUTE_SECONDS,
	SESSION_COOKIE,
	setCookie,
} from "./cookies.ts";
import type { UserEraser } from "./erasure.ts";
import { accessToken, type Browser, identify, openTokens } from "./sessions.ts";

const LINKS = "/modules/link-api-link-operations";
const ACCOUNT = "/modules/account-api-my-links";
const ANALYTICS = "/modules/account-api-link-analytics";
const ABUSE = "/modules/link-api-abuse-and-moderation";
const failure = createFailureLog("session-api");

export type ForwardContext = SessionContext & {
	linkApi: HttpTarget;
	accountApi: HttpTarget;
	/** The Worker's client-address key (client-address.ts); absent: every guest is `unverified`. */
	clientKey?: Uint8Array;
	/** Deletes the account's user at the issuer (erasure.ts); absent: the user stays (local). */
	eraseUser?: UserEraser;
};
type Routed = ModuleRequest & { params: Record<string, string> };
type Known = Exclude<Browser, { kind: "refused" }>;
type Account = Browser & { kind: "account" };

const one = (value: string | string[] | undefined) =>
	typeof value === "string" ? value : undefined;
const unavailable = (code = "unavailable", message = "The service is unavailable; try again.") =>
	problem(503, code, message, true, { retryAfterSeconds: 1 });
const refused = (code: "unauthenticated" | "session_expired") => ({
	...problem(
		401,
		code,
		code === "session_expired" ? "This session has ended; sign in again." : "Sign in to continue.",
		false,
	),
	headers: { "Set-Cookie": [clearCookie(SESSION_COOKIE)] },
});

/** The downstream answer headers the browser gets. */
const RELAYED = [
	["etag", "ETag"],
	["retry-after", "Retry-After"],
	["idempotent-replayed", "Idempotent-Replayed"],
	["allow", "Allow"],
] as const;

/** A downstream answer in the product's shape: its JSON body as it is when it already has one; a
 * runtime answer (`{error: "CODE"}`) mapped; a 401 from a guard means the bearer was refused. */
async function relay(response: Response): Promise<ModuleResponse> {
	const headers: Record<string, string> = {};
	for (const [name, as] of RELAYED) {
		const value = response.headers.get(name);
		if (value) headers[as] = value;
	}
	if (response.status === 204) return { status: 204, headers };
	// The analytics export (A4): its CSV text and file name, as Account API sent them.
	const type = response.headers.get("content-type") ?? "";
	if (response.status === 200 && type.startsWith("text/csv")) {
		const disposition = response.headers.get("content-disposition");
		return {
			status: 200,
			headers: {
				...headers,
				"Content-Type": type,
				...(disposition ? { "Content-Disposition": disposition } : {}),
			},
			body: await response.text(),
		};
	}
	const text = await response.text();
	let body: unknown;
	try {
		body = text ? JSON.parse(text) : undefined;
	} catch {
		body = undefined;
	}
	const error = (body as { error?: unknown } | undefined)?.error;
	if (typeof error === "string") {
		if (response.status === 401) return refused("session_expired");
		if (response.status === 501)
			return problem(501, "not_implemented", "Not available yet.", false);
		if (response.status >= 500) return unavailable();
		return problem(response.status, error.toLowerCase(), "The request was refused.", false);
	}
	if (body === undefined && response.status >= 500) return unavailable();
	return { status: response.status, headers, body };
}

export function forwardRoutes() {
	/** The browser, or the answer that refuses it. */
	async function who(
		request: ModuleRequest,
		context: ForwardContext,
	): Promise<Known | ModuleResponse> {
		if (request.headers.authorization !== undefined)
			return problem(
				401,
				"unauthenticated",
				"Bearer tokens are not accepted here; use the session.",
				false,
			);
		try {
			const browser = await identify(context.ring, context.store, request.headers);
			return browser.kind === "refused" ? refused(browser.code) : browser;
		} catch (error) {
			failure("session lookup", error);
			return unavailable("storage_unavailable");
		}
	}
	const isAnswer = (value: Known | ModuleResponse): value is ModuleResponse => !("kind" in value);

	/** A mutation's browser: a session (guest or account) with its CSRF token. */
	async function mutating(request: ModuleRequest, context: ForwardContext) {
		const browser = await who(request, context);
		if (isAnswer(browser)) return browser;
		if (browser.kind === "none")
			return problem(401, "unauthenticated", "Start a session first.", false);
		if (!csrfValid(context.ring, browser.cookie.value, one(request.headers["x-csrf-token"])))
			return problem(403, "csrf_failed", "Send the session's X-CSRF-Token.", false);
		return browser;
	}

	/** The bearer for an account session, or the answer that refuses it. */
	async function bearer(account: Account, request: ModuleRequest, context: ForwardContext) {
		try {
			const token = await accessToken(
				context.ring,
				context.store,
				context.oidc,
				account,
				request.signal,
			);
			return token === "refused" ? refused("session_expired") : token;
		} catch (error) {
			failure("session refresh", error);
			return unavailable("identity_unavailable", "Sign-in is unavailable; try again shortly.");
		}
	}

	/** Calls a downstream route with only the headers it needs. */
	async function call(
		target: HttpTarget,
		path: string,
		request: ModuleRequest,
		extra: Record<string, string>,
		withBody: boolean,
	): Promise<ModuleResponse> {
		const headers: Record<string, string> = { accept: "application/json", ...extra };
		for (const name of ["idempotency-key", "if-match"]) {
			const value = one(request.headers[name]);
			if (value !== undefined) headers[name] = value;
		}
		if (withBody) headers["content-type"] = "application/json";
		try {
			return await relay(
				await target.request(path, {
					method: request.method,
					headers,
					...(withBody ? { body: JSON.stringify(request.body ?? null) } : {}),
					signal: request.signal,
				}),
			);
		} catch (error) {
			failure(`forward ${request.method} ${path.split("?")[0]}`, error);
			return unavailable();
		}
	}

	/** An owner route: an account session (with CSRF on a mutation), then the call with its bearer. */
	const owner =
		(
			target: (context: ForwardContext) => HttpTarget,
			path: (request: Routed) => string,
			mutation: boolean,
		) =>
		async (request: Routed, context: ForwardContext): Promise<ModuleResponse> => {
			const browser = mutation ? await mutating(request, context) : await who(request, context);
			if (isAnswer(browser)) return browser;
			if (browser.kind !== "account")
				return problem(401, "unauthenticated", "Sign in to continue.", false);
			const token = await bearer(browser, request, context);
			if (typeof token !== "string") return token;
			return call(
				target(context),
				path(request),
				request,
				{ authorization: `Bearer ${token}` },
				mutation && request.method !== "DELETE",
			);
		};
	const link = (request: Routed) => `${LINKS}/links/${encodeURIComponent(request.params.id ?? "")}`;
	/** Account API's analytics path for a link, with only `from` and `to` of the query. */
	const analytics = (suffix: string) => (request: Routed) => {
		const query = new URLSearchParams();
		for (const name of ["from", "to"]) {
			const value = request.query[name];
			if (value !== undefined) for (const item of [value].flat()) query.append(name, item);
		}
		const text = query.toString();
		return `${ANALYTICS}/links/${encodeURIComponent(request.params.id ?? "")}/${suffix}${text ? `?${text}` : ""}`;
	};
	/** An operator route (Q09): the operator CLI's signed request, passed on with its four headers
	 * as they are; or an account session's bearer (with its CSRF token on a mutation). Link API
	 * decides who is an operator and answers anyone else 404; so does this, for any other browser. */
	const operatorRoute =
		(path: (request: Routed) => string, mutation: boolean) =>
		async (request: Routed, context: ForwardContext): Promise<ModuleResponse> => {
			const target = `${ABUSE}/operator${path(request)}`;
			if (one(request.headers[OPERATOR_HEADERS.signature]) !== undefined) {
				const signed: Record<string, string> = {};
				for (const name of Object.values(OPERATOR_HEADERS)) {
					const value = one(request.headers[name]);
					if (value !== undefined) signed[name] = value;
				}
				return call(context.linkApi, target, request, signed, mutation);
			}
			const browser = await who(request, context);
			if (isAnswer(browser)) return (browser.status ?? 200) >= 500 ? browser : notFound();
			if (browser.kind !== "account") return notFound();
			if (
				mutation &&
				!csrfValid(context.ring, browser.cookie.value, one(request.headers["x-csrf-token"]))
			)
				return notFound();
			const token = await bearer(browser, request, context);
			if (typeof token !== "string") return token;
			return call(context.linkApi, target, request, { authorization: `Bearer ${token}` }, mutation);
		};
	const linkApi = (context: ForwardContext) => context.linkApi;
	const accountApi = (context: ForwardContext) => context.accountApi;

	return defineRoutes<ForwardContext>({
		"GET /api/v1/session": async (request, context) => {
			const browser = await who(request, context);
			if (isAnswer(browser)) return browser;
			if (browser.kind === "none") {
				const guest = newGuestCookie(context.ring, Date.now());
				return {
					headers: {
						"Set-Cookie": [setCookie(SESSION_COOKIE, guest.value, SESSION_ABSOLUTE_SECONDS)],
					},
					body: {
						authenticated: false,
						csrfToken: csrfToken(context.ring, guest.value),
						account: null,
					},
				};
			}
			const csrf = csrfToken(context.ring, browser.cookie.value);
			if (browser.kind === "guest")
				return { body: { authenticated: false, csrfToken: csrf, account: null } };
			return {
				body: {
					authenticated: true,
					csrfToken: csrf,
					account: { email: browser.tokens.email, name: browser.tokens.name },
				},
			};
		},
		"POST /api/v1/links": async (request, context) => {
			const browser = await mutating(request, context);
			if (isAnswer(browser)) return browser;
			if (browser.kind === "guest")
				return call(
					context.linkApi,
					`${LINKS}/links`,
					request,
					{
						"qrwty-guest-scope": guestScope(context.ring, browser.cookie.id),
						[ADMISSION_KEY_HEADER]: admissionKeyFor(request.headers, context.clientKey),
					},
					true,
				);
			const token = await bearer(browser, request, context);
			if (typeof token !== "string") return token;
			return call(
				context.linkApi,
				`${LINKS}/links`,
				request,
				{ authorization: `Bearer ${token}` },
				true,
			);
		},
		"POST /api/v1/abuse-reports": async (request, context) => {
			const browser = await mutating(request, context);
			if (isAnswer(browser)) return browser;
			return call(
				context.linkApi,
				`${ABUSE}/reports`,
				request,
				{ [ADMISSION_KEY_HEADER]: admissionKeyFor(request.headers, context.clientKey) },
				true,
			);
		},
		"GET /api/v1/operator/links/by-slug/:slug": operatorRoute(
			(request) => `/links/by-slug/${encodeURIComponent(request.params.slug ?? "")}`,
			false,
		),
		"POST /api/v1/operator/links/:id/block": operatorRoute(
			(request) => `/links/${encodeURIComponent(request.params.id ?? "")}/block`,
			true,
		),
		"POST /api/v1/operator/links/:id/unblock": operatorRoute(
			(request) => `/links/${encodeURIComponent(request.params.id ?? "")}/unblock`,
			true,
		),
		"GET /api/v1/links/:id": owner(linkApi, link, false),
		"PATCH /api/v1/links/:id": owner(linkApi, link, true),
		"DELETE /api/v1/links/:id": owner(linkApi, link, true),
		"POST /api/v1/links/:id/claim": owner(linkApi, (request) => `${link(request)}/claim`, true),
		"GET /api/v1/links/:id/analytics": owner(accountApi, analytics("analytics"), false),
		"GET /api/v1/links/:id/analytics.csv": owner(accountApi, analytics("analytics.csv"), false),
		"GET /api/v1/me/links": owner(
			accountApi,
			(request) => {
				const query = new URLSearchParams();
				for (const name of ["cursor", "limit"]) {
					const value = request.query[name];
					if (value !== undefined) for (const item of [value].flat()) query.append(name, item);
				}
				const text = query.toString();
				return `${ACCOUNT}/links${text ? `?${text}` : ""}`;
			},
			false,
		),
		"GET /api/v1/me": async (request, context) => {
			const browser = await who(request, context);
			if (isAnswer(browser)) return browser;
			if (browser.kind !== "account")
				return problem(401, "unauthenticated", "Sign in to continue.", false);
			const token = await bearer(browser, request, context);
			if (typeof token !== "string") return token;
			const answer = await call(
				context.accountApi,
				`${ACCOUNT}/me`,
				request,
				{ authorization: `Bearer ${token}` },
				false,
			);
			if (answer.status !== undefined && answer.status !== 200) return answer;
			return {
				body: {
					account: { email: browser.tokens.email, name: browser.tokens.name },
					...(answer.body as Record<string, unknown>),
				},
			};
		},
		"DELETE /api/v1/me": async (request, context) => {
			const browser = await mutating(request, context);
			if (isAnswer(browser)) return browser;
			if (browser.kind !== "account")
				return problem(401, "unauthenticated", "Sign in to continue.", false);
			const key = one(request.headers["idempotency-key"]);
			if (key === undefined || !/^[!-~]{1,255}$/.test(key))
				return problem(
					400,
					"idempotency_key_required",
					"Send an Idempotency-Key header of 1 to 255 visible ASCII characters.",
					false,
				);
			const token = await bearer(browser, request, context);
			if (typeof token !== "string") return token;
			// The Management API token is fetched while Link API erases (one round trip saved).
			const warming = context.eraseUser?.warm(request.signal);
			const erased = await call(
				context.linkApi,
				`${LINKS}/account/erase`,
				{ ...request, method: "POST" },
				{ authorization: `Bearer ${token}` },
				false,
			);
			await warming;
			if (erased.status !== 200) return erased;
			// The issuer's user goes before the sessions: if this fails, the browser's session still
			// works, and its retry (the same Idempotency-Key) erases again, which changes nothing more.
			if (context.eraseUser)
				try {
					await context.eraseUser.erase(
						browser.tokens.subject,
						AbortSignal.any([request.signal, AbortSignal.timeout(450)]),
					);
				} catch (error) {
					failure("account deletion issuer user", error);
					return unavailable("identity_unavailable", "Sign-in is unavailable; try again shortly.");
				}
			try {
				const ended = await context.store.revokeAccount(browser.subjectKey);
				const signal = AbortSignal.any([request.signal, AbortSignal.timeout(250)]);
				await Promise.all(
					ended.map(async (row) => {
						const refresh = openTokens(context.ring, row.id_sha256, row.tokens_sealed)?.refresh;
						if (refresh)
							await context.oidc
								.revoke(refresh, signal)
								.catch((error: unknown) => failure("account deletion issuer revocation", error));
					}),
				);
			} catch (error) {
				failure("account deletion sessions", error);
				return unavailable("storage_unavailable");
			}
			return {
				status: 202,
				headers: { "Set-Cookie": [clearCookie(SESSION_COOKIE)] },
				body: { deletionScheduled: true },
			};
		},
	});
}

/** The route table's own 404 and 405 answers in the product's shape. */
export function productShape(response: ModuleResponse): ModuleResponse {
	const body = response.body as { error?: unknown } | undefined;
	if (typeof body?.error !== "string") return response;
	if (response.status === 404) return notFound();
	return problem(
		response.status ?? 400,
		response.status === 405 ? "method_not_allowed" : "invalid_request",
		"The request was refused.",
		false,
		{
			headers: response.headers?.Allow ? { Allow: String(response.headers.Allow) } : {},
		},
	);
}
