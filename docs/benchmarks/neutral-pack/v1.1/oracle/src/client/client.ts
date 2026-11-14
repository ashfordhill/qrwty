// Higher-level HTTP client over raw.ts: cookie jar, Host = public origin, edge headers, JSON.
import { randomUUID } from "node:crypto";
import { buildRequest, type RawResponse, type RawTarget, sendRaw, targetFromUrl } from "./raw.ts";

export class CookieJar {
	private readonly cookies = new Map<string, string>();

	store(setCookie: string[] | undefined): void {
		for (const line of setCookie ?? []) {
			const [pair, ...attrs] = line.split(";");
			const eq = pair.indexOf("=");
			if (eq <= 0) continue;
			const name = pair.slice(0, eq).trim();
			const value = pair.slice(eq + 1).trim();
			const expired = attrs.some((a) => {
				const [k, v] = a.split("=").map((s) => s?.trim() ?? "");
				if (/^max-age$/i.test(k)) return Number(v) <= 0;
				if (/^expires$/i.test(k)) return Date.parse(v) < Date.now();
				return false;
			});
			if (expired || value === "") this.cookies.delete(name);
			else this.cookies.set(name, value);
		}
	}

	header(): string | undefined {
		if (this.cookies.size === 0) return undefined;
		return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
	}

	names(): string[] {
		return [...this.cookies.keys()];
	}

	set(name: string, value: string): void {
		this.cookies.set(name, value);
	}

	clone(): CookieJar {
		const jar = new CookieJar();
		for (const [k, v] of this.cookies) jar.set(k, v);
		return jar;
	}

	clear(): void {
		this.cookies.clear();
	}
}

export interface Response {
	status: number;
	headers: Record<string, string[]>;
	rawHeaders: [string, string][];
	body: Buffer;
	text: string;
	json: unknown;
	/** First value of a header, lower-case name. */
	header(name: string): string | undefined;
	sentAt: number;
	endedAt: number;
	headWallMs: number;
}

export function wrap(raw: RawResponse): Response {
	const text = raw.body.toString("utf8");
	let json: unknown;
	try {
		json = text.length > 0 ? JSON.parse(text) : undefined;
	} catch {
		json = undefined;
	}
	return {
		status: raw.status,
		headers: raw.headers,
		rawHeaders: raw.rawHeaders,
		body: raw.body,
		text,
		json,
		header: (name) => raw.headers[name.toLowerCase()]?.[0],
		sentAt: raw.sentAt,
		endedAt: raw.endedAt,
		headWallMs: raw.headWallMs,
	};
}

export interface EdgeIdentity {
	/** Value of the adapter's edgeTokenEnv; without it the edge must ignore the other fields. */
	token?: string;
	clientIp?: string;
	country?: string;
	synthetic?: string;
}

export interface RequestOptions {
	headers?: Record<string, string>;
	body?: unknown;
	rawBody?: Buffer | string;
	edge?: EdgeIdentity;
	timeoutMs?: number;
	/** Overrides the Host header (A09 foreign host). */
	host?: string;
	/** Send no cookies even if the jar has some. */
	noCookies?: boolean;
}

/**
 * One client talks to one base URL (the public entry or a single replica). The Host header is
 * the public origin's host unless overridden. Cookies come from its jar; redirects are returned.
 */
export class Client {
	readonly target: RawTarget;
	readonly hostHeader: string;
	jar: CookieJar;

	readonly baseUrl: string;

	constructor(baseUrl: string, origin: string, jar = new CookieJar()) {
		this.baseUrl = baseUrl;
		this.target = targetFromUrl(baseUrl);
		this.hostHeader = new URL(origin).host;
		this.jar = jar;
	}

	/** Same jar, different base URL (for example a single replica). */
	at(baseUrl: string): Client {
		const client = new Client(baseUrl, `http://${this.hostHeader}`, this.jar);
		return client;
	}

	async request(method: string, path: string, options: RequestOptions = {}): Promise<Response> {
		const headers: [string, string][] = [["Host", options.host ?? this.hostHeader]];
		const extra = { ...(options.headers ?? {}) };
		let body: Buffer | string | undefined = options.rawBody;
		if (options.body !== undefined) {
			body = JSON.stringify(options.body);
			if (!Object.keys(extra).some((k) => k.toLowerCase() === "content-type")) {
				extra["Content-Type"] = "application/json";
			}
		}
		if (!Object.keys(extra).some((k) => k.toLowerCase() === "accept")) {
			extra.Accept = "application/json, text/html;q=0.5, */*;q=0.1";
		}
		if (!Object.keys(extra).some((k) => k.toLowerCase() === "user-agent")) {
			extra["User-Agent"] = "Mozilla/5.0 (X11; Linux x86_64) QRWTY-neutral-oracle/1.1";
		}
		const cookie = options.noCookies ? undefined : this.jar.header();
		if (cookie) headers.push(["Cookie", cookie]);
		if (options.edge?.token) {
			headers.push(["X-Oracle-Edge-Token", options.edge.token]);
			if (options.edge.clientIp) headers.push(["X-Oracle-Client-IP", options.edge.clientIp]);
			if (options.edge.country) headers.push(["X-Oracle-Country", options.edge.country]);
			if (options.edge.synthetic) headers.push(["QRWTY-Synthetic", options.edge.synthetic]);
		}
		for (const [k, v] of Object.entries(extra)) headers.push([k, v]);
		const bytes = buildRequest({ method, path, headers, body });
		const raw = await sendRaw(this.target, bytes, {
			timeoutMs: options.timeoutMs,
			expectBody: method !== "HEAD",
		});
		if (!options.noCookies) this.jar.store(raw.headers["set-cookie"]);
		return wrap(raw);
	}

	/** Sends caller-built bytes as they are (CR LF injection, spoofed Host). */
	async raw(
		bytes: Buffer,
		options: { timeoutMs?: number; head?: boolean } = {},
	): Promise<Response> {
		return wrap(
			await sendRaw(this.target, bytes, {
				timeoutMs: options.timeoutMs,
				expectBody: !options.head,
			}),
		);
	}
}

export function idempotencyKey(prefix = "oracle"): string {
	return `${prefix}-${randomUUID()}`;
}

/** Product error code of a response body, if it follows the contract's error shape. */
export function errorCode(response: Response): string | undefined {
	const body = response.json as { error?: { code?: unknown } } | undefined;
	return typeof body?.error?.code === "string" ? body.error.code : undefined;
}
