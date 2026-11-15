// Sign-in (http-contract §3), below /modules/session-api-sign-in-flow, where the qrwty.io Worker
// sends /auth/* with its public path:
//   GET  /auth/login?returnTo=<relative path>  302 to the issuer: code + PKCE S256, state, nonce;
//                                              the attempt is bound to this browser by a cookie
//   GET  /auth/callback                        302 to returnTo; cancelled or failed adds
//                                              signin=cancelled|failed
//   POST /auth/logout                          204; the session is revoked here and its refresh
//                                              token at the issuer (CSRF required)
//   GET  /auth/logout                          302 to the issuer's own sign-out, back to the
//                                              public origin; it changes nothing here

import { createFailureLog } from "../../../runtime/tile-process.ts";
import { defineRoutes, type ModuleRequest, type ModuleResponse } from "../../entry.ts";
import { problem } from "../../link-api/link-operations/contract.ts";
import { ownerKey } from "../../link-api/link-operations/view.ts";
import type { SessionContext } from "./context.ts";
import {
	clearCookie,
	csrfValid,
	newAccountCookie,
	readCookie,
	SESSION_COOKIE,
	SIGNIN_COOKIE,
	SIGNIN_SECONDS,
	setCookie,
} from "./cookies.ts";
import { randomToken, seal, sha256, unseal } from "./crypto.ts";
import { pkce } from "./oidc.ts";
import { ABSOLUTE_SECONDS, identify, openTokens, sealTokens, sessionId } from "./sessions.ts";

const failure = createFailureLog("session-api");
const PLACEHOLDER = "https://return.invalid";

/** A same-origin path to return to: a relative path that isn't `//…`, `/\…` or /auth/*; else "/". */
export function safeReturnTo(value: unknown): string {
	if (
		typeof value !== "string" ||
		value.length > 512 ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.startsWith("/\\") ||
		value.includes("\\") ||
		[...value].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)
	)
		return "/";
	let url: URL;
	try {
		url = new URL(value, PLACEHOLDER);
	} catch {
		return "/";
	}
	if (url.origin !== PLACEHOLDER || url.pathname === "/auth" || url.pathname.startsWith("/auth/"))
		return "/";
	return `${url.pathname}${url.search}${url.hash}`;
}

/** returnTo with `signin=<outcome>` added. */
export function withOutcome(returnTo: string, outcome: "cancelled" | "failed"): string {
	const url = new URL(returnTo, PLACEHOLDER);
	url.searchParams.set("signin", outcome);
	return `${url.pathname}${url.search}${url.hash}`;
}

const one = (value: string | string[] | undefined) =>
	typeof value === "string" ? value : undefined;
const verifierAad = (state: Buffer) => `qrwty:login-verifier:v1:${state.toString("hex")}`;

function redirect(context: SessionContext, path: string, cookies: string[]): ModuleResponse {
	return {
		status: 302,
		headers: { Location: new URL(path, context.origin).href, "Set-Cookie": cookies },
	};
}

async function login(request: ModuleRequest, context: SessionContext): Promise<ModuleResponse> {
	const returnTo = safeReturnTo(one(request.query.returnTo));
	const state = randomToken();
	const nonce = randomToken();
	const binding = randomToken();
	const { verifier, challenge } = pkce();
	const stateHash = sha256(state);
	try {
		await context.store.beginLogin({
			state: stateHash,
			binding: sha256(binding),
			nonce: sha256(nonce),
			verifier: seal(context.ring, verifier, verifierAad(stateHash)),
			returnTo,
		});
	} catch (error) {
		failure("sign-in start", error);
		return redirect(context, withOutcome(returnTo, "failed"), []);
	}
	return {
		status: 302,
		headers: {
			Location: context.oidc.authorizeUrl({ state, nonce, challenge }),
			"Set-Cookie": [setCookie(SIGNIN_COOKIE, binding, SIGNIN_SECONDS)],
		},
	};
}

async function callback(request: ModuleRequest, context: SessionContext): Promise<ModuleResponse> {
	const done = [clearCookie(SIGNIN_COOKIE)];
	const state = one(request.query.state);
	if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state))
		return redirect(context, "/?signin=failed", done);
	const stateHash = sha256(state);
	let attempt: Awaited<ReturnType<SessionContext["store"]["takeLogin"]>>;
	try {
		attempt = await context.store.takeLogin(stateHash);
	} catch (error) {
		failure("sign-in callback", error);
		return redirect(context, "/?signin=failed", done);
	}
	if (!attempt) return redirect(context, "/?signin=failed", done);
	const returnTo = safeReturnTo(attempt.return_to);
	const binding = readCookie(request.headers.cookie, SIGNIN_COOKIE);
	if (!attempt.live || !binding || !sha256(binding).equals(attempt.binding_sha256))
		return redirect(context, withOutcome(returnTo, "failed"), done);
	const error = one(request.query.error);
	if (error !== undefined)
		return redirect(
			context,
			withOutcome(returnTo, error === "access_denied" ? "cancelled" : "failed"),
			done,
		);
	const code = one(request.query.code);
	const verifier = unseal(context.ring, attempt.verifier_sealed, verifierAad(stateHash));
	if (!code || code.length > 512 || !verifier)
		return redirect(context, withOutcome(returnTo, "failed"), done);
	try {
		const tokens = await context.oidc.exchange(code, verifier, request.signal);
		const profile = await context.oidc.verify(tokens, attempt.nonce_sha256);
		const fresh = newAccountCookie();
		const id = sessionId(fresh);
		// A session cookie the browser already had never continues (no fixation); an account's ends.
		const previous = readCookie(request.headers.cookie, SESSION_COOKIE);
		const before = previous?.startsWith("a1.") ? sha256(previous.slice(3)) : null;
		await context.store.createSession({
			id,
			subjectKey: ownerKey(profile.subject),
			tokens: sealTokens(context.ring, id, {
				subject: profile.subject,
				access: tokens.access,
				refresh: tokens.refresh,
				email: profile.email,
				name: profile.name,
			}),
			accessExpiresAt: tokens.accessExpiresAt,
			absoluteSeconds: ABSOLUTE_SECONDS,
			previous: before,
		});
		return redirect(context, returnTo, [
			...done,
			setCookie(SESSION_COOKIE, fresh.value, ABSOLUTE_SECONDS),
		]);
	} catch (problemError) {
		failure("sign-in callback", problemError);
		return redirect(context, withOutcome(returnTo, "failed"), done);
	}
}

async function logout(request: ModuleRequest, context: SessionContext): Promise<ModuleResponse> {
	const cleared = { "Set-Cookie": [clearCookie(SESSION_COOKIE)] };
	let browser: Awaited<ReturnType<typeof identify>>;
	try {
		browser = await identify(context.ring, context.store, request.headers);
	} catch (error) {
		failure("sign-out", error);
		return problem(503, "storage_unavailable", "Sign-out is unavailable; try again.", true, {
			retryAfterSeconds: 1,
		});
	}
	if (browser.kind === "none") return { status: 204 };
	if (browser.kind === "refused")
		return { ...problem(401, browser.code, "This session has ended.", false), headers: cleared };
	const csrf = one(request.headers["x-csrf-token"]);
	if (!csrfValid(context.ring, browser.cookie.value, csrf))
		return problem(403, "csrf_failed", "Send the session's X-CSRF-Token.", false);
	if (browser.kind === "account") {
		try {
			const sealed = await context.store.revokeSession(browser.id);
			const refresh = sealed ? openTokens(context.ring, browser.id, sealed)?.refresh : undefined;
			if (refresh)
				await context.oidc
					.revoke(refresh, AbortSignal.any([request.signal, AbortSignal.timeout(400)]))
					.catch((error: unknown) => failure("sign-out issuer revocation", error));
		} catch (error) {
			failure("sign-out", error);
			return problem(503, "storage_unavailable", "Sign-out is unavailable; try again.", true, {
				retryAfterSeconds: 1,
			});
		}
	}
	return { status: 204, headers: cleared };
}

export const signInRoutes = defineRoutes<SessionContext>({
	"GET /auth/login": login,
	"GET /auth/callback": callback,
	"POST /auth/logout": logout,
	"GET /auth/logout": async (_request, context) => ({
		status: 302,
		headers: { Location: context.oidc.logoutUrl(new URL("/", context.origin).href) },
	}),
});
