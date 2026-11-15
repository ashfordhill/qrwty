/*
 * QRWTY app (A5): the Q11 "Steel and Ice" prototype's screens, wired to the live API on this
 * origin. No framework, no build step, no inline script and no other origin (the Worker's CSP
 * allows only 'self'). Views are paths: / (create and result), /app/links, /app/links/<id>,
 * /app/links/<id>/clicks and /app/plans; the Worker serves this page for all of them.
 * Markup, classes, icons and copy come from docs/design/prototype/app.js where they fit, and the
 * control names are the frozen ones in docs/design/accessible-names.json.
 * The guest's result (with its claim proof) is kept in sessionStorage, so it survives the trip to
 * the sign-in page and "Save to my links" works from the same tab for 24 hours.
 */
(() => {
	"use strict";

	const doc = document;
	const $ = (sel, scope = doc) => scope.querySelector(sel);
	const esc = (s) =>
		String(s).replace(
			/[&<>"']/g,
			(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
		);
	const HOST = location.host;
	const tab = {
		get(k) {
			try {
				const v = sessionStorage.getItem(k);
				return v === null ? null : JSON.parse(v);
			} catch {
				return null;
			}
		},
		set(k, v) {
			try {
				if (v === null || v === undefined) sessionStorage.removeItem(k);
				else sessionStorage.setItem(k, JSON.stringify(v));
			} catch {
				/* storage unavailable: the result lasts until the page reloads */
			}
		},
	};
	const uuid = () =>
		crypto.randomUUID
			? crypto.randomUUID()
			: Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

	/* ---------------- Icons: ink outline, one accent fill, one light fill (Q11) ---------------- */
	const ICONS = {
		link: '<g transform="rotate(-45 12 12)"><rect class="o a" x="1.5" y="8.5" width="12" height="7" rx="3.5"/><rect class="o l" x="10.5" y="8.5" width="12" height="7" rx="3.5"/></g>',
		qr: '<rect class="o l" x="3" y="3" width="18" height="18" rx="3"/><rect class="o a" x="6.5" y="6.5" width="4" height="4" rx="1"/><rect class="o a" x="13.5" y="6.5" width="4" height="4" rx="1"/><rect class="o a" x="6.5" y="13.5" width="4" height="4" rx="1"/><rect class="k" x="14" y="14" width="2.4" height="2.4"/><rect class="k" x="16.6" y="16.6" width="2" height="2"/>',
		copy: '<rect class="o l" x="4" y="3" width="11.5" height="13" rx="2.5"/><rect class="o a" x="8.5" y="8" width="11.5" height="13" rx="2.5"/>',
		download: '<path class="o a" d="M9.2 3h5.6v7h3.7L12 16.3 5.5 10h3.7z"/><rect class="o l" x="3.5" y="17.5" width="17" height="3.5" rx="1.5"/>',
		open: '<rect class="o l" x="3" y="7" width="14" height="14" rx="3"/><path class="o a" d="M13 3h8v8l-2.8-2.8-4.9 4.9-3.2-3.2 4.9-4.9z"/>',
		save: '<path class="o a" d="M6 3.5h12V21l-6-4.4L6 21z"/>',
		list: '<rect class="o a" x="3" y="3" width="18" height="5" rx="2"/><rect class="o l" x="3" y="10" width="18" height="5" rx="2"/><rect class="o l" x="3" y="17" width="18" height="4.5" rx="2"/>',
		chart: '<rect class="o l" x="3" y="11" width="5" height="10" rx="1.5"/><rect class="o a" x="9.5" y="4" width="5" height="17" rx="1.5"/><rect class="o a" x="16" y="8" width="5" height="13" rx="1.5"/>',
		card: '<rect class="o l" x="2.5" y="5" width="19" height="14" rx="3"/><rect class="a" x="3.5" y="8.6" width="17" height="3.6"/><path class="o" d="M2.5 8.6h19M2.5 12.2h19M6 15.8h4"/>',
		person: '<circle class="o a" cx="12" cy="8" r="4.5"/><path class="o l" d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/>',
		globe: '<circle class="o l" cx="12" cy="12" r="9"/><ellipse class="a" cx="12" cy="12" rx="3.4" ry="8.4"/><path class="o" d="M3 12h18M12 3c3.2 3.4 3.2 14.6 0 18M12 3c-3.2 3.4-3.2 14.6 0 18"/>',
		warn: '<path class="o a" d="M12 3.2 21.5 20H2.5z"/><path class="o" d="M12 9.5v4.6"/><circle class="k" cx="12" cy="17" r="1.15"/>',
		offline: '<path class="o l" d="M7 18.5h10.5a4 4 0 0 0 .7-7.9 6 6 0 0 0-11.5-1.4A4.6 4.6 0 0 0 7 18.5z"/><path class="o a" d="M3.2 5.3 5.3 3.2l15.5 15.5-2.1 2.1z"/>',
		clock: '<circle class="o a" cx="12" cy="12" r="9"/><path class="o" d="M12 7v5.2l3.6 2.1"/>',
		shield: '<path class="o a" d="M12 2.5 20 5.8v6.1c0 4.6-3.4 8.3-8 9.6-4.6-1.3-8-5-8-9.6V5.8z"/><path class="o" d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
		check: '<circle class="o a" cx="12" cy="12" r="9"/><path class="o" d="M7.6 12.4l3 3 5.9-6.4"/>',
		pencil: '<path class="o a" d="M4 20l1-4.6L15.6 4.8a2.1 2.1 0 0 1 3 0l.6.6a2.1 2.1 0 0 1 0 3L8.6 19z"/><path class="o" d="M13.6 6.9l3.5 3.5"/>',
		pause: '<circle class="o l" cx="12" cy="12" r="9"/><rect class="o a" x="8.3" y="8" width="2.6" height="8" rx=".8"/><rect class="o a" x="13.1" y="8" width="2.6" height="8" rx=".8"/>',
		trash: '<rect class="o l" x="9" y="2.8" width="6" height="2.6" rx="1"/><path class="o a" d="M5.8 8.5h12.4l-1.1 12.2H6.9z"/><rect class="o l" x="3.5" y="5.4" width="17" height="3.1" rx="1.2"/><path class="o" d="M10 12v5.2M14 12v5.2"/>',
		sheet: '<path class="o l" d="M6 2.5h8.5L19 7v14.5H6z"/><path class="o a" d="M14.5 2.5V7H19z"/><path class="o" d="M9 12h7M9 15.5h7M9 19h4"/>',
		info: '<circle class="o a" cx="12" cy="12" r="9"/><path class="o" d="M12 11v6"/><circle class="k" cx="12" cy="7.6" r="1.2"/>',
		lock: '<path class="o l" d="M7 10.5V7.6a5 5 0 0 1 10 0v2.9h-2.8V7.7a2.2 2.2 0 0 0-4.4 0v2.8z"/><rect class="o a" x="4.5" y="10" width="15" height="11" rx="2.5"/><circle class="k" cx="12" cy="15.5" r="1.4"/>',
		back: '<path class="cur" d="M15 5l-7 7 7 7"/>',
		next: '<path class="cur" d="M9 5l7 7-7 7"/>',
		retry: '<path class="cur" d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4.6h-4.6"/>',
		minus: '<circle class="o l" cx="12" cy="12" r="9"/><path class="o" d="M8 12h8"/>',
	};
	const ic = (name, tone = "sky", cls = "") =>
		`<svg class="ic t-${tone} ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

	const CHIPS = {
		active: ["n-ok", '<circle class="mk" cx="6" cy="6" r="5"/>', "Active"],
		disabled: ["n-off", '<rect class="mk" x="2" y="1" width="3" height="10" rx="1"/><rect class="mk" x="7" y="1" width="3" height="10" rx="1"/>', "Disabled"],
		blocked: ["n-bad", '<path class="mk" d="M6 .5 11 2.6v3.2c0 2.9-2.1 5-5 5.7C3.1 10.8 1 8.7 1 5.8V2.6z"/>', "Blocked"],
		free: ["n-info", '<circle class="mk" cx="6" cy="6" r="5"/>', "Free"],
		current: ["n-ok", '<circle class="mk" cx="6" cy="6" r="5"/>', "Current plan"],
	};
	const chip = (kind, text) => {
		const [cls, mark, label] = CHIPS[kind] ?? CHIPS.active;
		return `<span class="chip ${cls}"><svg viewBox="0 0 12 12" aria-hidden="true">${mark}</svg>${esc(text ?? label)}</span>`;
	};

	/* ---------------- URL helpers ---------------- */
	function splitUrl(url) {
		const m = /^(https?:)\/\/([^/?#]+)(.*)$/i.exec(url);
		if (!m) return { scheme: "", host: url, rest: "" };
		return { scheme: `${m[1].toLowerCase()}//`, host: m[2].toLowerCase(), rest: m[3] };
	}
	function punycodeHost(host) {
		try {
			return new URL(`https://${host}`).hostname;
		} catch {
			return host;
		}
	}
	function truncMid(s, max) {
		if (s.length <= max) return s;
		const head = Math.ceil(max * 0.58);
		const tail = max - head - 1;
		return `${s.slice(0, head)}…${s.slice(s.length - tail)}`;
	}
	const slugOf = (shortUrl) => {
		try {
			return new URL(shortUrl).pathname.slice(1);
		} catch {
			return "";
		}
	};
	const shortText = (shortUrl) => `${HOST}/${slugOf(shortUrl)}`;
	function shortHtml(shortUrl) {
		const u = new URL(shortUrl);
		return `<span class="scheme">${esc(u.protocol)}//</span><span class="host">${esc(u.host)}/</span><span class="slug">${esc(u.pathname.slice(1))}</span>`;
	}
	/* The server decides; this only catches what is plainly not a public web link (Q11 copy). */
	function validate(raw) {
		const v = raw.trim();
		if (!v) return "Paste a link first. It should start with https://";
		if (/\s/.test(v)) return "This has spaces in it, so it isn't a web address. Check what you pasted.";
		if (!/^[a-z][a-z0-9+.-]*:/i.test(v))
			return /\./.test(v) ? "Add https:// at the start of the link." : "This isn't a web address. A link looks like https://example.com/page";
		let u;
		try {
			u = new URL(v);
		} catch {
			return "This isn't a web address. Check for missing or extra characters.";
		}
		if (!/^https?:$/.test(u.protocol)) return "Only web links that start with https:// or http:// can be shortened.";
		if (u.username || u.password) return "Remove the username or password from the link before shortening it.";
		const h = u.hostname;
		if (h === "localhost" || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === "[::1]" || !h.includes("."))
			return "QRWTY can only link to public websites, not local or private addresses.";
		if (h === location.hostname || h.endsWith(`.${location.hostname}`)) return "This is already a QRWTY link, so it can't be shortened again.";
		if (new TextEncoder().encode(v).length > 8192) return "This link is longer than 8 KB. Remove some of the part after the ? and try again.";
		return null;
	}
	/* The server's reason ("the host is not a valid name") as a sentence. */
	const reasonText = (error) => {
		const r = typeof error?.reason === "string" ? error.reason : "";
		return r ? `QRWTY can't link to this: ${r}.` : "QRWTY can't link to this address. Check it and try again.";
	};

	const fmtDate = (iso) => {
		const d = new Date(iso);
		return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
	};
	const fmtTime = (iso) => {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return "";
		return `${fmtDate(iso)}, ${d.toISOString().slice(11, 16)} UTC`;
	};
	const fmtDay = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
	const todayUtc = () => new Date().toISOString().slice(0, 10);
	const daysBefore = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
	const num = (n) => Number(n ?? 0).toLocaleString("en-US");

	/* ---------------- The API (same origin, cookie session, CSRF header on mutations) ---------------- */
	let session = null; // {authenticated, csrfToken, account}

	async function request(method, path, { body, key, ifMatch, accept } = {}) {
		const headers = { accept: accept ?? "application/json" };
		if (method !== "GET" && session?.csrfToken) headers["x-csrf-token"] = session.csrfToken;
		if (body !== undefined) headers["content-type"] = "application/json";
		if (key) headers["idempotency-key"] = key;
		if (ifMatch !== undefined) headers["if-match"] = `"${ifMatch}"`;
		let r;
		try {
			r = await fetch(path, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
				credentials: "same-origin",
				cache: "no-store",
			});
		} catch {
			return { status: 0, data: null, error: null, code: navigator.onLine ? "network" : "offline" };
		}
		const type = r.headers.get("content-type") ?? "";
		let data = null;
		let text = null;
		if (type.includes("json")) {
			try {
				data = await r.json();
			} catch {
				data = null;
			}
		} else if (r.status !== 204) {
			text = await r.text().catch(() => null);
		}
		const error = data && typeof data.error === "object" ? data.error : null;
		return { status: r.status, data, text, headers: r.headers, error, code: error?.code ?? null };
	}

	/** GET /api/v1/session: the session (a guest one is issued when there is none). */
	async function loadSession() {
		let a = await request("GET", "/api/v1/session");
		// A service that is starting (minimum 0 instances) may answer 503 at first.
		for (let attempt = 1; attempt < 5 && (a.status === 0 || a.status >= 500); attempt += 1) {
			await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
			a = await request("GET", "/api/v1/session");
		}
		if (a.status === 401) {
			// The cookie had ended (it is cleared); this browser is a guest again.
			S.banner = { kind: "expired" };
			a = await request("GET", "/api/v1/session");
		}
		if (a.status === 200 && a.data) session = a.data;
		return a;
	}

	/**
	 * A call; a refused CSRF token or a missing guest session is fetched again and retried once.
	 * A read, or a write with an Idempotency-Key (which replays), is retried on 503 and network
	 * failures: a service at minimum 0 instances may answer 503 while it starts (A3's known limit).
	 */
	async function api(method, path, opts = {}) {
		if (!session) await loadSession();
		const safe = method === "GET" || !!opts.key;
		let a = await request(method, path, opts);
		for (let attempt = 1; safe && attempt < 5 && (a.status === 503 || (a.status === 0 && a.code !== "offline")); attempt += 1) {
			const wait = Math.min(5, Number(a.headers?.get("retry-after")) || attempt);
			await new Promise((resolve) => setTimeout(resolve, wait * 1000));
			a = await request(method, path, opts);
		}
		if ((a.status === 403 && a.code === "csrf_failed") || (a.status === 401 && method !== "GET" && a.code === "unauthenticated" && !session?.authenticated)) {
			await loadSession();
			a = await request(method, path, opts);
		}
		return a;
	}

	/** After a 401 on an account call: the session ended; fetch a guest one and say so. */
	async function sessionEnded() {
		session = null;
		await loadSession();
		S.banner = { kind: "expired" };
	}

	/* ---------------- State ---------------- */
	const S = {
		view: "create",
		id: null,
		banner: null, // {kind: expired | signinFailed | signinCancelled | signedOut | deleted}
		draft: "",
		fieldError: null,
		alert: null, // create's {kind, seconds?, error?}
		busy: false,
		createKey: null,
		createKeyFor: null,
		result: tab.get("qrwty-result"), // {id, shortUrl, destination, createdAt, owned, claim, claimKey, save}
		copy: null, // "ok" | "failed"
		downloaded: null,
		links: { state: "idle", items: [], next: null, more: false, error: null },
		link: { state: "idle", data: null, editing: false, draft: "", fieldError: null, notice: null, busy: false, totals: null, newer: null },
		clicks: { state: "idle", data: null, days: 7, notice: null, exporting: false },
		plans: { state: "idle", me: null, billing: null, busy: false, error: null },
		tier: null, // "free" | "paid", from GET /api/v1/me/billing
	};
	const keepResult = () => tab.set("qrwty-result", S.result);

	/* ---------------- Routing ---------------- */
	function parse(pathname) {
		if (pathname === "/" || pathname === "/app" || pathname === "/app/") return { view: "create", id: null };
		if (pathname === "/app/links") return { view: "links", id: null };
		// Stripe Checkout returns to /billing?checkout=success|cancelled, the portal to
		// /billing?portal=returned (http-contract §9); loadPlans reads them.
		if (pathname === "/app/plans" || pathname === "/billing") return { view: "plans", id: null };
		let m = /^\/app\/links\/([^/]+)$/.exec(pathname);
		if (m) return { view: "link", id: decodeURIComponent(m[1]) };
		m = /^\/app\/links\/([^/]+)\/clicks$/.exec(pathname);
		if (m) return { view: "clicks", id: decodeURIComponent(m[1]) };
		return { view: "create", id: null, unknown: true };
	}
	const pathFor = (view, id) =>
		({ create: "/", links: "/app/links", plans: "/app/plans", link: `/app/links/${encodeURIComponent(id ?? "")}`, clicks: `/app/links/${encodeURIComponent(id ?? "")}/clicks` })[view] ?? "/";

	function navigate(path, { replace = false } = {}) {
		try {
			if (replace) history.replaceState(null, "", path);
			else history.pushState(null, "", path);
		} catch {
			location.assign(path);
			return;
		}
		enter({ moved: true });
	}

	/** Shows the view for the current path and loads what it needs. */
	function enter({ moved = false } = {}) {
		const p = parse(location.pathname);
		if (p.unknown) history.replaceState(null, "", "/");
		S.view = p.view;
		S.id = p.id;
		S.copy = null;
		if (p.view === "links") loadLinks();
		if (p.view === "link") loadLink(p.id);
		if (p.view === "clicks") loadClicks(p.id, 7);
		if (p.view === "plans") loadPlans();
		render({ moved });
	}

	const returnPath = () => {
		const u = new URL(location.href);
		u.searchParams.delete("signin");
		return `${u.pathname}${u.search}`;
	};
	const signIn = (to = returnPath()) => location.assign(`/auth/login?returnTo=${encodeURIComponent(to)}`);

	/* ---------------- Rendering ---------------- */
	const view = $("#view");
	let noticeSeq = 0;
	function notice(kind, iconName, tone, title, body, extra = "", attrs = "") {
		noticeSeq += 1;
		const id = `n-${noticeSeq}`;
		return `<div class="notice ${kind}" ${attrs.replace("$ID", id)}>${ic(iconName, tone)}<strong id="${id}">${title}</strong><p>${body}</p>${extra ? `<div class="row">${extra}</div>` : ""}</div>`;
	}
	const alertBox = (kind, iconName, tone, title, body, extra) => notice(kind, iconName, tone, title, body, extra, 'role="alert" aria-labelledby="$ID"');
	const statusBox = (kind, iconName, tone, title, body, extra) => notice(kind, iconName, tone, title, body, extra, 'role="status" aria-labelledby="$ID"');
	const signInAgain = (label = "Sign in again") => `<button type="button" class="btn btn-sm btn-account" data-act="signin">${ic("person", "lilac")}${label}</button>`;

	function bannerHtml() {
		const b = S.banner;
		if (!b) return "";
		if (b.kind === "expired")
			return alertBox("n-warn", "clock", "butter", "Session expired", "You were signed out, so QRWTY treats this browser as a guest now. Sign in again to see your links. Nothing was changed.", signInAgain());
		if (b.kind === "signinFailed")
			return alertBox("n-bad", "warn", "butter", "Sign-in did not finish", "The sign-in page sent back an error. Your link still works and is still here.", signInAgain("Try again"));
		if (b.kind === "signinCancelled") return statusBox("n-info", "info", "sky", "Sign-in cancelled", "You are still a guest. Links you make keep working without an account.");
		if (b.kind === "signedOut") return statusBox("n-ok", "check", "mint", "Signed out", "You are signed out on this browser. Your links keep working for everyone who opens them.");
		if (b.kind === "deleted")
			return statusBox("n-info", "info", "sky", "Your account was deleted", "Its links are turned off and no longer belong to any account. You can still make guest links, or sign up again to start a new, empty account.");
		return "";
	}

	function renderNav() {
		const items = [
			["create", "/", "Create", "link", "sky"],
			["links", "/app/links", "My links", "list", "mint"],
			["plans", "/app/plans", "Plans and billing", "card", "butter"],
		];
		const on = { create: "create", links: "links", link: "links", clicks: "links", plans: "plans" }[S.view];
		$("#nav").innerHTML = items
			.map(([v, href, label, icon, tone]) => `<li><a href="${href}" data-nav="${href}"${on === v ? ' aria-current="page"' : ""}>${ic(icon, tone)}<span>${label}</span></a></li>`)
			.join("");
		const acct = session?.authenticated ? session.account ?? {} : null;
		if (acct) {
			const label = acct.name || acct.email || "Your account";
			const initials = (label.replace(/@.*/, "").match(/[A-Za-z0-9]+/g) ?? ["Q"]).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
			$("#account").innerHTML = `<span class="who"><span class="avatar" aria-hidden="true">${esc(initials)}</span><span class="name">${esc(truncMid(label, 28))}</span><span class="plan">${S.tier === "paid" ? "Paid plan" : "Free plan"}</span></span><button type="button" class="btn btn-sm btn-chrome" data-act="signout">Sign out</button>`;
		} else if (session) {
			$("#account").innerHTML = `<button type="button" class="btn btn-sm btn-chrome" data-act="signin">${ic("person", "lilac")}Sign in</button>`;
		} else $("#account").innerHTML = "";
	}

	/* ---- Create and result ---- */
	function dockHtml() {
		const r = !!S.result;
		const err = S.fieldError;
		const d = S.draft;
		const parts = d && !err ? splitUrl(d.trim()) : null;
		const idn = parts && /[^ -~]/.test(parts.host);
		const hint = parts?.host && /^https?:\/\/[^/?#]+\./i.test(d.trim())
			? `${ic("globe", "sky")}<span>Will open <b>${esc(parts.host)}</b>${idn ? ` <span class="muted">(shown to some browsers as ${esc(punycodeHost(parts.host))})</span>` : ""}</span>`
			: `${ic("info", "sky")}<span>Any public web address. Links never expire, and you don't need an account.</span>`;
		const busy = S.busy;
		const a = S.alert;
		const retry = `<button type="button" class="btn btn-sm" data-act="retry">${ic("retry")}Try again</button>`;
		let alerts = "";
		if (a?.kind === "offline") alerts = alertBox("n-warn", "offline", "sky", "You are offline", "Connect to the internet, then press Shorten again. Your link is still in the box.");
		if (a?.kind === "rate")
			alerts = alertBox("n-warn", "clock", "butter", "Too many new links", `This connection made a lot of links in a short time. Try again in ${a.seconds ?? 30} seconds. Nothing was created.`);
		if (a?.kind === "reputation")
			alerts = alertBox("n-bad", "shield", "rose", "This destination was refused", "Our safety check lists this address for phishing or malware, so QRWTY won't link to it. If you typed it, check the spelling.");
		if (a?.kind === "provider")
			alerts = alertBox("n-bad", "warn", "butter", "Link not created", "We couldn't run the safety check on this address just now, so nothing was created. Try again in a minute.", retry);
		if (a?.kind === "error") alerts = alertBox("n-bad", "warn", "butter", "Link not created", "QRWTY didn't answer in time. Nothing was created. Try again in a few seconds.", retry);
		if (a?.kind === "quota")
			alerts = alertBox("n-warn", "warn", "butter", "Monthly link limit reached", `Your account has made all ${a.error?.limit ?? 5} new links for this month${a.error?.periodEnd ? `; more unlock on ${esc(fmtDate(a.error.periodEnd))}` : ""}. Every existing link keeps working. Sign out to make a guest link instead.`, `<a class="btn btn-sm" href="/app/plans" data-nav="/app/plans">See plans</a>`);
		return `<form class="dock${r ? " has-result" : ""}" data-form="create" novalidate>
			<label class="label" for="dest">Long link</label>
			<div class="dock-row">
				<input class="input" id="dest" name="dest" type="url" inputmode="url" autocomplete="url" spellcheck="false"
					placeholder="${r ? "Paste another long link" : "https://"}" value="${esc(d)}"${err ? ' aria-invalid="true" aria-describedby="dest-error"' : ' aria-describedby="dest-hint"'} />
				<button type="submit" class="btn btn-primary" id="shorten"${busy ? ' aria-busy="true" aria-disabled="true"' : ""}>${busy ? '<span class="spin" aria-hidden="true"></span>' : ic("link", "sky")}Shorten</button>
			</div>
			${err ? `<p class="field-error" id="dest-error" role="alert">${ic("warn", "butter")}<span>${esc(err)}</span></p>` : `<p class="hint" id="dest-hint">${hint}</p>`}
			<p class="sr-only" aria-live="polite">${busy ? "Creating your short link" : ""}</p>
			<div class="alerts">${alerts}</div>
		</form>`;
	}

	function qrSvg(shortUrl) {
		return QrwtyQr.toSvg(QrwtyQr.encode(shortUrl)).replace("<svg ", '<svg role="img" aria-label="QR code for the short link" ');
	}
	function pngInfo(shortUrl) {
		const dim = QrwtyQr.encode(shortUrl).size + 8;
		const px = Math.floor(1200 / dim) * dim;
		return { px, cm: ((px / 300) * 2.54).toFixed(1) };
	}

	function saveBand(r) {
		const band = (cls, icon, tone, title, body, extra = "", role = "status") =>
			`<div class="save ${cls}" role="${role}" aria-labelledby="save-title">${ic(icon, tone, "ic-lg")}<div class="stack gap-1"><h3 id="save-title">${title}</h3><p>${body}</p></div>${extra}</div>`;
		const manage = `<a class="btn" href="${pathFor("link", r.id)}" data-nav="${pathFor("link", r.id)}">${ic("pencil", "butter")}Manage this link</a>`;
		const who = session?.account?.email ? ` as ${esc(session.account.email)}` : "";
		if (r.owned)
			return band("n-ok", "check", "mint", "Saved to My links", `${r.save === "saved" ? "Signed in" : "Made while signed in"}${who}. You can now change where it goes and see its clicks.`, manage);
		if (r.save === "expired") return band("n-off", "clock", "sky", "This link can no longer be saved", "Links can be saved to an account for 24 hours after you make them, from the same browser tab. It keeps working for everyone.");
		if (r.save === "consumed") return band("n-off", "info", "sky", "This link is already in an account", "It was saved earlier. If it's yours, sign in with that account to find it in My links.");
		if (r.save === "quota")
			return band("n-warn", "warn", "butter", "No saves left this month", `Your account has used all ${r.quota?.limit ?? 5} new links for this month, and saving one counts as a new link. This link keeps working for everyone.`, `<a class="btn" href="/app/plans" data-nav="/app/plans">See plans</a>`);
		if (!r.claim) return "";
		if (Date.parse(r.claim.expiresAt) <= Date.now()) return band("n-off", "clock", "sky", "This link can no longer be saved", "Links can be saved to an account for 24 hours after you make them, from the same browser tab. It keeps working for everyone.");
		const busy = r.save === "saving" || r.save === "signin";
		const failed = r.save === "error" ? `<p class="field-error" role="alert">${ic("warn", "butter")}<span>Saving didn't finish. Try again; it can't be saved twice.</span></p>` : "";
		return `<div class="save">${ic("save", "lilac", "ic-lg")}<div class="stack gap-1"><h3>Keep this link in your account</h3><p>Change where it goes, see clicks by day, and find it again later. It works the same either way. Save it from this tab within 24 hours.</p>${failed}</div><button type="button" class="btn btn-account" data-act="save"${busy ? ' aria-busy="true" aria-disabled="true"' : ""}>${busy ? '<span class="spin" aria-hidden="true"></span>' : ic("person", "lilac")}Save to my links</button></div>`;
	}

	function trayHtml() {
		const r = S.result;
		const p = splitUrl(r.destination);
		const info = pngInfo(r.shortUrl);
		let feedback = "";
		if (S.copy === "ok") feedback = `${ic("check", "mint")}Copied to clipboard`;
		if (S.copy === "failed") feedback = `${ic("warn", "butter")}Your browser blocked copying. The link is selected, so use your browser's Copy.`;
		const made = Date.now() - Date.parse(r.createdAt) < 90000 ? "Made just now" : `Made ${esc(fmtDate(r.createdAt))}`;
		return `<section class="tray" aria-labelledby="tray-title">
			<div class="tray-main">
				<div class="row between">
					<h2 id="tray-title" class="ready" tabindex="-1">${ic("check", "mint")}Your short link is ready</h2>
					<span class="meta">${made} · never expires</span>
				</div>
				<span class="shorturl" id="short-url" role="textbox" aria-readonly="true" aria-label="Short link" tabindex="0">${shortHtml(r.shortUrl)}</span>
				<div class="actions">
					<button type="button" class="btn btn-primary" data-act="copy">${ic("copy", "sky")}Copy short link</button>
					<a class="btn" href="${esc(r.shortUrl)}" target="_blank" rel="noopener">${ic("open", "sky")}Open short link</a>
					<span id="copy-feedback" class="feedback${S.copy === "ok" ? " ok" : S.copy === "failed" ? " bad" : ""}" aria-live="polite">${feedback}</span>
				</div>
				<div class="dest">
					${ic("globe", "sky")}
					<span>Opens <span class="host">${esc(p.host)}</span></span>
					<span class="full" title="${esc(r.destination)}">${esc(truncMid(r.destination, 96))}</span>
				</div>
			</div>
			<div class="tray-side">
				<div class="sticker">${qrSvg(r.shortUrl)}</div>
				<div class="downloads">
					<button type="button" class="btn" data-act="png">${ic("download", "mint")}Download PNG</button>
					<button type="button" class="btn" data-act="svg">${ic("download", "mint")}Download SVG</button>
				</div>
				<p class="qr-meta" id="dl-feedback" aria-live="polite">${
					S.downloaded
						? `<span class="feedback ok center">${ic("check", "mint")}Saved ${esc(S.downloaded)}</span>`
						: `PNG ${info.px} px, sharp up to ${info.cm} cm at 300 dpi. SVG scales to any size. Keep the white border when you print.`
				}</p>
			</div>
			${saveBand(r)}
		</section>`;
	}

	function placeholderTray() {
		return `<section class="placeholder-tray" aria-label="Result preview">
			<div class="stack">
				<p><strong>Your short link and QR code appear here.</strong></p>
				<div class="ghost-lines" aria-hidden="true"><span style="width:72%"></span><span style="width:48%"></span></div>
				<p class="meta">Copy it, open it, or download the QR code as PNG or SVG. Sign in only if you want to edit it or see clicks later.</p>
			</div>
			<div class="ghost-qr" aria-hidden="true">${ic("qr", "sky", "ic-xl")}</div>
		</section>`;
	}

	function viewCreate() {
		return `<div class="page">
			<div class="page-head"><div>
				<h1 tabindex="-1">Shorten a link</h1>
				<p class="lead">Paste a long address. You get a short link and a QR code right away.</p>
			</div></div>
			${bannerHtml()}
			${dockHtml()}
			${S.result ? trayHtml() : placeholderTray()}
		</div>`;
	}

	/* Account views before the session is known. */
	const waiting = (title) =>
		`<div class="page"><div class="page-head"><div><h1 tabindex="-1">${title}</h1></div></div><p class="meta" role="status">Loading…</p></div>`;

	/* ---- My links ---- */
	const signedOutHtml = (title, body) =>
		`<div class="empty">${ic("person", "lilac", "ic-lg")}<h2>${title}</h2><p>${body}</p><div class="row"><button type="button" class="btn btn-account" data-act="signin">${ic("person", "lilac")}Sign in to see your links</button><a class="btn" href="/" data-nav="/">Shorten a link</a></div></div>`;

	function rowHtml(l) {
		const p = splitUrl(l.destination);
		const hostId = `row-host-${esc(l.id)}`;
		const href = pathFor("link", l.id);
		return `<li class="linkrow">
			<div class="dest-cell"><span class="host" id="${hostId}" title="${esc(p.host)}">${esc(p.host)}</span><span class="path" title="${esc(l.destination)}">${esc(truncMid(p.rest || "/", 60))}</span></div>
			<div class="status-cell">${chip(l.state)}</div>
			<span class="short">${esc(shortText(l.shortUrl))}</span>
			<span class="clicks"><b>${esc(fmtDate(l.createdAt))}</b>made</span>
			<div class="acts">
				<button type="button" class="btn btn-sm" data-act="copy-row" data-url="${esc(l.shortUrl)}" aria-describedby="${hostId}">${ic("copy", "sky")}Copy link</button>
				<a class="btn btn-sm" href="${href}" data-nav="${href}" aria-describedby="${hostId}">Manage${ic("next")}</a>
			</div>
		</li>`;
	}

	function viewLinks() {
		if (!session) return waiting("My links");
		const L = S.links;
		const head = `<div class="page-head"><div><h1 tabindex="-1">My links</h1><p class="lead">Every link in your account, newest first.</p></div></div>`;
		const banner = bannerHtml();
		if (!session?.authenticated)
			return `<div class="page">${head}${banner}${signedOutHtml("Sign in to see your links", "Links you make while signed in, or save from a result, are listed here. Making a link never needs an account.")}</div>`;
		if (L.state === "loading" && !L.items.length)
			return `<div class="page">${head}${banner}<div role="status" aria-label="Loading your links" class="list" aria-busy="true">${Array.from({ length: 4 }, () => `<div class="linkrow"><div class="dest-cell"><span class="skel" style="width:60%"></span><span class="skel" style="width:85%"></span></div><span class="skel"></span><span class="skel"></span><span class="skel"></span><span class="skel" style="width:120px"></span></div>`).join("")}</div><p class="meta">Loading your links…</p></div>`;
		const failed = L.error
			? alertBox("n-bad", "offline", "sky", "Could not load your links", "QRWTY didn't answer. Your links still work for everyone who opens them. Check your connection and try again.", `<button type="button" class="btn btn-sm" data-act="links-retry">${ic("retry")}Try again</button>`)
			: "";
		if (!L.items.length && L.error) return `<div class="page">${head}${banner}${failed}</div>`;
		if (!L.items.length)
			return `<div class="page">${head}${banner}<div class="empty">${ic("list", "mint", "ic-lg")}<h2>No links yet</h2><p>Links you make while signed in, and guest links you save from a result, show up here.</p><a class="btn btn-primary" href="/" data-nav="/">${ic("link", "sky")}Shorten a link</a></div></div>`;
		const more = L.next
			? `<button type="button" class="btn btn-sm" data-act="more"${L.more ? ' aria-busy="true" aria-disabled="true"' : ""}>${L.more ? '<span class="spin" aria-hidden="true"></span>' : ""}Show more links</button>`
			: '<span class="muted">All links shown</span>';
		return `<div class="page">${head}${banner}${failed}
			<div class="list"><div class="list-head" aria-hidden="true"><span>Destination</span><span>Status</span><span>Short link</span><span>Made</span><span></span></div>
			<ul class="rows" role="list" aria-label="Links">${L.items.map(rowHtml).join("")}</ul>
			<div class="list-foot"><span class="num">Showing ${L.items.length}${L.next ? "" : ` of ${L.items.length}`}</span>${more}</div></div>
		</div>`;
	}

	async function loadLinks(more = false) {
		const L = S.links;
		if (!session?.authenticated) return;
		if (more) L.more = true;
		else Object.assign(L, { state: "loading", items: [], next: null, error: null });
		render();
		const q = more && L.next ? `?limit=20&cursor=${encodeURIComponent(L.next)}` : "?limit=20";
		const a = await api("GET", `/api/v1/me/links${q}`);
		L.more = false;
		if (a.status === 200 && Array.isArray(a.data?.items)) {
			L.items = more ? L.items.concat(a.data.items) : a.data.items;
			L.next = a.data.nextCursor ?? null;
			L.state = "ready";
			L.error = null;
		} else if (a.status === 401) {
			await sessionEnded();
		} else {
			L.state = "error";
			L.error = a.code ?? String(a.status);
		}
		if (S.view === "links") render();
	}

	/* ---- Link details ---- */
	function viewLink() {
		if (!session) return waiting("Link details");
		const K = S.link;
		const back = `<a class="back" href="/app/links" data-nav="/app/links">${ic("back")}Back to My links</a>`;
		if (!session?.authenticated)
			return `<div class="page">${back}${bannerHtml()}${signedOutHtml("Sign in to manage this link", "Only the account that owns a link can change it or see its clicks.")}</div>`;
		if (K.state === "missing")
			return `<div class="page">${back}${alertBox("n-bad", "lock", "rose", "You cannot open this link", "It isn't in your account, or it was deleted. If someone sent you this page, ask them for the short link instead.")}</div>`;
		if (K.state === "error")
			return `<div class="page">${back}${alertBox("n-bad", "offline", "sky", "Could not load this link", "QRWTY didn't answer. The link still works for everyone who opens it.", `<button type="button" class="btn btn-sm" data-act="link-retry">${ic("retry")}Try again</button>`)}</div>`;
		if (!K.data) return `<div class="page">${back}<p class="meta" role="status">Loading the link…</p></div>`;
		const l = K.data;
		const p = splitUrl(l.destination);
		const blocked = l.state === "blocked";
		const n = K.notice;
		let top = "";
		if (blocked)
			top = alertBox("n-bad", "shield", "rose", "Blocked for safety", "QRWTY's safety team blocked this link after its destination was reported as harmful. Visitors see a safety page. You can't turn it back on or change where it goes, but you can delete it.");
		else if (n === "saved")
			top = statusBox("n-ok", "check", "mint", "Destination saved", `New visits go to ${esc(p.host)} within 30 seconds. The short link and QR code stay the same, so printed codes keep working.`);
		else if (n === "conflict")
			top = alertBox("n-warn", "warn", "butter", "This link changed somewhere else", `It was changed in another tab or device (now version ${l.version}), so your change wasn't saved. Check the newer details below, then save yours again if it's still right.`, K.editing ? `<button type="button" class="btn btn-sm" data-act="edit-retry">Save my destination again</button><button type="button" class="btn btn-sm btn-quiet" data-act="edit-cancel">Keep the newer one</button>` : "");
		else if (n === "refused") top = alertBox("n-bad", "shield", "rose", "This destination was refused", "Our safety check lists this address for phishing or malware, so QRWTY won't link to it. The link still goes where it did.");
		else if (n === "error") top = alertBox("n-bad", "warn", "butter", "Change not saved", "QRWTY didn't answer in time, so nothing changed. Try again in a few seconds.");
		if (l.state === "disabled" && n !== "conflict")
			top += statusBox("n-off", "pause", "sky", "Link disabled", "Within 30 seconds, people who open it or scan its QR code see a page saying it's turned off. Turn it back on any time.", `<button type="button" class="btn btn-sm" data-act="enable"${K.busy ? ' aria-disabled="true"' : ""}>${ic("retry")}Turn link back on</button>`);
		const err = K.fieldError;
		const edit = K.editing
			? `<form class="card stack" data-form="edit" novalidate>
				<h2>Change destination</h2>
				<div class="field"><label for="edit-dest">New destination</label>
				<input class="input" id="edit-dest" type="url" spellcheck="false" value="${esc(K.draft)}"${err ? ' aria-invalid="true" aria-describedby="edit-error"' : ""} />
				${err ? `<p class="field-error" id="edit-error" role="alert">${ic("warn", "butter")}<span>${esc(err)}</span></p>` : '<p class="hint">The short link and QR code stay the same. New visits go to the new address.</p>'}</div>
				<div class="row"><button type="submit" class="btn btn-primary"${K.busy ? ' aria-busy="true" aria-disabled="true"' : ""}>${K.busy ? '<span class="spin" aria-hidden="true"></span>' : ic("check", "mint")}Save destination</button><button type="button" class="btn btn-quiet" data-act="edit-cancel">Cancel</button></div>
			</form>`
			: "";
		const acts = blocked
			? ""
			: `<div class="actions">
				${K.editing ? "" : `<button type="button" class="btn" data-act="edit">${ic("pencil", "butter")}Change destination</button>`}
				${l.state === "disabled" ? "" : `<button type="button" class="btn" data-act="disable">${ic("pause", "sky")}Disable link</button>`}
			</div>`;
		const t = K.totals;
		const totals = t
			? `<div class="figure"><span class="val">${num(t.filteredClicks)}</span><span class="def">Filtered clicks (bots removed)</span></div><div class="figure"><span class="val">${num(t.recordedAttempts)}</span><span class="def">Recorded visits, bots included</span></div>`
			: `<p class="meta">${K.totals === null ? "Counting…" : "Counts aren't available just now."}</p>`;
		const clicksHref = pathFor("clicks", l.id);
		return `<div class="page">
			${back}
			<div class="page-head"><div><span>${chip(l.state)}</span><h1 tabindex="-1" class="wrap-any">${esc(p.host)}</h1><p class="meta mono">${esc(truncMid(p.rest, 90))}</p></div></div>
			${bannerHtml()}${top}
			<div class="detail">
				<div class="stack" style="gap:var(--s-5)">
					<section class="card card-strong stack" aria-labelledby="sl-title">
						<h2 id="sl-title">Short link</h2>
						<span class="shorturl shorturl-sm">${shortHtml(l.shortUrl)}</span>
						<div class="actions"><button type="button" class="btn btn-sm" data-act="copy-row" data-url="${esc(l.shortUrl)}">${ic("copy", "sky")}Copy link</button><a class="btn btn-sm" href="${esc(l.shortUrl)}" target="_blank" rel="noopener">${ic("open", "sky")}Open short link</a></div>
						<dl class="kv">
							<dt>Destination</dt><dd class="mono" style="font-size:var(--fs-meta)">${esc(l.destination)}</dd>
							<dt>Created</dt><dd>${esc(fmtTime(l.createdAt))}</dd>
							<dt>Version</dt><dd>${esc(l.version)}${l.version > 1 ? `, last changed ${esc(fmtTime(l.updatedAt))}` : ", unchanged since it was made"}</dd>
						</dl>
						${acts}
					</section>
					${edit}
					<section class="card stack" aria-labelledby="sum-title">
						<div class="row between"><h2 id="sum-title">Clicks, last 7 days</h2><a class="btn btn-sm" href="${clicksHref}" data-nav="${clicksHref}">${ic("chart", "mint")}Click analytics</a></div>
						<div class="totals two">${totals}</div>
					</section>
					<section class="danger-zone stack" aria-labelledby="dz-title">
						<h2 id="dz-title" class="dz-title">Delete</h2>
						<p class="muted">Deleting stops the short link and its QR code for good. The address is never reused.</p>
						<div><button type="button" class="btn btn-danger" data-act="delete">${ic("trash", "rose")}Delete link</button></div>
					</section>
				</div>
				<aside class="detail-side" aria-label="QR code">
					<div class="sticker">${qrSvg(l.shortUrl)}</div>
					<div class="downloads"><button type="button" class="btn" data-act="png" data-url="${esc(l.shortUrl)}">${ic("download", "mint")}Download PNG</button><button type="button" class="btn" data-act="svg" data-url="${esc(l.shortUrl)}">${ic("download", "mint")}Download SVG</button></div>
					<p class="qr-meta">Changing the destination doesn't change this code.</p>
				</aside>
			</div>
		</div>`;
	}

	async function loadLink(id, { keepNotice = false } = {}) {
		const K = S.link;
		if (!session?.authenticated) return;
		if (!keepNotice || K.data?.id !== id)
			Object.assign(K, { state: "loading", data: K.data?.id === id ? K.data : null, editing: false, draft: "", fieldError: null, notice: null, busy: false, totals: null });
		const a = await api("GET", `/api/v1/links/${encodeURIComponent(id)}`);
		if (S.id !== id) return;
		if (a.status === 200 && a.data?.id) {
			K.data = a.data;
			K.state = "ready";
		} else if (a.status === 404 || a.status === 400) K.state = "missing";
		else if (a.status === 401) await sessionEnded();
		else K.state = "error";
		render();
		if (K.state === "ready" && S.view === "link") {
			const t = await api("GET", `/api/v1/links/${encodeURIComponent(id)}/analytics`);
			if (S.id !== id) return;
			K.totals = t.status === 200 && t.data?.totals ? t.data.totals : false;
			render();
		}
	}

	/** PATCH the link with If-Match; returns the answer after updating the view's state. */
	async function patchLink(change) {
		const K = S.link;
		const l = K.data;
		K.busy = true;
		render();
		const a = await api("PATCH", `/api/v1/links/${encodeURIComponent(l.id)}`, { body: change, ifMatch: l.version });
		K.busy = false;
		if (a.status === 200 && a.data?.id) {
			K.data = a.data;
			S.links.items = S.links.items.map((x) => (x.id === a.data.id ? a.data : x));
		} else if (a.status === 412 || a.status === 409) {
			await loadLink(l.id, { keepNotice: true });
			K.notice = a.status === 412 ? "conflict" : null;
		} else if (a.status === 401) await sessionEnded();
		else if (a.status === 404) K.state = "missing";
		return a;
	}

	async function saveDestination(value) {
		const K = S.link;
		K.draft = value;
		K.fieldError = validate(value);
		if (K.fieldError) {
			render();
			$("#edit-dest")?.focus();
			return;
		}
		const a = await patchLink({ destination: value.trim() });
		if (a.status === 200) Object.assign(K, { editing: false, notice: "saved", fieldError: null });
		else if (a.status === 400 && a.code === "invalid_destination") K.fieldError = reasonText(a.error);
		else if (a.status === 422) K.notice = "refused";
		else if (a.status !== 412 && a.status !== 409 && a.status !== 401 && a.status !== 404) K.notice = "error";
		render();
	}

	async function setState(state) {
		const a = await patchLink({ state });
		const K = S.link;
		if (a.status === 200) {
			K.notice = null;
			toast(state === "disabled" ? "Link disabled" : "Link turned back on", state === "disabled" ? ["Undo", "enable"] : null);
		} else if (a.status !== 412 && a.status !== 401 && a.status !== 404 && a.status !== 409) K.notice = "error";
		render();
	}

	async function deleteLink() {
		const l = S.link.data;
		const a = await api("DELETE", `/api/v1/links/${encodeURIComponent(l.id)}`);
		closeDialog();
		if (a.status === 204 || a.status === 404) {
			S.links.items = S.links.items.filter((x) => x.id !== l.id);
			if (S.result?.id === l.id) {
				S.result = null;
				keepResult();
			}
			navigate("/app/links");
			toast(`Deleted ${esc(shortText(l.shortUrl))}`);
		} else if (a.status === 401) {
			await sessionEnded();
			render();
		} else {
			S.link.notice = "error";
			render();
		}
	}

	/* ---- Click analytics ---- */
	function chartSvg(series) {
		const W = Math.round(Math.min(1132, Math.max(260, innerWidth - (innerWidth < 720 ? 68 : 116))));
		const H = innerWidth < 720 ? 200 : 240;
		const L = 40;
		const R = 12;
		const T = 22;
		const B = 30;
		const data = series.map((d) => ({ date: d.date, filtered: d.filteredClicks, attempts: d.recordedAttempts }));
		const max = Math.max(10, ...data.map((d) => d.attempts));
		const step = max > 200 ? 100 : max > 80 ? 40 : max > 40 ? 20 : 10;
		const top = Math.ceil(max / step) * step;
		const y = (v) => T + (H - T - B) * (1 - v / top);
		const bw = (W - L - R) / data.length;
		const ticks = [0, top / 2, top];
		let g = ticks.map((t) => `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("");
		const every = data.length <= 14 ? 1 : data.length <= 31 ? 5 : 15;
		data.forEach((d, i) => {
			const w = Math.max(2, Math.min(56, bw * 0.64));
			const x = L + i * bw + (bw - w) / 2;
			if (d.attempts > 0) {
				if (d.filtered > 0) g += `<rect class="bar" x="${x.toFixed(1)}" y="${y(d.filtered).toFixed(1)}" width="${w.toFixed(1)}" height="${(y(0) - y(d.filtered)).toFixed(1)}" rx="2"/>`;
				if (d.attempts > d.filtered) g += `<rect class="bot" x="${x.toFixed(1)}" y="${y(d.attempts).toFixed(1)}" width="${w.toFixed(1)}" height="${(y(d.filtered) - y(d.attempts)).toFixed(1)}" rx="2"/>`;
			}
			if ((data.length - 1 - i) % every === 0) g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle">${fmtDay(d.date)}</text>`;
		});
		const last = data[data.length - 1];
		const lx = L + (data.length - 1) * bw + bw / 2;
		g += `<text class="end" x="${lx.toFixed(1)}" y="${(y(last.attempts) - 6).toFixed(1)}" text-anchor="end">${last.filtered}</text>`;
		return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Filtered clicks per day, ${fmtDay(data[0].date)} to ${fmtDay(last.date)}. Table below.">${g}</svg>`;
	}

	const DEVICES = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", bot: "Bots and previews", unknown: "Unknown" };
	/** Paid's breakdowns (A7): top referring sites, devices and countries for the range. */
	function breakdownHtml(b) {
		const block = (title, items, label) =>
			`<div class="stack gap-2"><h3>${title}</h3>${
				items?.length
					? `<div class="chart-wrap"><table class="datatable"><thead><tr><th scope="col">${title}</th><th scope="col">Filtered clicks</th><th scope="col">Recorded visits</th></tr></thead><tbody>${items.map((i) => `<tr><td class="wrap-any">${esc(label(i.value))}</td><td>${num(i.filteredClicks)}</td><td>${num(i.recordedAttempts)}</td></tr>`).join("")}</tbody></table></div>`
					: '<p class="meta">None in this range yet.</p>'
			}</div>`;
		return `<p class="meta">Counted for clicks recorded since breakdowns started (15 Nov 2026). Top 10 of each.</p>
			${block("Referring site", b.referrerHost, (v) => v ?? "No referring site")}
			${block("Device", b.device, (v) => DEVICES[v] ?? "Unknown")}
			${block("Country", b.country, (v) => v ?? "Unknown")}`;
	}

	function viewClicks() {
		if (!session) return waiting("Click analytics");
		const C = S.clicks;
		const l = S.link.data?.id === S.id ? S.link.data : null;
		const backHref = pathFor("link", S.id);
		const back = `<a class="back" href="${backHref}" data-nav="${backHref}">${ic("back")}Back to link</a>`;
		if (!session?.authenticated)
			return `<div class="page">${back}${bannerHtml()}${signedOutHtml("Sign in to see clicks", "Only the account that owns a link can see its clicks.")}</div>`;
		if (C.state === "missing")
			return `<div class="page">${back}${alertBox("n-bad", "lock", "rose", "You cannot open this link", "It isn't in your account, or it was deleted.")}</div>`;
		if (C.state === "error" && !C.data)
			return `<div class="page">${back}${alertBox("n-bad", "offline", "sky", "Could not load the clicks", "QRWTY didn't answer. Clicks are still being recorded; try again in a moment.", `<button type="button" class="btn btn-sm" data-act="clicks-refresh">${ic("retry")}Try again</button>`)}</div>`;
		if (!C.data) return `<div class="page">${back}<p class="meta" role="status">Loading the clicks…</p></div>`;
		const d = C.data;
		const maxDays = d.lookback?.maxDays ?? 7;
		const days = d.series.length;
		const totF = d.totals.filteredClicks;
		const totA = d.totals.recordedAttempts;
		const tag = (n) => (n > maxDays ? '<span class="tag">Paid</span>' : "");
		const rangeBtns = [7, 30, 90].map((n) => `<button type="button" data-act="range" data-n="${n}" aria-pressed="${days === n && C.notice !== "lookback"}">${n} days${tag(n)}</button>`).join("");
		let top = "";
		if (d.freshness?.delayed)
			top += statusBox("n-warn", "clock", "butter", "Counts are running late", `New clicks are recorded safely but haven't been counted yet. These numbers are from ${esc(fmtTime(d.freshness.asOf))}. They will catch up without anything lost.`);
		if (d.reconciliation?.status === "incident")
			top += alertBox("n-warn", "warn", "butter", "Some recorded clicks are missing from these totals", "Some recorded clicks aren't counted yet. They are kept, and the totals go up once they are counted. Your link worked the whole time.");
		const paidTier = d.tier?.policy === "paid-test-v1";
		if (C.notice === "lookback")
			top += statusBox("n-info", "lock", "butter", `Free shows the last ${maxDays} days`, `You picked ${C.picked} days. Paid shows up to 90 days of clicks. Older counts are kept, not deleted.`, `<a class="btn btn-sm" href="/app/plans" data-nav="/app/plans">See plans</a>`);
		if (C.notice === "exportFailed")
			top += alertBox("n-bad", "warn", "butter", "Export did not finish", C.exportReason === "quota" ? "This month's CSV exports are used up. Counts keep being recorded; export again next month." : "The CSV couldn't be made just now. Try again in a minute.", C.exportReason === "quota" ? "" : `<button type="button" class="btn btn-sm" data-act="export">${ic("retry")}Try again</button>`);
		if (C.notice === "exported") top += statusBox("n-ok", "check", "mint", "CSV exported", `${esc(C.exportName)} · ${C.exportRows} ${C.exportRows === 1 ? "day" : "days"}.`);
		if (C.notice === "error") top += alertBox("n-bad", "offline", "sky", "Could not refresh the clicks", "QRWTY didn't answer. These are the counts from before.");
		const asOf = d.freshness?.asOf ? `As of ${esc(fmtTime(d.freshness.asOf))}.` : "No clicks counted yet.";
		const host = l ? esc(splitUrl(l.destination).host) : "";
		const slug = l ? `<span class="mono" style="font-size:var(--fs-body)">${esc(shortText(l.shortUrl))}</span>` : "";
		return `<div class="page">
			${back}
			<div class="page-head"><div><h1 tabindex="-1">Click analytics</h1><p class="lead wrap-any">${host}${host ? " · " : ""}${slug}</p></div>
			<div class="stack gap-2 start"><p class="meta">${asOf}<br />Counts usually trail visits by under a minute.</p><button type="button" class="btn btn-sm" data-act="clicks-refresh"${C.state === "loading" ? ' aria-busy="true" aria-disabled="true"' : ""}>${C.state === "loading" ? '<span class="spin" aria-hidden="true"></span>' : ic("retry")}Refresh counts</button></div></div>
			${bannerHtml()}${top}
			<div class="card stack">
				<div class="range">
					<div class="stack gap-2"><span class="label">Range</span><div class="seg" role="group" aria-label="Range">${rangeBtns}</div></div>
					<p class="meta" style="flex:1 1 200px">${esc(fmtDay(d.range.from))} to ${esc(fmtDay(d.range.to))}. ${paidTier ? "Paid" : "Free"}: the last ${maxDays} days. Dates are UTC.</p>
				</div>
				<div class="totals">
					<div class="figure figure-primary"><span class="label">Filtered clicks</span><span class="val">${num(totF)}</span><span class="def">Visits to the short link with known bots and link previews removed (${esc(d.filter?.version ?? "filter-v1")}).</span></div>
					<div class="figure"><span class="label">Recorded visits</span><span class="val">${num(totA)}</span><span class="def">Every visit QRWTY recorded before redirecting, bots included.</span></div>
					<div class="figure"><span class="label">Bots and previews</span><span class="val">${num(totA - totF)}</span><span class="def">The difference. A click is a visit to the short link, not proof someone read the page.</span></div>
				</div>
			</div>
			<section class="card stack" aria-labelledby="trend-title">
				<div class="row between"><h2 id="trend-title">Clicks per day</h2>
				<div class="legend"><span><i style="background:var(--bar)"></i>Filtered clicks</span><span><i style="background:var(--bar-bots)"></i>Bots and previews</span></div></div>
				${totA === 0 ? `<div class="empty" style="padding:var(--s-5)">${ic("chart", "mint", "ic-lg")}<h3>No clicks yet</h3><p>Share the link or print its QR code. Visits show up here within about a minute.</p></div>` : `<div class="chart-wrap">${chartSvg(d.series)}</div>`}
				<details><summary>Show as a table</summary><div class="chart-wrap"><table class="datatable"><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Filtered clicks</th><th scope="col">Recorded visits</th></tr></thead><tbody>${d.series.map((s) => `<tr><td>${esc(s.date)}</td><td>${num(s.filteredClicks)}</td><td>${num(s.recordedAttempts)}</td></tr>`).join("")}</tbody></table></div></details>
			</section>
			<section class="card stack" aria-labelledby="bd-title"><h2 id="bd-title">Where clicks came from</h2>
				${d.breakdowns ? breakdownHtml(d.breakdowns) : `<div class="notice n-acct">${ic("lock", "lilac")}<strong>Breakdowns come with Paid</strong><p>Paid shows clicks by referring site, device and country. Free shows totals and the daily trend.</p></div>`}
			</section>
			<section class="card stack" aria-labelledby="ex-title">
				<h2 id="ex-title">Export</h2>
				<p class="muted">One row per day of this range: date, recorded visits, filtered clicks.</p>
				<div><button type="button" class="btn" data-act="export"${C.exporting ? ' aria-busy="true" aria-disabled="true"' : ""}>${C.exporting ? '<span class="spin" aria-hidden="true"></span>' : ic("sheet", "mint")}Export CSV</button></div>
			</section>
		</div>`;
	}

	const rangeQuery = (days) => {
		const to = todayUtc();
		return days === 7 ? "" : `?from=${daysBefore(to, days - 1)}&to=${to}`;
	};

	async function loadClicks(id, days) {
		const C = S.clicks;
		if (!session?.authenticated) return;
		if (C.data?.linkId !== id) Object.assign(C, { data: null, notice: null });
		C.state = "loading";
		C.days = days;
		render();
		if (S.link.data?.id !== id) {
			const k = await api("GET", `/api/v1/links/${encodeURIComponent(id)}`);
			if (k.status === 200 && k.data?.id) Object.assign(S.link, { data: k.data, state: "ready", notice: null, editing: false, totals: null });
		}
		const a = await api("GET", `/api/v1/links/${encodeURIComponent(id)}/analytics${rangeQuery(days)}`);
		if (S.id !== id) return;
		C.state = "ready";
		if (a.status === 200 && Array.isArray(a.data?.series)) {
			C.data = a.data;
			if (C.notice === "error" || C.notice === "lookback") C.notice = null;
		} else if (a.status === 403 && a.code === "tier_restricted") {
			C.notice = "lookback";
			C.picked = days;
		} else if (a.status === 404) C.state = "missing";
		else if (a.status === 401) await sessionEnded();
		else {
			C.state = "error";
			if (C.data) C.notice = "error";
		}
		if (S.view === "clicks") render();
	}

	async function exportCsv() {
		const C = S.clicks;
		if (C.exporting || !C.data) return;
		C.exporting = true;
		render();
		const q = `?from=${C.data.range.from}&to=${C.data.range.to}`;
		const a = await api("GET", `/api/v1/links/${encodeURIComponent(S.id)}/analytics.csv${q}`, { accept: "text/csv" });
		C.exporting = false;
		if (a.status === 200 && typeof a.text === "string") {
			const named = /filename="([^"]+)"/.exec(a.headers.get("content-disposition") ?? "");
			const name = named?.[1] ?? `qrwty-${S.id}-${C.data.range.from}-${C.data.range.to}.csv`;
			saveBlob(new Blob([a.text], { type: "text/csv;charset=utf-8" }), name);
			Object.assign(C, { notice: "exported", exportName: name, exportRows: Math.max(0, a.text.trim().split(/\r?\n/).length - 1) });
		} else if (a.status === 401) await sessionEnded();
		else Object.assign(C, { notice: "exportFailed", exportReason: a.status === 403 && a.code === "quota_exceeded" ? "quota" : "error" });
		render();
	}

	/* ---- Plans and billing, and the account ---- */
	// GET /api/v1/me/billing (http-contract §9) decides everything shown: the return from Stripe
	// Checkout (/billing?checkout=success) only shows "Confirming your subscription" and polls with
	// a bounded backoff; Paid comes from the server's verified webhook or reconciliation state.
	const PAID_PRICE = "USD 5.00";
	const isPaid = () => S.plans.billing?.tier === "paid";
	function usageMeter(label, used, limit) {
		const u = Number(used ?? 0);
		const pct = limit > 0 ? Math.min(100, Math.round((u / limit) * 100)) : 0;
		return `<div class="meter"><div class="meter-top"><span>${esc(label)}</span><span class="num">${used === null || used === undefined ? "–" : num(u)} of ${num(limit)}</span></div>
			<div class="meter-track" role="img" aria-label="${num(u)} of ${num(limit)} used"><div class="meter-fill${u >= limit ? " full" : ""}" style="width:${pct}%"></div></div></div>`;
	}
	function billingNotice() {
		const P = S.plans;
		const b = P.billing;
		if (P.portalError) return alertBox("n-bad", "offline", "sky", "Payment portal unavailable", "The payment provider's portal isn't answering. Your plan hasn't changed. Try again in a few minutes.");
		if (P.redirecting) return statusBox("n-info", "clock", "sky", "Waiting for the payment page", "Opening the payment page. If it doesn't open, try again; you won't be charged twice.", `<button type="button" class="btn btn-sm" data-act="upgrade">Return to the payment page</button>`);
		if (!b) return "";
		const sub = b.subscription ?? {};
		if (sub.status === "past_due") {
			const until = sub.graceUntil ? fmtDate(sub.graceUntil) : "";
			return alertBox("n-bad", "warn", "butter", "Payment failed", isPaid() ? `The last payment didn't go through. Paid stays on until ${esc(until)} while the payment provider retries. Update your card to keep Paid. Your links keep working either way.` : "The last payment didn't go through and the grace period has ended, so you're on Free. Update your card to turn Paid back on. Your links keep working.", `<button type="button" class="btn btn-sm" data-act="portal">${ic("card", "butter")}Update card</button>`);
		}
		if (isPaid() && sub.cancelAtPeriodEnd)
			return statusBox("n-info", "info", "sky", "Cancellation scheduled", `Paid ends on ${esc(fmtDate(sub.paidThrough))}. After that you're on Free: 5 new links a month and 7 days of click history. Every link keeps working and recording clicks.`);
		if (isPaid()) return statusBox("n-ok", "check", "mint", "Paid is on", `Renews on ${esc(fmtDate(sub.paidThrough))} for ${PAID_PRICE} (test price). Manage your card or cancel in the payment portal.`);
		if (b.confirming || (P.returned && P.polling))
			return statusBox("n-info", "clock", "sky", "Confirming your subscription", "The payment page says you paid. We're waiting for the payment provider to confirm it, which usually takes a few seconds. Paid features turn on when it's confirmed.", '<span class="spin" aria-hidden="true"></span><span class="meta">Checking again every few seconds</span>');
		if (P.returned && P.timedOut)
			return statusBox("n-info", "clock", "sky", "Confirming your subscription", "This is taking longer than usual. Nothing is lost: Paid turns on as soon as the payment provider confirms it.", `<button type="button" class="btn btn-sm" data-act="billing-refresh">${ic("retry")}Check again</button>`);
		if (P.cancelled) return statusBox("n-info", "info", "sky", "Checkout cancelled", "You're still on Free. Nothing was charged.");
		if (sub.status === "canceled" || sub.status === "expired" || (sub.status === "active" && sub.paidThrough))
			return statusBox("n-info", "info", "sky", "You are on Free again", `Paid ended${sub.paidThrough ? ` on ${esc(fmtDate(sub.paidThrough))}` : ""}. Your links still work and still record clicks. Click history older than 7 days is hidden until you upgrade again; nothing was deleted.`);
		return "";
	}
	function viewPlans() {
		if (!session) return waiting("Plans and billing");
		const P = S.plans;
		const b = P.billing;
		const signedIn = !!session?.authenticated;
		const paid = isPaid();
		const free = `<section class="card plan${signedIn && !paid ? " current" : ""}" aria-labelledby="p-free">
			<div class="plan-head"><h2 id="p-free">Free</h2>${signedIn && !paid ? chip("current") : ""}</div>
			<p class="price">USD 0 <small>no card needed</small></p>
			<ul class="limits">
				<li>${ic("link", "sky")}<span><b>5</b> new links a month in your account</span></li>
				<li>${ic("chart", "mint")}<span><b>7 days</b> of click history</span></li>
				<li>${ic("minus", "sky")}<span>No breakdown by site, device or country</span></li>
				<li>${ic("sheet", "mint")}<span><b>1</b> CSV export a month</span></li>
			</ul>
			${signedIn ? "" : `<div class="stack gap-2 start">${signInAgain("Sign in to see your plan")}<p class="meta">Guest links need no account and are always free.</p></div>`}
		</section>`;
		const busy = P.busy ? ' aria-busy="true" aria-disabled="true"' : "";
		const confirming = !paid && (b?.confirming || (P.returned && P.polling));
		const portalBtn = `<button type="button" class="btn" data-act="portal"${busy}>${P.busy === "portal" ? '<span class="spin" aria-hidden="true"></span>' : ic("card", "butter")}Manage payment</button>`;
		const paidCta = !signedIn
			? `<button type="button" class="btn btn-account" data-act="signin">${ic("person", "lilac")}Sign in to upgrade</button>`
			: !b
				? `<p class="meta">${P.state === "error" ? "Billing isn't answering just now. Try again in a minute." : "Checking your plan…"}</p>`
				: paid
					? `${portalBtn}<p class="meta">Change your card, see invoices or cancel in the payment portal.</p>`
					: confirming
						? `<button type="button" class="btn" aria-disabled="true">${ic("clock", "sky")}Confirming…</button>`
						: `<button type="button" class="btn btn-primary" data-act="upgrade"${busy}>${P.busy === "upgrade" ? '<span class="spin" aria-hidden="true"></span>' : ic("card", "butter")}Upgrade to Paid</button><p class="meta">You'll pay on the payment page (test mode: use a test card), then come back here. Cancel any time.</p>${b.portalAvailable ? `${portalBtn}<p class="meta">See past invoices or your card.</p>` : ""}`;
		const paidCard = `<section class="card plan${paid ? " current" : ""}" aria-labelledby="p-paid">
			<div class="plan-head"><h2 id="p-paid">Paid</h2>${paid ? chip("current") : ""}</div>
			<p class="price">${PAID_PRICE} <small>a month · test price, not final</small></p>
			<ul class="limits">
				<li>${ic("link", "sky")}<span><b>50</b> new links a month in your account</span></li>
				<li>${ic("chart", "mint")}<span><b>90 days</b> of click history</span></li>
				<li>${ic("globe", "sky")}<span>Clicks by referring site, device and country</span></li>
				<li>${ic("sheet", "mint")}<span><b>20</b> CSV exports a month</span></li>
			</ul>
			<div class="stack gap-2 start">${paidCta}</div>
		</section>`;
		const planChip = signedIn && b ? chip(paid ? "current" : "free", paid ? "Paid plan" : "Free plan") : "";
		const usage = signedIn && b?.usage
			? `<section class="card stack" aria-labelledby="use-title"><div class="row between"><h2 id="use-title">This month</h2><span class="meta">Resets ${esc(fmtDate(b.usage.period?.end))} (UTC)</span></div>
				<div class="usage">${usageMeter(`New links · ${paid ? "Paid" : "Free"}`, b.usage.ownedLinkCreates?.used, b.usage.ownedLinkCreates?.limit ?? 5)}${usageMeter("CSV exports", b.usage.csvExports?.used, b.usage.csvExports?.limit ?? 1)}</div></section>`
			: "";
		let account = "";
		if (signedIn) {
			const a = session.account ?? {};
			const owned = P.me ? `${num(P.me.ownedLinks)} ${P.me.ownedLinks === 1 ? "link" : "links"}` : P.state === "error" ? "Not available just now" : "Counting…";
			account = `<section class="card stack" aria-labelledby="acct-title">
				<div class="row between"><h2 id="acct-title">Your account</h2>${planChip}</div>
				<dl class="kv">
					${a.name && a.name !== a.email ? `<dt>Name</dt><dd class="wrap-any">${esc(a.name)}</dd>` : ""}
					<dt>Email</dt><dd class="wrap-any">${esc(a.email ?? "")}</dd>
					<dt>In your account</dt><dd>${owned}</dd>
				</dl>
			</section>
			<section class="danger-zone stack" aria-labelledby="del-title">
				<h2 id="del-title" class="dz-title">Delete my account</h2>
				<p class="muted">Your links are turned off and removed from the account, any subscription is cancelled, and you are signed out everywhere. Guest links you never saved are not affected.</p>
				${P.error ? `<p class="field-error" role="alert">${ic("warn", "butter")}<span>The account wasn't deleted: QRWTY didn't answer. Try again in a minute.</span></p>` : ""}
				<div><button type="button" class="btn btn-danger" data-act="delete-account">${ic("trash", "rose")}Delete my account</button></div>
			</section>`;
		}
		return `<div class="page">
			<div class="page-head"><div><h1 tabindex="-1">Plans and billing</h1><p class="lead">Short links and QR codes are free without an account. A plan sets how many links your account makes each month and how much click history you see.</p></div>
			${planChip ? `<span>${planChip}</span>` : ""}</div>
			${bannerHtml()}
			${statusBox("n-info", "info", "sky", "Test mode", "Payments run in the payment provider's test mode. Prices are placeholders and no real card is charged: pay with a test card such as 4242 4242 4242 4242.")}
			${signedIn ? billingNotice() : ""}
			${usage}
			<div class="plans">${free}${paidCard}</div>
			${account}
			<section class="card stack" aria-labelledby="faq-title">
				<h2 id="faq-title">What changes, and what never does</h2>
				<dl class="kv">
					<dt>If you cancel</dt><dd>Paid stays on until the end of the month you paid for, then you're on Free.</dd>
					<dt>If a payment fails</dt><dd>The payment provider retries for 7 days and Paid stays on meanwhile.</dd>
					<dt>Your links</dt><dd>Never expire or stop on any plan, including after you cancel or reach a limit.</dd>
					<dt>Deleting a link</dt><dd>Doesn't give back this month's new-link allowance.</dd>
					<dt>Saving a guest link</dt><dd>Counts as one of the month's new links.</dd>
				</dl>
			</section>
		</div>`;
	}

	/** Reads the plan; on a return from Checkout, polls until Paid is confirmed (about 2 minutes). */
	async function loadPlans({ poll = false } = {}) {
		const P = S.plans;
		if (!session?.authenticated) return;
		const q = new URLSearchParams(location.search);
		if (!poll) {
			P.returned = location.pathname === "/billing" && q.get("checkout") === "success";
			P.cancelled = location.pathname === "/billing" && q.get("checkout") === "cancelled";
			P.redirecting = false;
			P.portalError = false;
			P.timedOut = false;
			P.polling = P.returned;
			P.pollStarted = Date.now();
		}
		P.state = P.billing ? P.state : "loading";
		const [m, b] = await Promise.all([api("GET", "/api/v1/me"), api("GET", `/api/v1/me/billing${P.returned ? "?checkout=success" : ""}`)]);
		if (m.status === 200 && m.data) P.me = m.data;
		if (b.status === 200 && b.data) {
			P.billing = b.data;
			P.state = "ready";
		} else if (b.status === 401 || m.status === 401) return sessionEnded().then(() => render());
		else P.state = "error";
		S.tier = P.billing?.tier ?? S.tier;
		if (P.returned && P.polling) {
			if (isPaid()) {
				P.polling = false;
				toast("Paid is on");
			} else if (Date.now() - P.pollStarted > 120_000) {
				P.polling = false;
				P.timedOut = true;
			} else {
				const wait = Math.min(5000, 1000 + (Date.now() - P.pollStarted) / 10);
				clearTimeout(P.timer);
				P.timer = setTimeout(() => {
					if (S.view === "plans" && P.polling) loadPlans({ poll: true });
				}, wait);
			}
		}
		if (S.view === "plans") render();
		else renderNav();
	}

	async function upgrade() {
		const P = S.plans;
		if (P.busy) return;
		P.busy = "upgrade";
		P.cancelled = false;
		P.portalError = false;
		P.checkoutKey = P.checkoutKey ?? uuid();
		render();
		const a = await api("POST", "/api/v1/billing/checkout", { key: P.checkoutKey, body: { plan: "paid-monthly" } });
		P.busy = false;
		if (a.status === 200 && typeof a.data?.url === "string" && a.data.url.startsWith("https://checkout.stripe.com/")) {
			P.redirecting = true;
			render();
			location.assign(a.data.url);
			return;
		}
		P.checkoutKey = null;
		if (a.status === 409 && a.code === "already_subscribed") return loadPlans();
		if (a.status === 401) await sessionEnded();
		else toast("The payment page didn't open. Try again in a minute.");
		render();
	}

	async function openPortal() {
		const P = S.plans;
		if (P.busy) return;
		P.busy = "portal";
		P.portalError = false;
		render();
		const a = await api("POST", "/api/v1/billing/portal", { key: uuid() });
		P.busy = false;
		if (a.status === 200 && typeof a.data?.url === "string" && a.data.url.startsWith("https://billing.stripe.com/")) {
			location.assign(a.data.url);
			return;
		}
		if (a.status === 401) await sessionEnded();
		else P.portalError = true;
		render();
	}

	async function deleteAccount() {
		const P = S.plans;
		P.busy = true;
		const a = await api("DELETE", "/api/v1/me", { key: uuid() });
		P.busy = false;
		closeDialog();
		if (a.status === 202) {
			S.result = null;
			keepResult();
			tab.set("qrwty-flash", "deleted");
			// End the identity provider's own session too; it returns to /.
			location.assign("/auth/logout");
			return;
		}
		if (a.status === 401) await sessionEnded();
		else P.error = true;
		render();
	}

	/* ---------------- Render ---------------- */
	const VIEW_FN = { create: viewCreate, links: viewLinks, link: viewLink, clicks: viewClicks, plans: viewPlans };
	const TITLES = { create: "Shorten a link", links: "My links", link: "Link details", clicks: "Click analytics", plans: "Plans and billing" };

	function render({ moved = false } = {}) {
		const active = doc.activeElement;
		const activeId = active && active !== doc.body ? active.id : null;
		const sel = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
		renderNav();
		noticeSeq = 0;
		view.innerHTML = VIEW_FN[S.view]();
		doc.title = `${S.view === "create" && S.result ? "Your short link" : TITLES[S.view]} · QRWTY`;
		if (moved) {
			const h = $("h1", view);
			if (h) h.focus({ preventScroll: true });
			window.scrollTo(0, 0);
		} else if (activeId) {
			const el = doc.getElementById(activeId);
			if (el && el !== doc.activeElement) {
				el.focus({ preventScroll: true });
				if (sel && "setSelectionRange" in el) {
					try {
						el.setSelectionRange(sel[0], sel[1]);
					} catch {
						/* not a text field */
					}
				}
			}
		}
	}

	/* ---------------- Dialogs and toasts ---------------- */
	const dialog = $("#dialog");
	function closeDialog() {
		if (dialog.open) dialog.close();
	}
	function openConfirm(kind) {
		const l = S.link.data;
		dialog.setAttribute("aria-labelledby", "dlg-title");
		const target = l ? `<p>${esc(shortText(l.shortUrl))} to ${esc(splitUrl(l.destination).host)}</p>` : "";
		if (kind === "disable")
			dialog.innerHTML = `<div class="dialog-body"><h2 id="dlg-title">Disable this link?</h2>${target}
				<ul><li>Within 30 seconds, people who open it or scan its QR code see a page saying it's turned off.</li><li>Clicks stop counting while it's off.</li><li>You can turn it back on any time; nothing is deleted.</li></ul>
				<div class="row"><button type="button" class="btn btn-danger-fill" data-act="confirm-disable">${ic("pause", "sky")}Yes, disable link</button><button type="button" class="btn btn-quiet" data-act="dlg-cancel">Cancel</button></div></div>`;
		if (kind === "delete")
			dialog.innerHTML = `<div class="dialog-body"><h2 id="dlg-title">Delete this link for good?</h2>${target}
				<ul><li>Within 30 seconds, the short link and every printed copy of its QR code stop working. Visitors see a page saying it was deleted.</li><li>The address is never given to anyone else.</li><li>Its click history is removed from your account.</li><li>This month's new-link allowance isn't given back.</li></ul>
				<div class="row"><button type="button" class="btn btn-danger-fill" data-act="confirm-delete">${ic("trash", "rose")}Yes, delete link</button><button type="button" class="btn btn-quiet" data-act="dlg-cancel">Keep link</button></div></div>`;
		if (kind === "account")
			dialog.innerHTML = `<div class="dialog-body"><h2 id="dlg-title">Delete your account?</h2><p>${esc(session?.account?.email ?? "")}</p>
				<ul><li>Every link in your account is turned off. Visitors see a page saying it's turned off.</li><li>The links are removed from your account, and you are signed out on every device.</li><li>If you sign up again, you start with an empty account.</li></ul>
				<div class="row"><button type="button" class="btn btn-danger-fill" data-act="confirm-delete-account">${ic("trash", "rose")}Yes, delete my account</button><button type="button" class="btn btn-quiet" data-act="dlg-cancel">Keep my account</button></div></div>`;
		if (!dialog.open) dialog.showModal();
	}
	function toast(msg, action) {
		const box = doc.createElement("div");
		box.className = "toast";
		box.innerHTML = `<span>${msg}</span>${action ? `<button type="button" class="btn btn-quiet" data-act="${action[1]}">${action[0]}</button>` : ""}`;
		$("#toasts").append(box);
		setTimeout(() => box.remove(), 7000);
	}

	/* ---------------- Exports ---------------- */
	function saveBlob(blob, name) {
		const url = URL.createObjectURL(blob);
		const a = doc.createElement("a");
		a.href = url;
		a.download = name;
		doc.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 4000);
	}
	function exportQr(kind, shortUrl) {
		const qr = QrwtyQr.encode(shortUrl);
		const name = `qrwty-${slugOf(shortUrl)}.${kind}`;
		if (kind === "svg") {
			const svg = QrwtyQr.toSvg(qr, { title: `QR code for ${shortUrl}` });
			saveBlob(new Blob([svg], { type: "image/svg+xml" }), name);
		} else {
			const canvas = doc.createElement("canvas");
			QrwtyQr.toCanvas(qr, canvas, 1200);
			canvas.toBlob((b) => b && saveBlob(b, name), "image/png");
		}
		if (S.view === "create" && S.result?.shortUrl === shortUrl) {
			S.downloaded = name;
			const fb = $("#dl-feedback");
			if (fb) fb.innerHTML = `<span class="feedback ok center">${ic("check", "mint")}Saved ${esc(name)}</span>`;
		} else toast(`Saved ${esc(name)}`);
	}

	/* ---------------- Actions ---------------- */
	async function submitCreate() {
		if (S.busy) return;
		const v = $("#dest").value;
		S.draft = v;
		S.alert = null;
		S.fieldError = validate(v);
		if (S.fieldError) {
			render();
			$("#dest").focus();
			return;
		}
		if (!navigator.onLine) {
			S.alert = { kind: "offline" };
			render();
			return;
		}
		const destination = v.trim();
		// One key per destination: a retry after a lost answer replays the same link.
		if (S.createKeyFor !== destination) {
			S.createKey = uuid();
			S.createKeyFor = destination;
		}
		S.busy = true;
		render();
		const a = await api("POST", "/api/v1/links", { key: S.createKey, body: { destination } });
		S.busy = false;
		if ((a.status === 201 || a.status === 200) && a.data?.shortUrl) {
			const d = a.data;
			S.result = {
				id: d.id,
				shortUrl: d.shortUrl,
				destination: d.destination,
				createdAt: d.createdAt ?? new Date().toISOString(),
				owned: d.owned === true,
				claim: d.claim?.token ? { token: d.claim.token, expiresAt: d.claim.expiresAt } : null,
				claimKey: null,
				save: d.owned ? "owned" : "ready",
			};
			keepResult();
			S.createKey = null;
			S.createKeyFor = null;
			S.draft = "";
			S.copy = null;
			S.downloaded = null;
			S.banner = null;
			render();
			$("#tray-title")?.focus({ preventScroll: false });
			return;
		}
		if (a.status === 400 && a.code === "invalid_destination") S.fieldError = reasonText(a.error);
		else if (a.status === 422) S.alert = { kind: "reputation" };
		else if (a.status === 503 && a.code === "reputation_unavailable") S.alert = { kind: "provider" };
		else if (a.status === 429) S.alert = { kind: "rate", seconds: Number(a.headers?.get("retry-after")) || 30 };
		else if (a.status === 403 && a.code === "quota_exceeded") S.alert = { kind: "quota", error: a.error };
		else if (a.status === 401) {
			await sessionEnded();
			S.alert = null;
		} else if (a.status === 0 && a.code === "offline") S.alert = { kind: "offline" };
		else S.alert = { kind: "error" };
		render();
	}

	async function claim() {
		const r = S.result;
		if (!r?.claim) return;
		r.claimKey = r.claimKey ?? uuid();
		r.save = "saving";
		keepResult();
		render();
		const a = await api("POST", `/api/v1/links/${encodeURIComponent(r.id)}/claim`, { key: r.claimKey, body: { claimToken: r.claim.token } });
		if (a.status === 200) {
			r.owned = true;
			r.save = "saved";
			r.claim = null;
		} else if (a.status === 409 && a.code === "claim_consumed") r.save = "consumed";
		else if (a.status === 410 || (a.status === 403 && a.code === "claim_invalid")) r.save = "expired";
		else if (a.status === 403 && a.code === "quota_exceeded") {
			r.save = "quota";
			r.quota = { limit: a.error?.limit, periodEnd: a.error?.periodEnd };
		} else if (a.status === 401) {
			r.save = "ready";
			await sessionEnded();
		} else r.save = "error";
		keepResult();
		render();
	}

	function save() {
		const r = S.result;
		if (!r?.claim || r.save === "saving" || r.save === "signin") return;
		if (session?.authenticated) return claim();
		// Straight to the identity provider; the result waits in this tab's storage.
		r.save = "signin";
		r.claimKey = r.claimKey ?? uuid();
		keepResult();
		render();
		signIn("/");
	}

	async function signOut() {
		const a = await api("POST", "/auth/logout", { body: {} });
		if (a.status === 204 || a.status === 401) {
			S.result = null;
			keepResult();
			tab.set("qrwty-flash", "signedOut");
			// Also end the identity provider's session, so the next sign-in asks again; back to /.
			location.assign("/auth/logout");
			return;
		}
		toast("Sign-out didn't finish. Try again in a moment.");
	}

	function copyText(text, onOk, onFail) {
		if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(onOk, onFail);
		else onFail();
	}

	/* ---------------- Events ---------------- */
	doc.addEventListener("submit", (e) => {
		const form = e.target.closest("form[data-form]");
		if (!form) return;
		e.preventDefault();
		if (form.dataset.form === "create") submitCreate();
		if (form.dataset.form === "edit" && !S.link.busy) saveDestination($("#edit-dest").value);
	});

	doc.addEventListener("input", (e) => {
		if (e.target.id === "dest") {
			S.draft = e.target.value;
			const hint = $("#dest-hint");
			if (hint && !S.fieldError) {
				const p = splitUrl(S.draft.trim());
				hint.innerHTML = /^https?:\/\/[^/?#]+\./i.test(S.draft.trim())
					? `${ic("globe", "sky")}<span>Will open <b>${esc(p.host)}</b></span>`
					: `${ic("info", "sky")}<span>Any public web address. Links never expire, and you don't need an account.</span>`;
			}
		}
		if (e.target.id === "edit-dest") S.link.draft = e.target.value;
	});

	doc.addEventListener("click", (e) => {
		const nav = e.target.closest("a[data-nav]");
		if (nav && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
			e.preventDefault();
			S.banner = null;
			closeDialog();
			navigate(nav.dataset.nav);
			return;
		}
		const el = e.target.closest("[data-act]");
		if (!el) return;
		if (el.getAttribute("aria-disabled") === "true") return;
		const act = el.dataset.act;
		switch (act) {
			case "retry":
				S.alert = null;
				return submitCreate();
			case "copy": {
				const url = S.result.shortUrl;
				copyText(
					url,
					() => {
						S.copy = "ok";
						const fb = $("#copy-feedback");
						fb.className = "feedback ok";
						fb.innerHTML = `${ic("check", "mint")}Copied to clipboard`;
					},
					() => {
						S.copy = "failed";
						const r = doc.createRange();
						r.selectNodeContents($("#short-url"));
						getSelection().removeAllRanges();
						getSelection().addRange(r);
						const fb = $("#copy-feedback");
						fb.className = "feedback bad";
						fb.innerHTML = `${ic("warn", "butter")}Your browser blocked copying. The link is selected, so use your browser's Copy.`;
					},
				);
				return;
			}
			case "copy-row": {
				const url = el.dataset.url;
				copyText(
					url,
					() => toast(`Copied ${esc(shortText(url))}`),
					() => toast("Your browser blocked copying. Select the short link and copy it."),
				);
				return;
			}
			case "png":
			case "svg":
				return exportQr(act, el.dataset.url ?? S.result.shortUrl);
			case "save":
				return save();
			case "signin":
				return signIn();
			case "signout":
				return signOut();
			case "links-retry":
				return loadLinks();
			case "more":
				return loadLinks(true);
			case "link-retry":
				return loadLink(S.id);
			case "edit":
				Object.assign(S.link, { editing: true, draft: S.link.data.destination, fieldError: null, notice: null });
				render();
				$("#edit-dest")?.focus();
				return;
			case "edit-cancel":
				Object.assign(S.link, { editing: false, fieldError: null, notice: null });
				return render();
			case "edit-retry":
				return saveDestination(S.link.draft);
			case "disable":
				return openConfirm("disable");
			case "confirm-disable":
				closeDialog();
				return setState("disabled");
			case "enable":
				if (S.view !== "link" || !S.link.data) return;
				return setState("active");
			case "delete":
				return openConfirm("delete");
			case "confirm-delete":
				return deleteLink();
			case "upgrade":
				return upgrade();
			case "portal":
				return openPortal();
			case "billing-refresh":
				Object.assign(S.plans, { timedOut: false });
				return loadPlans();
			case "delete-account":
				return openConfirm("account");
			case "confirm-delete-account":
				if (S.plans.busy) return;
				return deleteAccount();
			case "dlg-cancel":
				return closeDialog();
			case "range": {
				const n = Number(el.dataset.n);
				const maxDays = S.clicks.data?.lookback?.maxDays ?? 7;
				if (n > maxDays) {
					Object.assign(S.clicks, { notice: "lookback", picked: n });
					return render();
				}
				S.clicks.notice = null;
				return loadClicks(S.id, n);
			}
			case "clicks-refresh":
				if (S.clicks.state === "loading") return;
				return loadClicks(S.id, S.clicks.data?.series?.length ?? 7);
			case "export":
				return exportCsv();
			default:
		}
	});

	window.addEventListener("popstate", () => {
		closeDialog();
		S.banner = null;
		enter({ moved: true });
	});

	let resizeTimer;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => S.view === "clicks" && render(), 150);
	});

	/* ---------------- Boot ---------------- */
	async function boot() {
		const url = new URL(location.href);
		const outcome = url.searchParams.get("signin");
		if (outcome) {
			url.searchParams.delete("signin");
			history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
		}
		const flash = tab.get("qrwty-flash");
		tab.set("qrwty-flash", null);
		// The first paint doesn't wait for the session: Create works at once, account views wait.
		const first = parse(location.pathname);
		S.view = first.view;
		S.id = first.id;
		render();
		await loadSession();
		if (flash === "deleted") S.banner = { kind: "deleted" };
		else if (flash === "signedOut") S.banner = { kind: "signedOut" };
		const r = S.result;
		if (r && r.save === "saving") r.save = "signin"; // a reload during the claim: the same key replays it
		if (r && r.save === "signin") {
			if (outcome === "cancelled" || outcome === "failed" || !session?.authenticated) r.save = "ready";
			keepResult();
		}
		if (outcome === "cancelled") S.banner = { kind: "signinCancelled" };
		if (outcome === "failed") S.banner = { kind: "signinFailed" };
		if (S.banner?.kind === "expired" && session?.authenticated) S.banner = null;
		enter();
		if (r && r.save === "signin" && session?.authenticated && S.view === "create") claim();
		fetch("/build.json", { cache: "no-store" })
			.then((b) => (b.ok ? b.json() : null))
			.then((b) => {
				if (b?.commit) $("#build").textContent = `build ${String(b.commit).slice(0, 7)}`;
			})
			.catch(() => {});
	}
	boot();
})();
