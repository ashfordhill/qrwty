// The qrwty.io edge router: a placeholder page, build info, the www and b redirects, and the
// static /versions/ pages (Workers static assets, fetched through the ASSETS binding).
// `route` is pure (Request in, Response out); `handle` adds the assets, which tests replace.

export interface Build {
	commit: string;
	builtAt: string;
}

export const APEX_HOST = "qrwty.io";
export const WWW_HOST = "www.qrwty.io";
/** Arm B's old staging host; it now points at B's record. */
export const B_HOST = "b.qrwty.io";
export const B_RECORD_URL = `https://${APEX_HOST}/versions/b/`;

/** The static-assets binding (`env.ASSETS`), or a test double. */
export interface Assets {
	fetch(request: Request): Promise<Response>;
}

/** Sent on every response. No HSTS yet: Q13 decides it, because preload is hard to undo. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
	"content-security-policy":
		"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
	"x-content-type-options": "nosniff",
	"referrer-policy": "no-referrer",
	"x-robots-tag": "noindex",
};

const HTML = "text/html; charset=utf-8";
const JSON_TYPE = "application/json; charset=utf-8";

// Every Cache-Control carries no-transform: without it Cloudflare's automatic Web Analytics
// injects an external beacon <script> into HTML that browsers receive.
const PAGE_CACHE = "no-cache, no-transform";
const NO_STORE = "no-store, no-transform";
const REDIRECT_CACHE = "public, max-age=3600, no-transform";
const ASSET_CACHE = "public, max-age=3600, no-transform";

// The /versions/ pages keep S01's policy, except two copies that need more from their own origin:
// the design prototype runs its own scripts and stylesheets (and shows its QR export as a data:
// or blob: image); the original page's copy links its own stylesheet and must not submit a form.
const PROTOTYPE_CSP =
	"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; base-uri 'none'; frame-ancestors 'none'";
const SNAPSHOT_CSP =
	"default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

/** The Content-Security-Policy for a path: S01's everywhere but the two copies above. */
export function contentSecurityPolicy(pathname: string): string {
	if (pathname.startsWith("/versions/design/")) return PROTOTYPE_CSP;
	if (pathname.startsWith("/versions/original/")) return SNAPSHOT_CSP;
	return SECURITY_HEADERS["content-security-policy"] as string;
}

/**
 * The Worker's answer: b.qrwty.io goes to B's record, /versions/ is served from the static
 * assets with the security headers added, and everything else is `route`.
 */
export async function handle(request: Request, build: Build, assets?: Assets): Promise<Response> {
	const url = new URL(request.url);
	if (url.hostname === B_HOST) {
		return respond(null, 301, { location: B_RECORD_URL, "cache-control": REDIRECT_CACHE });
	}
	const head = request.method === "HEAD";
	if (url.hostname === WWW_HOST || (request.method !== "GET" && !head) || !assets) {
		return route(request, build);
	}
	if (url.pathname === "/versions") {
		return respond(null, 301, {
			location: `https://${APEX_HOST}/versions/${url.search}`,
			"cache-control": REDIRECT_CACHE,
		});
	}
	if (!url.pathname.startsWith("/versions/")) return route(request, build);
	// A folder's page must end in "/", or its relative links resolve one level up.
	if (!url.pathname.endsWith("/") && !(url.pathname.split("/").at(-1) ?? "").includes(".")) {
		return respond(null, 301, {
			location: `https://${APEX_HOST}${url.pathname}/${url.search}`,
			"cache-control": REDIRECT_CACHE,
		});
	}

	const conditional = new Headers();
	for (const name of ["if-none-match", "if-modified-since"]) {
		const value = request.headers.get(name);
		if (value) conditional.set(name, value);
	}
	const upstream = await assets.fetch(new Request(url.toString(), { headers: conditional }));
	if (upstream.status === 404) {
		const missing = respond(notFoundPage(), 404, {
			"content-type": HTML,
			"cache-control": NO_STORE,
		});
		return head ? new Response(null, { status: 404, headers: missing.headers }) : missing;
	}
	const headers: Record<string, string> = {
		...SECURITY_HEADERS,
		"content-security-policy": contentSecurityPolicy(url.pathname),
	};
	for (const name of ["content-type", "etag", "last-modified", "location"]) {
		const value = upstream.headers.get(name);
		if (value) headers[name] = value;
	}
	// The assets give JSON Lines no type; with nosniff a browser would then only download it.
	if (!headers["content-type"] && url.pathname.endsWith(".jsonl")) {
		headers["content-type"] = "text/plain; charset=utf-8";
	}
	const redirect = upstream.status >= 300 && upstream.status < 400 && upstream.status !== 304;
	headers["cache-control"] = redirect
		? NO_STORE
		: (headers["content-type"] ?? "").startsWith("text/html")
			? PAGE_CACHE
			: ASSET_CACHE;
	const bodyless = head || redirect || upstream.status === 304;
	return new Response(bodyless ? null : upstream.body, { status: upstream.status, headers });
}

export function route(request: Request, build: Build): Response {
	const url = new URL(request.url);
	const head = request.method === "HEAD";

	if (url.hostname === WWW_HOST) {
		return respond(null, 301, {
			location: `https://${APEX_HOST}${url.pathname}${url.search}`,
			"cache-control": REDIRECT_CACHE,
		});
	}

	if (request.method !== "GET" && !head) {
		return respond(page("Method not allowed", "<p>This address only answers GET.</p>"), 405, {
			"content-type": HTML,
			allow: "GET, HEAD",
			"cache-control": NO_STORE,
		});
	}

	let response: Response;
	switch (url.pathname) {
		case "/":
			response = respond(homePage(build), 200, {
				"content-type": HTML,
				"cache-control": PAGE_CACHE,
			});
			break;
		case "/healthz":
			response = respond(json({ ok: true, ...buildObject(build) }), 200, {
				"content-type": JSON_TYPE,
				"cache-control": NO_STORE,
			});
			break;
		case "/build.json":
			response = respond(json(buildObject(build)), 200, {
				"content-type": JSON_TYPE,
				"cache-control": NO_STORE,
			});
			break;
		default:
			response = respond(notFoundPage(), 404, {
				"content-type": HTML,
				"cache-control": NO_STORE,
			});
	}
	return head
		? new Response(null, { status: response.status, headers: response.headers })
		: response;
}

/** The build object deploy.sh writes: the deployed commit and the UTC build time. */
export function buildObject(build: Build): Build {
	return { commit: build.commit, builtAt: build.builtAt };
}

/** First 7 characters of a full SHA, keeping a suffix such as "-dirty". */
export function shortCommit(commit: string): string {
	const match = /^([0-9a-f]{40})(.*)$/.exec(commit);
	return match ? match[1].slice(0, 7) + match[2] : commit;
}

/** "2026-11-14T22:50:03Z" -> "2026-11-14 22:50:03 UTC"; anything else is shown as given. */
export function utcLabel(iso: string): string {
	const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/.exec(iso);
	return match ? `${match[1]} ${match[2]} UTC` : iso;
}

function respond(body: string | null, status: number, headers: Record<string, string>): Response {
	return new Response(body, { status, headers: { ...SECURITY_HEADERS, ...headers } });
}

function json(value: unknown): string {
	return `${JSON.stringify(value)}\n`;
}

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const STYLE = `
:root{color-scheme:light dark;--bg:#f6f6f3;--fg:#16181d;--muted:#5b616d;--rule:#d9dad5}
@media (prefers-color-scheme:dark){:root{--bg:#111318;--fg:#eceef2;--muted:#9aa1ad;--rule:#2a2e36}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{min-height:100vh;display:grid;place-items:center;padding:0 16px;background:var(--bg);color:var(--fg);
font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
main{max-width:34rem;text-align:center}
h1{margin:0 0 .75rem;font-size:clamp(2.5rem,9vw,4rem);font-weight:700;letter-spacing:.12em;text-indent:.12em}
p{margin:0}
.more{margin-top:1.25rem;font-size:15px}
.build{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--rule);color:var(--muted);
font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
a{color:inherit}
`;

function page(title: string, body: string): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

function homePage(build: Build): string {
	const commit = escapeHtml(shortCommit(build.commit));
	const builtAt = escapeHtml(build.builtAt);
	return page(
		"QRWTY",
		`<h1>QRWTY</h1>
<p>Short links that never lose a click. In development.</p>
<p class="more"><a href="/versions/">Versions: what happened</a></p>
<p class="build">build <code>${commit}</code> · <time datetime="${builtAt}">${escapeHtml(utcLabel(build.builtAt))}</time></p>`,
	);
}

function notFoundPage(): string {
	return page("Not found · QRWTY", `<h1>404</h1>\n<p>Nothing here. <a href="/">qrwty.io</a></p>`);
}
