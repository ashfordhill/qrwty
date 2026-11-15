// Session, CSRF and idempotency helpers over the external contract, plus OIDC form sign-in.
import { Client, CookieJar, type EdgeIdentity, idempotencyKey, type Response } from "./client.ts";

export interface SessionBody {
	authenticated: boolean;
	csrfToken: string;
	account: unknown;
}

export interface MutateOptions {
	/** A key string, `true` for a fresh key, or `false` to omit the header. */
	idempotencyKey?: string | boolean;
	headers?: Record<string, string>;
	edge?: EdgeIdentity;
	csrf?: string | false;
	rawBody?: string;
}

/** The outcome of one sign-in call (pack v1.6). */
export interface SignInResult {
	ok: boolean;
	/** The arm's final redirect (to returnTo) when the flow got back to the arm. */
	finalLocation?: string;
	steps: string[];
	/** Login form posts this call sent: 0 or 1, never more. */
	posts: number;
	/** The issuer did not complete the sign-in after the one post (credentials refused, account
	 * locked, or another page instead of the redirect back to the arm). */
	refused: boolean;
	/** Why the sign-in did not complete; absent when `ok`. */
	reason?: string;
}

/** Network errors that are retried, and only before the login form is posted. */
const RETRYABLE_CODES = new Set([
	"ECONNREFUSED",
	"ECONNRESET",
	"EPIPE",
	"ETIMEDOUT",
	"EHOSTUNREACH",
	"ENETUNREACH",
	"EAI_AGAIN",
]);
/** Delays before the retries of one request before the post: at most two retries. */
export const SIGN_IN_RETRY_DELAYS_MS = [250, 1_000];

function isRetryable(error: unknown): boolean {
	const code = (error as { code?: unknown } | undefined)?.code;
	if (typeof code === "string" && RETRYABLE_CODES.has(code)) return true;
	return /connection closed before a complete response head/.test(String(error));
}

async function beforePost<T>(send: () => Promise<T>, steps: string[], label: string): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await send();
		} catch (error) {
			const delay = SIGN_IN_RETRY_DELAYS_MS[attempt];
			if (delay === undefined || !isRetryable(error)) throw error;
			steps.push(`${label}: network error (${(error as Error).message}), retried`);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
}

function message(error: unknown): string {
	return (error as Error)?.message ?? String(error);
}

/** One browser-like actor: a cookie jar, its CSRF token and the public entry. */
export class Api {
	csrfToken: string | undefined;

	readonly client: Client;
	readonly edge: EdgeIdentity;

	constructor(client: Client, edge: EdgeIdentity = {}) {
		this.client = client;
		this.edge = edge;
	}

	static forEntry(entryUrl: string, origin: string, edge: EdgeIdentity = {}): Api {
		return new Api(new Client(entryUrl, origin, new CookieJar()), edge);
	}

	/** A fresh actor at the same entry with an empty jar. */
	fresh(edge: EdgeIdentity = this.edge): Api {
		return new Api(new Client(this.client.baseUrl, `http://${this.client.hostHeader}`), edge);
	}

	/** The same actor (cookie jar and CSRF token) talking to another base URL, e.g. one replica. */
	at(baseUrl: string): Api {
		const api = new Api(this.client.at(baseUrl), this.edge);
		api.csrfToken = this.csrfToken;
		return api;
	}

	async session(): Promise<{ response: Response; body: SessionBody | undefined }> {
		const response = await this.client.request("GET", "/api/v1/session", { edge: this.edge });
		const body = response.json as SessionBody | undefined;
		if (response.status === 200 && body?.csrfToken) this.csrfToken = body.csrfToken;
		return { response, body };
	}

	async ensureCsrf(): Promise<string | undefined> {
		if (!this.csrfToken) await this.session();
		return this.csrfToken;
	}

	get(path: string, headers: Record<string, string> = {}): Promise<Response> {
		return this.client.request("GET", path, { headers, edge: this.edge });
	}

	async mutate(
		method: string,
		path: string,
		body?: unknown,
		options: MutateOptions = {},
	): Promise<Response> {
		const headers: Record<string, string> = { ...(options.headers ?? {}) };
		const csrf = options.csrf === false ? undefined : (options.csrf ?? (await this.ensureCsrf()));
		if (csrf) headers["X-CSRF-Token"] = csrf;
		const key = options.idempotencyKey;
		if (typeof key === "string") headers["Idempotency-Key"] = key;
		else if (key === true) headers["Idempotency-Key"] = idempotencyKey();
		return this.client.request(method, path, {
			headers,
			body: options.rawBody === undefined ? body : undefined,
			rawBody: options.rawBody,
			edge: options.edge ?? this.edge,
		});
	}

	createLink(
		destination: string,
		options: { key?: string; expiresAt?: string; edge?: EdgeIdentity } = {},
	): Promise<Response> {
		const body: Record<string, unknown> = { destination };
		if (options.expiresAt) body.expiresAt = options.expiresAt;
		return this.mutate("POST", "/api/v1/links", body, {
			idempotencyKey: options.key ?? true,
			edge: options.edge,
		});
	}

	claim(id: string, claimToken: string, key?: string): Promise<Response> {
		return this.mutate(
			"POST",
			`/api/v1/links/${encodeURIComponent(id)}/claim`,
			{ claimToken },
			{ idempotencyKey: key ?? true },
		);
	}

	getLink(id: string): Promise<Response> {
		return this.get(`/api/v1/links/${encodeURIComponent(id)}`);
	}

	patchLink(id: string, body: unknown, ifMatch?: string): Promise<Response> {
		return this.mutate("PATCH", `/api/v1/links/${encodeURIComponent(id)}`, body, {
			idempotencyKey: false,
			headers: ifMatch ? { "If-Match": ifMatch } : {},
		});
	}

	deleteLink(id: string): Promise<Response> {
		return this.mutate("DELETE", `/api/v1/links/${encodeURIComponent(id)}`, undefined, {
			idempotencyKey: false,
		});
	}

	listLinks(query = ""): Promise<Response> {
		return this.get(`/api/v1/me/links${query}`);
	}

	analytics(id: string, query = ""): Promise<Response> {
		return this.get(`/api/v1/links/${encodeURIComponent(id)}/analytics${query}`);
	}

	csv(id: string, query = ""): Promise<Response> {
		return this.get(`/api/v1/links/${encodeURIComponent(id)}/analytics.csv${query}`);
	}

	billing(): Promise<Response> {
		return this.get("/api/v1/me/billing");
	}

	/**
	 * Signs in through the arm's /auth/login and the issuer's HTML login form (authorization code
	 * flow driven like a browser). Returns the final arm response (the redirect to returnTo).
	 *
	 * Pack v1.6: the login form is posted **at most once** per call. When the issuer answers that
	 * post, or a page after it, with anything but a redirect (the login form again, an error or a
	 * locked-account page), the sign-in is refused and the call returns; the form is never posted
	 * again. Only network errors before the post are retried (SIGN_IN_RETRY_DELAYS_MS); a network
	 * error during or after the post ends the call. The username and password never appear in
	 * `steps` or `reason`.
	 */
	async signIn(
		username: string,
		password: string,
		options: { returnTo?: string } = {},
	): Promise<SignInResult> {
		const steps: string[] = [];
		const returnTo = options.returnTo ?? "/";
		let posts = 0;
		const fail = (reason: string, refused = false): SignInResult => ({
			ok: false,
			steps,
			posts,
			refused,
			reason,
		});
		let start: Response;
		try {
			start = await beforePost(
				() => this.client.request("GET", `/auth/login?returnTo=${encodeURIComponent(returnTo)}`),
				steps,
				"login",
			);
		} catch (error) {
			return fail(`network error before the login post: ${message(error)}`);
		}
		steps.push(`login ${start.status}`);
		let location = start.header("location");
		if (start.status !== 302 || !location)
			return fail(`/auth/login answered ${start.status} without a redirect`);
		const issuerJar = new CookieJar();
		let form: string | undefined;
		for (let hop = 0; hop < 12 && location; hop++) {
			const url = new URL(location, `http://${this.client.hostHeader}`);
			if (url.host === this.client.hostHeader) {
				let response: Response;
				try {
					const get = () => this.client.request("GET", url.pathname + url.search);
					response =
						posts === 0 ? await beforePost(get, steps, `arm ${url.pathname}`) : await get();
					steps.push(`arm ${url.pathname} ${response.status}`);
					await this.session();
				} catch (error) {
					return fail(
						`network error at the arm's ${url.pathname}${posts > 0 ? " after the login post; not posted again" : ""}: ${message(error)}`,
					);
				}
				const next = response.header("location");
				const redirected = response.status >= 300 && response.status < 400 && !!next;
				const flag = /signin=(cancelled|failed)/.exec(next ?? "")?.[0];
				const ok = redirected && !flag;
				const where = next ? ` to ${next.split("?")[0]}${flag ? ` (${flag})` : ""}` : "";
				return {
					ok,
					finalLocation: next,
					steps,
					posts,
					refused: false,
					...(ok
						? {}
						: { reason: `the arm's ${url.pathname} answered ${response.status}${where}` }),
				};
			}
			const issuer = new Client(url.origin, url.origin, issuerJar);
			const posting = form !== undefined;
			const method = posting ? "POST" : "GET";
			let response: Response;
			try {
				const send = () =>
					issuer.request(method, url.pathname + url.search, {
						rawBody: form,
						headers: posting ? { "Content-Type": "application/x-www-form-urlencoded" } : {},
					});
				if (posting) {
					posts++;
					response = await send();
				} else {
					response =
						posts === 0 ? await beforePost(send, steps, `issuer ${url.pathname}`) : await send();
				}
			} catch (error) {
				return fail(
					posting
						? `network error during the login post (${message(error)}); not posted again`
						: posts > 0
							? `network error at the issuer's ${url.pathname} after the login post (${message(error)}); not posted again`
							: `network error before the login post, at the issuer's ${url.pathname}: ${message(error)}`,
				);
			}
			steps.push(`issuer ${method} ${url.pathname} ${response.status}`);
			form = undefined;
			if (response.status >= 300 && response.status < 400) {
				location = new URL(response.header("location") ?? "", url).toString();
				continue;
			}
			const parsed = parseLoginForm(response.text, url.toString());
			if (posts > 0) {
				const page = parsed ? "the login form again" : "a page without a login form";
				return fail(
					`the issuer refused the login: ${posting ? "the login post" : `${url.pathname} after the login post`} answered ${response.status} with ${page}; posted once, not posted again`,
					true,
				);
			}
			if (!parsed)
				return fail(`the issuer's ${url.pathname} (${response.status}) has no login form`);
			const fields = new URLSearchParams(parsed.hidden);
			fields.set(parsed.userField, username);
			fields.set(parsed.passwordField, password);
			form = fields.toString();
			location = parsed.action;
		}
		return fail(
			posts > 0
				? "too many redirects after the login post; not posted again"
				: "too many redirects before a login form",
			posts > 0,
		);
	}

	/** Starts sign-in and returns as the issuer does when the user cancels (error=access_denied). */
	async cancelSignIn(returnTo = "/"): Promise<{ status: number; location?: string }> {
		const start = await this.client.request(
			"GET",
			`/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
		);
		const location = start.header("location");
		if (start.status !== 302 || !location) return { status: start.status };
		const authorize = new URL(location);
		const state = authorize.searchParams.get("state") ?? "";
		const redirectUri = authorize.searchParams.get("redirect_uri") ?? "/auth/callback";
		const callback = new URL(redirectUri, `http://${this.client.hostHeader}`);
		callback.searchParams.set("error", "access_denied");
		callback.searchParams.set("state", state);
		const response = await this.client.request("GET", callback.pathname + callback.search);
		return { status: response.status, location: response.header("location") };
	}
}

function decodeEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}

function attr(tag: string, name: string): string | undefined {
	const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
	if (!match) return undefined;
	return decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
}

/** Finds the first form with a password input (Keycloak's kc-form-login or any plain form). */
export function parseLoginForm(
	html: string,
	pageUrl: string,
): {
	action: string;
	hidden: Record<string, string>;
	userField: string;
	passwordField: string;
} | null {
	const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
	for (const formHtml of forms) {
		const inputs = formHtml.match(/<input\b[^>]*>/gi) ?? [];
		const password = inputs.find((i) => (attr(i, "type") ?? "").toLowerCase() === "password");
		if (!password) continue;
		const openTag = /<form\b[^>]*>/i.exec(formHtml)?.[0] ?? "";
		const action = new URL(attr(openTag, "action") ?? pageUrl, pageUrl).toString();
		const hidden: Record<string, string> = {};
		let userField = "username";
		for (const input of inputs) {
			const type = (attr(input, "type") ?? "text").toLowerCase();
			const name = attr(input, "name");
			if (!name) continue;
			if (type === "hidden") hidden[name] = attr(input, "value") ?? "";
			if (type === "text" || type === "email") userField = name;
		}
		return { action, hidden, userField, passwordField: attr(password, "name") ?? "password" };
	}
	return null;
}
