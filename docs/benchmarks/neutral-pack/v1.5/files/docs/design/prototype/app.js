/*
 * QRWTY clickable prototype (Q11). Static, no build step, no network requests.
 * Every screen and state of design-brief.md is reachable from the "Prototype" bar or by mouse.
 * URL options for checks: ?shot=1 hides the prototype bar; ?state=<view>.<state> opens a state;
 * ?theme=light|dark forces a theme. Views are hash routes (#create, #links, ...).
 * Content is example data on reserved .example hosts; nothing here is a real customer's.
 */
(() => {
	"use strict";

	const doc = document;
	const root = doc.documentElement;
	const $ = (sel, scope = doc) => scope.querySelector(sel);
	const esc = (s) =>
		String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
	const params = new URLSearchParams(location.search);
	if (params.get("shot") === "1") root.classList.add("shot");
	const FRAMED = (() => {
		try {
			return window.top !== window.self;
		} catch {
			return true;
		}
	})();
	const store = {
		get(k) {
			try {
				return localStorage.getItem(k);
			} catch {
				return null;
			}
		},
		set(k, v) {
			try {
				localStorage.setItem(k, v);
			} catch {
				/* storage unavailable */
			}
		},
	};

	/* ---------------- Icons: ink outline, one accent fill, one light fill ---------------- */
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
		calendar: '<rect class="o l" x="3" y="5" width="18" height="16" rx="3"/><rect class="a" x="4" y="6" width="16" height="4"/><path class="o" d="M3 10h18"/><rect class="o a" x="6.6" y="2.6" width="2.8" height="5" rx="1.2"/><rect class="o a" x="14.6" y="2.6" width="2.8" height="5" rx="1.2"/>',
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
		paid: ["n-acct", '<path class="mk" d="M6 .5l1.6 3.4 3.7.4-2.8 2.5.8 3.7L6 8.6 2.7 10.5l.8-3.7L.7 4.3l3.7-.4z"/>', "Paid"],
		current: ["n-ok", '<circle class="mk" cx="6" cy="6" r="5"/>', "Current plan"],
	};
	const chip = (kind, text) => {
		const [cls, mark, label] = CHIPS[kind];
		return `<span class="chip ${cls}"><svg viewBox="0 0 12 12" aria-hidden="true">${mark}</svg>${esc(text ?? label)}</span>`;
	};

	/* ---------------- Example data ---------------- */
	const ORIGIN = "https://qrwty.io";
	const SAMPLE = [
		["Bq7Lm2xT0c", "https://tickets.northside-hall.example/events/2026/12/winter-craft-market-and-food-trucks?ref=poster-a3&seat-map=main-floor", "active", 412, 437, "2026-11-10", 2],
		["k9PzW4rQe1", "https://docs.fieldnotes.example/guides/getting-started/install-on-windows-macos-and-linux#troubleshooting-proxy-settings", "active", 96, 131, "2026-11-08", 1],
		["Cf3uLx8NaV", "https://café-lumière.example/menu/brunch?lang=fr", "active", 58, 61, "2026-11-06", 1],
		["Rv20hKq7Ys", "https://www.riverside-clinic.example/appointments/flu-vaccine-2026?lang=en&utm_source=qr&utm_medium=window-sign", "disabled", 0, 0, "2026-11-03", 3],
		["mT6aZ1bXo4", "https://forms.parent-council.example/volunteer/spring-fair-2027?school=maple-grove-elementary", "active", 23, 24, "2026-11-02", 1],
		["Wd8sE5nJ2g", "https://free-gift-cards-now.example/claim?id=88213&promo=holiday", "blocked", 0, 7, "2026-10-30", 1],
		["p4YqN7vC1z", "https://shop.trailhead-outfitters.example/collections/winter/products/insulated-hiking-boot-mens-wide?variant=44017&size=10.5", "active", 187, 205, "2026-10-28", 2],
		["Ha5Gt0kM9w", "https://menu.nightjar-ramen.example/", "active", 341, 350, "2026-10-25", 1],
		["z2XcR8uP6e", "https://archive.city-council.example/meetings/2026-11-04/agenda-and-supporting-documents.pdf", "active", 12, 19, "2026-10-21", 1],
		["Nq1Vb6sD3h", "https://podcast.hollow-pine.example/episodes/142-what-the-soil-remembers?t=1820", "active", 77, 80, "2026-10-17", 1],
		["e7JkT2mW8r", "https://jobs.greenway-logistics.example/openings/warehouse-associate-night-shift?source=bus-shelter-ad", "active", 9, 9, "2026-10-12", 1],
		["Lx4Fp9cY5u", "https://studio-ninefold.example/portfolio/2026/packaging-redesign-for-a-local-roastery", "active", 31, 33, "2026-10-08", 1],
	].map(([slug, dest, state, clicks, attempts, created, version], i) => ({
		id: `lnk_${i + 1}`,
		slug,
		dest,
		state,
		clicks,
		attempts,
		created,
		version,
	}));
	const WALK_URL =
		"https://harbourline-bakery.example/orders/holiday-2026/preorder?pickup=saturday&branch=north-end&utm_source=counter-card";
	const PERIOD_END = "1 Dec 2026";

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
	const shortUrl = (slug) => `${ORIGIN}/${slug}`;
	function shortHtml(slug) {
		return `<span class="scheme">https://</span><span class="host">qrwty.io/</span><span class="slug">${esc(slug)}</span>`;
	}
	const B62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	function newSlug() {
		const bytes = new Uint8Array(10);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => B62[b % 62]).join("");
	}
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
		if (h === "qrwty.io" || h.endsWith(".qrwty.io")) return "This is already a QRWTY link, so it can't be shortened again.";
		if (new TextEncoder().encode(v).length > 8192) return "This link is longer than 8 KB. Remove some of the part after the ? and try again.";
		return null;
	}

	/* ---------------- State ---------------- */
	const VIEWS = {
		create: { label: "Create", title: "Shorten a link" },
		result: { label: "Result", title: "Your short link" },
		signin: { label: "Sign-in", title: "Sign in" },
		links: { label: "My links", title: "My links" },
		link: { label: "Link details", title: "Link details" },
		clicks: { label: "Click analytics", title: "Click analytics" },
		plans: { label: "Plans and billing", title: "Plans and billing" },
		checkout: { label: "Payment page", title: "Payment page" },
		error: { label: "Public error page", title: "Link unavailable" },
		tokens: { label: "Token sheet", title: "Token sheet" },
	};
	const STATES = {
		create: [["blank", "Blank"], ["pasted", "Pasted URL"], ["invalid", "Invalid URL"], ["submitting", "Submitting"], ["double", "Double click"], ["offline", "Offline"], ["rate", "Rate limited"], ["reputation", "Reputation rejected"], ["provider", "Provider unavailable"], ["error", "Unknown failure"]],
		result: [["ready", "Ready, save invitation"], ["copied", "Copy succeeded"], ["copyFailed", "Copy failed"], ["opened", "Open"], ["downloaded", "QR downloaded"], ["claimExpired", "Claim expired"], ["alreadyClaimed", "Already claimed"], ["saved", "Saved after sign-in"]],
		signin: [["start", "Start: the sign-in page"], ["success", "Callback success"], ["failure", "Callback failure"], ["cancelled", "Cancelled"], ["expired", "Session expired"], ["restored", "Restored return location"]],
		links: [["populated", "Populated"], ["empty", "Empty"], ["loading", "Loading"], ["more", "Pagination"], ["stale", "Stale data"], ["network", "Network failure"], ["unauthorized", "Unauthorized object"], ["signedOut", "Signed out"]],
		link: [["view", "Details"], ["editing", "Editing"], ["validation", "Validation"], ["conflict", "Version conflict"], ["saved", "Saved"], ["confirmDisable", "Confirm disable"], ["disabled", "Disabled, with undo"], ["blocked", "Blocked by operator"], ["confirmDelete", "Delete consequence"]],
		clicks: [["available", "Available data"], ["none", "No clicks"], ["delayed", "Delayed pipeline"], ["incident", "Reconciliation incident"], ["lookback", "Tier lookback"], ["bounds", "Date bounds"], ["exportFailed", "Failed export"], ["exported", "Exported"], ["paid", "Paid: 90 days, breakdowns"]],
		plans: [["free", "Free tier"], ["limit", "Limits reached"], ["checkout", "Checkout pending"], ["checkoutCancelled", "Checkout cancelled"], ["confirming", "Confirming payment"], ["active", "Active paid"], ["grace", "Failed payment, grace"], ["portalDown", "Portal unavailable"], ["cancelScheduled", "Cancellation scheduled"], ["downgraded", "Downgraded"], ["deletion", "Deletion pending"], ["signedOut", "Signed out"]],
		checkout: [["pay", "Hosted payment page"]],
		error: [["unknown", "Unknown link"], ["deleted", "Expired or deleted"], ["disabled", "Disabled"], ["blocked", "Blocked"], ["outage", "Temporary outage"]],
		tokens: [["sheet", "Token sheet"]],
	};
	const fresh = () => ({
		view: "create",
		state: "blank",
		draft: "",
		fieldError: null,
		alert: null,
		busy: false,
		signedIn: false,
		plan: "free",
		result: null,
		links: SAMPLE.map((l) => ({ ...l })),
		current: SAMPLE[0].id,
		search: "",
		filter: "all",
		range: 7,
		editDraft: "",
		used: 3,
	});
	let S = fresh();

	function makeResult(dest) {
		const slug = newSlug();
		return { id: `lnk_new_${slug}`, slug, dest, qr: QrwtyQr.encode(shortUrl(slug)), created: "2026-11-14", saved: false };
	}
	function ensureResult() {
		if (!S.result) {
			S.result = makeResult(WALK_URL);
			S.result.slug = "7Hq2xP9kLm";
			S.result.qr = QrwtyQr.encode(shortUrl(S.result.slug));
		}
		return S.result;
	}
	const currentLink = () => S.links.find((l) => l.id === S.current) ?? S.links[0];

	/* Sets up coherent data for a picked state. */
	function applyState(view, state) {
		S.view = view;
		S.state = state;
		S.alert = null;
		S.fieldError = null;
		S.busy = false;
		const account = ["links", "link", "clicks"].includes(view) || (view === "plans" && state !== "signedOut");
		if (account) S.signedIn = state !== "signedOut";
		if (view === "plans") {
			S.plan = ["active", "grace", "portalDown", "cancelScheduled", "confirming"].includes(state) && state !== "confirming" ? "paid" : "free";
			if (state === "signedOut") S.signedIn = false;
			S.used = state === "limit" ? 5 : 3;
		}
		if (view === "clicks") {
			S.plan = state === "paid" ? "paid" : "free";
			S.range = state === "paid" ? 90 : state === "lookback" ? 30 : 7;
		}
		if (view === "create") {
			S.result = null;
			S.signedIn = false;
			S.draft = { blank: "", invalid: "harbourline bakery holiday preorder" }[state] ?? WALK_URL;
			if (state === "invalid") S.fieldError = validate(S.draft);
			if (state === "submitting" || state === "double") S.busy = true;
			if (["offline", "rate", "reputation", "provider", "error"].includes(state)) S.alert = state;
		}
		if (view === "result" || (view === "signin" && !["start", "expired"].includes(state))) {
			ensureResult();
			S.draft = "";
			S.signedIn = ["saved", "success", "restored"].includes(state);
			S.result.saved = S.signedIn;
		}
		if (view === "signin" && state === "start") ensureResult();
		if (view === "link") {
			S.current = state === "blocked" ? "lnk_6" : state === "disabled" ? "lnk_4" : "lnk_1";
			const l = currentLink();
			if (state === "disabled") l.state = "disabled";
			S.editDraft = state === "validation" ? "tickets.northside-hall.example/winter market" : `${l.dest.split("?")[0]}?ref=poster-b`;
			if (state === "validation") S.fieldError = validate(S.editDraft);
		}
	}

	/* ---------------- Rendering ---------------- */
	const main = $("#main");
	function notice(kind, iconName, tone, title, body, extra = "", attrs = "") {
		const id = `n-${Math.random().toString(36).slice(2, 8)}`;
		return `<div class="notice ${kind}" ${attrs.replace("$ID", id)}>${ic(iconName, tone)}<strong id="${id}">${title}</strong><p>${body}</p>${extra ? `<div class="row">${extra}</div>` : ""}</div>`;
	}
	const alertBox = (kind, iconName, tone, title, body, extra) =>
		notice(kind, iconName, tone, title, body, extra, 'role="alert" aria-labelledby="$ID"');
	const statusBox = (kind, iconName, tone, title, body, extra) =>
		notice(kind, iconName, tone, title, body, extra, 'role="status" aria-labelledby="$ID"');

	function renderNav() {
		const items = [
			["create", "Create", "link", "sky"],
			["links", "My links", "list", "mint"],
			["plans", "Plans and billing", "card", "butter"],
		];
		const on = { create: "create", result: "create", signin: "create", links: "links", link: "links", clicks: "links", plans: "plans", checkout: "plans" }[S.view];
		$("#nav").innerHTML = items
			.map(
				([v, label, icon, tone]) =>
					`<li><a href="#${v}" data-act="go" data-view="${v}"${on === v ? ' aria-current="page"' : ""}>${ic(icon, tone)}<span>${label}</span></a></li>`,
			)
			.join("");
		$("#account").innerHTML = S.signedIn
			? `<span class="who"><span class="avatar" aria-hidden="true">AR</span><span class="name">Alex Rivera</span><span class="plan">${S.plan === "paid" ? "Paid" : "Free"} plan</span></span><button type="button" class="btn btn-sm btn-chrome" data-act="signout">Sign out</button>`
			: `<button type="button" class="btn btn-sm btn-chrome" data-act="signin">${ic("person", "lilac")}Sign in</button>`;
	}

	function dockHtml() {
		const r = S.view === "result" || (S.view === "signin" && S.result && !["start", "expired"].includes(S.state));
		const err = S.fieldError;
		const d = S.draft;
		const parts = d && !err ? splitUrl(d.trim()) : null;
		const idn = parts && /[^\x00-\x7f]/.test(parts.host);
		const hint = parts?.host
			? `${ic("globe", "sky")}<span>Will open <b>${esc(parts.host)}</b>${idn ? ` <span class="muted">(shown to some browsers as ${esc(punycodeHost(parts.host))})</span>` : ""}</span>`
			: `${ic("info", "sky")}<span>Any public web address. Links never expire, and you don't need an account.</span>`;
		const busy = S.busy;
		let alerts = "";
		if (S.alert === "offline")
			alerts = alertBox("n-warn", "offline", "sky", "You are offline", "Connect to the internet, then press Shorten again. Your link is still in the box.");
		if (S.alert === "rate")
			alerts = alertBox("n-warn", "clock", "butter", "Too many new links", "This connection made a lot of links in the last minute. Try again in 30 seconds. Nothing was created.");
		if (S.alert === "reputation")
			alerts = alertBox("n-bad", "shield", "rose", "This destination was refused", "Our safety check lists this address for phishing or malware, so QRWTY won't link to it. If you typed it, check the spelling.");
		if (S.alert === "provider")
			alerts = alertBox("n-bad", "warn", "butter", "Link not created", "We couldn't run the safety check on this address just now, so nothing was created. Try again in a minute.", `<button type="button" class="btn btn-sm" data-act="retry">${ic("retry")}Try again</button>`);
		if (S.alert === "error")
			alerts = alertBox("n-bad", "warn", "butter", "Link not created", "QRWTY didn't answer in time. Nothing was created. Try again in a few seconds.", `<button type="button" class="btn btn-sm" data-act="retry">${ic("retry")}Try again</button>`);
		return `<form class="dock${r ? " has-result" : ""}" data-form="create" novalidate>
			<label class="label" for="dest">Long link</label>
			<div class="dock-row">
				<input class="input" id="dest" name="dest" type="url" inputmode="url" autocomplete="url" spellcheck="false"
					placeholder="${r ? "Paste another long link" : "https://"}" value="${esc(d)}"${err ? ' aria-invalid="true" aria-describedby="dest-error"' : ' aria-describedby="dest-hint"'} />
				<button type="submit" class="btn btn-primary" id="shorten"${busy ? ' aria-busy="true" aria-disabled="true"' : ""}>${busy ? '<span class="spin" aria-hidden="true"></span>' : ic("link", "sky")}Shorten</button>
			</div>
			${err ? `<p class="field-error" id="dest-error" role="alert">${ic("warn", "butter")}<span>${esc(err)}</span></p>` : `<p class="hint" id="dest-hint">${hint}</p>`}
			<p class="sr-only" aria-live="polite">${busy ? "Creating your short link" : ""}</p>
			${S.state === "double" ? `<p class="hint">${ic("check", "mint")}<span>Clicked twice? The second click waits for the first, so you get one link.</span></p>` : ""}
			<div class="alerts">${alerts}</div>
		</form>`;
	}

	function qrSvg(qr) {
		return QrwtyQr.toSvg(qr).replace("<svg ", '<svg role="img" aria-label="QR code for the short link" ');
	}
	function pngInfo(qr) {
		const dim = qr.size + 8;
		const px = Math.floor(1200 / dim) * dim;
		return { px, cm: ((px / 300) * 2.54).toFixed(1) };
	}

	function trayHtml() {
		const r = ensureResult();
		const p = splitUrl(r.dest);
		const st = S.view === "signin" ? { success: "saved", restored: "saved", failure: "ready", cancelled: "ready" }[S.state] : S.state;
		const info = pngInfo(r.qr);
		let feedback = "";
		if (st === "copied") feedback = `<span class="feedback ok">${ic("check", "mint")}Copied to clipboard</span>`;
		if (st === "copyFailed")
			feedback = `<span class="feedback bad">${ic("warn", "butter")}Your browser blocked copying. The link is selected, so use your browser's Copy.</span>`;
		let save = `<div class="save">${ic("save", "lilac", "ic-lg")}<div class="stack" style="gap:4px"><h3>Keep this link in your account</h3><p>Change where it goes, see clicks by day, and find it again later. It works the same either way. Save it from this tab within 24 hours.</p></div><button type="button" class="btn btn-account" data-act="save">${ic("person", "lilac")}Save to my links</button></div>`;
		if (st === "claimExpired")
			save = `<div class="save n-off" role="status" aria-labelledby="save-title">${ic("clock", "sky", "ic-lg")}<div class="stack" style="gap:4px"><h3 id="save-title">This link can no longer be saved</h3><p>Links can be saved to an account for 24 hours after you make them, from the same browser tab. It keeps working for everyone.</p></div></div>`;
		if (st === "alreadyClaimed")
			save = `<div class="save n-off" role="status" aria-labelledby="save-title">${ic("info", "sky", "ic-lg")}<div class="stack" style="gap:4px"><h3 id="save-title">This link is already in an account</h3><p>It was saved earlier. If it's yours, sign in with that account to find it in My links.</p></div></div>`;
		if (st === "saved")
			save = `<div class="save n-ok" role="status" aria-labelledby="save-title">${ic("check", "mint", "ic-lg")}<div class="stack" style="gap:4px"><h3 id="save-title">Saved to My links</h3><p>Signed in as Alex Rivera. You can now change where it goes and see its clicks.</p></div><a class="btn" href="#link" data-act="manage" data-id="${r.id}">${ic("pencil", "butter")}Manage this link</a></div>`;
		const signinNote =
			S.view === "signin" && S.state === "failure"
				? alertBox("n-bad", "warn", "butter", "Sign-in did not finish", "The sign-in page sent back an error. Your link still works and is still here.", `<button type="button" class="btn btn-sm btn-account" data-act="save">${ic("retry")}Try again</button>`)
				: S.view === "signin" && S.state === "cancelled"
					? statusBox("n-info", "info", "sky", "Sign-in cancelled", "Your link and QR code are still here. You can save it from this tab until tomorrow at this time.")
					: S.view === "signin" && S.state === "restored"
						? statusBox("n-ok", "check", "mint", "Welcome back", "You're signed in and back on the page you left, with your link saved.")
						: "";
		return `${signinNote}<section class="tray" aria-labelledby="tray-title">
			<div class="tray-main">
				<div class="row" style="justify-content:space-between">
					<h2 id="tray-title" class="ready" tabindex="-1">${ic("check", "mint")}Your short link is ready</h2>
					<span class="meta">Made just now · never expires</span>
				</div>
				<span class="shorturl" id="short-url" role="textbox" aria-readonly="true" aria-label="Short link" tabindex="0">${shortHtml(r.slug)}</span>
				<div class="actions">
					<button type="button" class="btn btn-primary" data-act="copy">${ic("copy", "sky")}Copy short link</button>
					<a class="btn" href="${esc(shortUrl(r.slug))}" target="_blank" rel="noopener" data-act="open">${ic("open", "sky")}Open short link</a>
					<span id="copy-feedback" class="feedback" aria-live="polite">${feedback}</span>
				</div>
				<div class="dest">
					${ic("globe", "sky")}
					<span>Opens <span class="host">${esc(p.host)}</span></span>
					<span class="full" title="${esc(r.dest)}">${esc(truncMid(r.dest, 96))}</span>
				</div>
			</div>
			<div class="tray-side">
				<div class="sticker">${qrSvg(r.qr)}</div>
				<div class="downloads">
					<button type="button" class="btn" data-act="png">${ic("download", "mint")}Download PNG</button>
					<button type="button" class="btn" data-act="svg">${ic("download", "mint")}Download SVG</button>
				</div>
				<p class="qr-meta" id="dl-feedback" aria-live="polite">${
					st === "downloaded"
						? `<span class="feedback ok" style="justify-content:center">${ic("check", "mint")}Saved qrwty-${esc(r.slug)}.png</span>`
						: `PNG ${info.px} px, sharp up to ${info.cm} cm at 300 dpi. SVG scales to any size. Keep the white border when you print.`
				}</p>
			</div>
			${save}
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
		const r = S.view === "result" || S.view === "signin";
		return `<div class="page">
			<div class="page-head"><div>
				<h1 tabindex="-1">Shorten a link</h1>
				<p class="lead">Paste a long address. You get a short link and a QR code right away.</p>
			</div></div>
			${dockHtml()}
			${r ? trayHtml() : placeholderTray()}
		</div>`;
	}

	function viewSignin() {
		if (S.state === "expired") return viewLinks();
		if (S.state !== "start") return viewCreate();
		return `<div class="hosted">
			<p class="standin">Stand-in for the identity provider's sign-in page</p>
			<div class="hosted-frame">
				<h1 tabindex="-1">Sign in to QRWTY</h1>
				<p class="muted">Save to my links and Sign in come straight here. The real page belongs to the identity provider; afterwards it returns you to the page you left, with your link still there.</p>
				<div class="field"><label for="idp-email">Email</label><input class="input input-sm" id="idp-email" type="email" value="alex@example.com" autocomplete="off" /></div>
				<div class="row">
					<button type="button" class="btn btn-account" data-act="idp-continue">Continue as Alex Rivera</button>
					<button type="button" class="btn btn-quiet" data-act="idp-cancel">Cancel sign-in</button>
				</div>
			</div>
		</div>`;
	}

	function rowHtml(l, i) {
		const p = splitUrl(l.dest);
		const hostId = `row-host-${l.id}`;
		return `<li class="linkrow${i === 0 && l.id.startsWith("lnk_new") ? " fresh" : ""}">
			<div class="dest-cell"><span class="host" id="${hostId}" title="${esc(p.host)}">${esc(p.host)}</span><span class="path" title="${esc(l.dest)}">${esc(truncMid(p.rest || "/", 60))}</span></div>
			<div class="status-cell">${chip(l.state)}</div>
			<span class="short">qrwty.io/${esc(l.slug)}</span>
			<span class="clicks"><b>${l.clicks.toLocaleString("en-US")}</b>${l.state === "blocked" ? "blocked since 9 Nov" : "clicks, last 7 days"}</span>
			<div class="acts">
				<button type="button" class="btn btn-sm" data-act="copy-row" data-id="${l.id}" aria-describedby="${hostId}">${ic("copy", "sky")}Copy link</button>
				<a class="btn btn-sm" href="#link" data-act="manage" data-id="${l.id}" aria-describedby="${hostId}">Manage${ic("next")}</a>
			</div>
		</li>`;
	}

	function usageMeter(label, used, limit) {
		const pct = Math.min(100, Math.round((used / limit) * 100));
		return `<div class="meter"><div class="meter-top"><span>${label}</span><span class="num">${used} of ${limit}</span></div>
			<div class="meter-track" role="img" aria-label="${used} of ${limit} used"><div class="meter-fill${used >= limit ? " full" : ""}" style="width:${pct}%"></div></div></div>`;
	}

	function viewLinks() {
		const st = S.view === "signin" ? "expired" : S.state;
		const head = `<div class="page-head"><div><h1 tabindex="-1">My links</h1><p class="lead">Every link in your account, newest first.</p></div>
			${S.signedIn && st !== "expired" ? usageMeter(`New links this month · ${S.plan === "paid" ? "Paid" : "Free"}`, S.used, S.plan === "paid" ? 50 : 5) : ""}</div>`;
		if (st === "expired")
			return `<div class="page">${head}${alertBox("n-warn", "clock", "butter", "Session expired", "You were signed out after a long time away. Sign in again and we'll bring you back to My links. Nothing was changed.", `<button type="button" class="btn btn-sm btn-account" data-act="signin">${ic("person", "lilac")}Sign in again</button>`)}</div>`;
		if (!S.signedIn || st === "signedOut")
			return `<div class="page">${head}<div class="empty">${ic("person", "lilac", "ic-lg")}<h2>Sign in to see your links</h2><p>Links you make while signed in, or save from a result, are listed here. Making a link never needs an account.</p><div class="row"><button type="button" class="btn btn-account" data-act="signin">${ic("person", "lilac")}Sign in to see your links</button><a class="btn" href="#create" data-act="go" data-view="create">Shorten a link</a></div></div></div>`;
		if (st === "unauthorized")
			return `<div class="page"><a class="back" href="#links" data-act="go" data-view="links">${ic("back")}Back to My links</a>${alertBox("n-bad", "lock", "rose", "You cannot open this link", "It isn't in your account, or it was deleted. If someone sent you this page, ask them for the short link instead.")}</div>`;
		const toolbar = `<div class="toolbar">
			<div class="field"><label for="search">Search links</label><input class="input input-sm" id="search" type="search" placeholder="Address or short link" value="${esc(S.search)}" /></div>
			<div class="seg" role="group" aria-label="Show">${["all", "active", "disabled"].map((f) => `<button type="button" data-act="filter" data-f="${f}" aria-pressed="${S.filter === f}">${f === "all" ? "All" : f === "active" ? "Active" : "Disabled"}</button>`).join("")}</div>
		</div>`;
		if (st === "empty")
			return `<div class="page">${head}<div class="empty">${ic("list", "mint", "ic-lg")}<h2>No links yet</h2><p>Links you make while signed in, and guest links you save from a result, show up here with their clicks.</p><a class="btn btn-primary" href="#create" data-act="go" data-view="create">${ic("link", "sky")}Shorten a link</a></div></div>`;
		if (st === "loading")
			return `<div class="page">${head}${toolbar}<div role="status" aria-label="Loading your links" class="list" aria-busy="true">${Array.from({ length: 5 }, () => `<div class="linkrow"><div class="dest-cell"><span class="skel" style="width:60%"></span><span class="skel" style="width:85%"></span></div><span class="skel"></span><span class="skel"></span><span class="skel"></span><span class="skel" style="width:120px"></span></div>`).join("")}</div><p class="meta">Loading your links…</p></div>`;
		if (st === "network")
			return `<div class="page">${head}${alertBox("n-bad", "offline", "sky", "Could not load your links", "QRWTY didn't answer. Your links still work for everyone who opens them. Check your connection and try again.", `<button type="button" class="btn btn-sm" data-act="go" data-view="links">${ic("retry")}Try again</button>`)}</div>`;
		let rows = S.links.filter((l) => (S.filter === "all" ? true : l.state === S.filter));
		const q = S.search.trim().toLowerCase();
		if (q) rows = rows.filter((l) => l.dest.toLowerCase().includes(q) || l.slug.toLowerCase().includes(q));
		const shown = st === "more" ? rows : rows.slice(0, 10);
		const stale =
			st === "stale"
				? statusBox("n-warn", "clock", "butter", "This list may be out of date", "We couldn't refresh it, so it shows links and click counts from 22:28 UTC, 12 minutes ago.", `<button type="button" class="btn btn-sm" data-act="go" data-view="links">${ic("retry")}Refresh</button>`)
				: "";
		return `<div class="page">${head}${stale}${toolbar}
			<p class="meta">Click counts as of 22:40 UTC. They usually trail real visits by under a minute.</p>
			<div class="list"><div class="list-head" aria-hidden="true"><span>Destination</span><span>Status</span><span>Short link</span><span>Clicks</span><span></span></div>
			<ul class="rows" role="list" aria-label="Links">${shown.map(rowHtml).join("") || `<li class="linkrow"><span>No links match.</span></li>`}</ul>
			<div class="list-foot"><span class="num">Showing ${shown.length} of ${st === "more" ? shown.length : rows.length + 15}</span>${st === "more" ? '<span class="muted">All links shown</span>' : `<button type="button" class="btn btn-sm" data-act="more">Show more links</button>`}</div></div>
		</div>`;
	}

	function viewLink() {
		const l = currentLink();
		const p = splitUrl(l.dest);
		const st = S.state;
		const blocked = l.state === "blocked";
		let top = "";
		if (blocked)
			top = alertBox("n-bad", "shield", "rose", "Blocked for safety", "QRWTY's safety team blocked this link on 9 Nov 2026 after its destination was reported for phishing. Visitors see a safety page. You can't turn it back on or change where it goes, but you can delete it.");
		if (st === "saved")
			top = statusBox("n-ok", "check", "mint", "Destination saved", `New visits go to ${esc(splitUrl(l.dest).host)}. The short link and QR code stay the same, so printed codes keep working.`);
		if (l.state === "disabled" && !blocked)
			top = statusBox("n-off", "pause", "sky", "Link disabled", "People who open it or scan its QR code see a page saying it's turned off. Turn it back on any time.", `<button type="button" class="btn btn-sm" data-act="enable">${ic("retry")}Turn link back on</button>`);
		if (st === "conflict")
			top = alertBox("n-warn", "warn", "butter", "This link changed somewhere else", "Someone saved a new destination 2 minutes ago (version 3), so your change wasn't saved. Check the newer destination below, then save yours again if it's still right.", `<button type="button" class="btn btn-sm" data-act="edit-retry">Save my destination again</button><button type="button" class="btn btn-sm btn-quiet" data-act="edit-cancel">Keep the newer one</button>`);
		const editing = ["editing", "validation", "conflict"].includes(st);
		const err = S.fieldError;
		const edit = editing
			? `<form class="card stack" data-form="edit" novalidate>
				<h2>Change destination</h2>
				<div class="field"><label for="edit-dest">New destination</label>
				<input class="input" id="edit-dest" type="url" spellcheck="false" value="${esc(S.editDraft)}"${err ? ' aria-invalid="true" aria-describedby="edit-error"' : ""} />
				${err ? `<p class="field-error" id="edit-error" role="alert">${ic("warn", "butter")}<span>${esc(err)}</span></p>` : '<p class="hint">The short link and QR code stay the same. New visits go to the new address.</p>'}</div>
				<div class="row"><button type="submit" class="btn btn-primary">${ic("check", "mint")}Save destination</button><button type="button" class="btn btn-quiet" data-act="edit-cancel">Cancel</button></div>
			</form>`
			: "";
		const acts = blocked
			? ""
			: `<div class="actions">
				${editing ? "" : `<button type="button" class="btn" data-act="edit">${ic("pencil", "butter")}Change destination</button>`}
				${l.state === "disabled" ? "" : `<button type="button" class="btn" data-act="disable">${ic("pause", "sky")}Disable link</button>`}
			</div>`;
		return `<div class="page">
			<a class="back" href="#links" data-act="go" data-view="links">${ic("back")}Back to My links</a>
			<div class="page-head"><div><span>${chip(l.state)}</span><h1 tabindex="-1" style="overflow-wrap:anywhere">${esc(p.host)}</h1><p class="meta" style="font-family:var(--font-url);overflow-wrap:anywhere">${esc(truncMid(p.rest, 90))}</p></div></div>
			${top}
			<div class="detail">
				<div class="stack" style="gap:var(--s-5)">
					<section class="card card-strong stack" aria-labelledby="sl-title">
						<h2 id="sl-title">Short link</h2>
						<span class="shorturl shorturl-sm">${shortHtml(l.slug)}</span>
						<div class="actions"><button type="button" class="btn btn-sm" data-act="copy-row" data-id="${l.id}">${ic("copy", "sky")}Copy link</button><span id="copy-feedback" class="feedback" aria-live="polite"></span></div>
						<dl class="kv">
							<dt>Destination</dt><dd style="font-family:var(--font-url);font-size:var(--fs-meta)">${esc(l.dest)}</dd>
							<dt>Created</dt><dd>${esc(l.created)}</dd>
							<dt>Version</dt><dd>${l.version}, last changed ${l.version > 1 ? "2 days ago" : "when created"}</dd>
						</dl>
						${acts}
					</section>
					${edit}
					<section class="card stack" aria-labelledby="sum-title">
						<div class="row" style="justify-content:space-between"><h2 id="sum-title">Clicks, last 7 days</h2><a class="btn btn-sm" href="#clicks" data-act="go" data-view="clicks">${ic("chart", "mint")}Click analytics</a></div>
						<div class="totals" style="grid-template-columns:repeat(2,minmax(0,1fr))">
							<div class="figure"><span class="val">${l.clicks.toLocaleString("en-US")}</span><span class="def">Filtered clicks (bots removed)</span></div>
							<div class="figure"><span class="val">${l.attempts.toLocaleString("en-US")}</span><span class="def">Recorded visits, bots included</span></div>
						</div>
					</section>
					<section class="danger-zone stack" aria-labelledby="dz-title">
						<h2 id="dz-title" style="font-size:var(--fs-lead)">Delete</h2>
						<p class="muted">Deleting stops the short link and its QR code for good. The address is never reused.</p>
						<div><button type="button" class="btn btn-danger" data-act="delete">${ic("trash", "rose")}Delete link</button></div>
					</section>
				</div>
				<aside class="detail-side" aria-label="QR code">
					<div class="sticker">${qrSvg(QrwtyQr.encode(shortUrl(l.slug)))}</div>
					<div class="downloads"><button type="button" class="btn" data-act="png" data-id="${l.id}">${ic("download", "mint")}Download PNG</button><button type="button" class="btn" data-act="svg" data-id="${l.id}">${ic("download", "mint")}Download SVG</button></div>
					<p class="qr-meta">Changing the destination doesn't change this code.</p>
				</aside>
			</div>
		</div>`;
	}

	/* Deterministic example series for the analytics view. */
	function series(days, seedText, zero) {
		let seed = 0;
		for (const c of seedText) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
		const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
		const end = new Date(Date.UTC(2026, 10, 14));
		const out = [];
		for (let i = days - 1; i >= 0; i--) {
			const d = new Date(end.getTime() - i * 86400000);
			const wk = [0.7, 1, 1.05, 1.1, 1.2, 1.5, 1.35][d.getUTCDay()];
			const f = zero ? 0 : Math.round(38 * wk * (0.55 + rnd() * 0.9) + (i < 5 ? 14 : 0));
			const bots = zero ? 0 : Math.round(f * (0.04 + rnd() * 0.08));
			out.push({ date: d, filtered: f, attempts: f + bots });
		}
		return out;
	}
	const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
	const iso = (d) => d.toISOString().slice(0, 10);

	function chartSvg(data) {
		const W = Math.round(Math.min(1132, Math.max(300, innerWidth - (innerWidth < 720 ? 68 : 116))));
		const H = innerWidth < 720 ? 200 : 240;
		const L = 40;
		const R = 12;
		const T = 22;
		const B = 30;
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
				g += `<rect class="bar" x="${x.toFixed(1)}" y="${y(d.filtered).toFixed(1)}" width="${w.toFixed(1)}" height="${(y(0) - y(d.filtered)).toFixed(1)}" rx="2"/>`;
				if (d.attempts > d.filtered)
					g += `<rect class="bot" x="${x.toFixed(1)}" y="${y(d.attempts).toFixed(1)}" width="${w.toFixed(1)}" height="${(y(d.filtered) - y(d.attempts)).toFixed(1)}" rx="2"/>`;
			}
			if ((data.length - 1 - i) % every === 0) g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle">${fmtDay(d.date)}</text>`;
		});
		const last = data[data.length - 1];
		const lx = L + (data.length - 1) * bw + bw / 2;
		g += `<text class="end" x="${lx.toFixed(1)}" y="${(y(last.attempts) - 6).toFixed(1)}" text-anchor="end">${last.filtered}</text>`;
		return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Filtered clicks per day, ${fmtDay(data[0].date)} to ${fmtDay(last.date)}. Table below.">${g}</svg>`;
	}

	function viewClicks() {
		const l = currentLink();
		const st = S.state;
		const paid = S.plan === "paid";
		const days = st === "lookback" ? 7 : S.range;
		const data = series(days, l.slug, st === "none");
		const totF = data.reduce((a, d) => a + d.filtered, 0);
		const totA = data.reduce((a, d) => a + d.attempts, 0);
		let top = "";
		if (st === "delayed")
			top = statusBox("n-warn", "clock", "butter", "Counts are running late", "New clicks are recorded safely but haven't been counted yet. These numbers are from 22:09 UTC, 31 minutes ago. They will catch up without anything lost.");
		if (st === "incident")
			top = alertBox("n-warn", "warn", "butter", "Some recorded clicks are missing from these totals", "Clicks recorded on 12 and 13 Nov aren't all counted yet. We're recounting them from the saved record, and the totals will go up when that finishes. Your link worked the whole time.");
		if (st === "lookback")
			top = statusBox("n-info", "lock", "butter", "Free shows the last 7 days", "You picked 30 days. Paid shows up to 90 days of clicks. Older counts are kept, not deleted, so they appear if you upgrade.", `<a class="btn btn-sm" href="#plans" data-act="go" data-view="plans">See plans</a>`);
		if (st === "exportFailed")
			top = alertBox("n-bad", "warn", "butter", "Export did not finish", "The CSV couldn't be made just now. It didn't use your export allowance. Try again in a minute.", `<button type="button" class="btn btn-sm" data-act="export">${ic("retry")}Try again</button>`);
		if (st === "exported") top = statusBox("n-ok", "check", "mint", "CSV exported", `clicks-${esc(l.slug)}-${iso(data[0].date)}-to-${iso(data[data.length - 1].date)}.csv · 0 exports left this month on Free.`);
		const boundsErr = st === "bounds" ? "The start date must be on or before the end date." : null;
		const rangeBtns = [7, 30, 90]
			.map((n) => `<button type="button" data-act="range" data-n="${n}" aria-pressed="${days === n && st !== "bounds"}">${n} days${!paid && n > 7 ? '<span class="tag">Paid</span>' : ""}</button>`)
			.join("");
		const from = st === "bounds" ? "2026-11-14" : iso(data[0].date);
		const to = st === "bounds" ? "2026-11-08" : iso(data[data.length - 1].date);
		const breakdown = paid
			? `<div class="breakdowns">${[
					["Referring site", [["No referrer (QR scans, apps, typed)", 61], ["newsletter.harbourline-bakery.example", 17], ["l.social-feed.example", 12], ["search.example", 7], ["Other sites", 3]]],
					["Device", [["Phone", 72], ["Computer", 21], ["Tablet", 5], ["Unknown", 2]]],
					["Country", [["Canada", 81], ["United States", 14], ["United Kingdom", 3], ["Other", 2]]],
				]
					.map(([t, rows]) => `<div class="stack"><h3 style="font-size:var(--fs-body)">${t}</h3><ul class="bars">${rows.map(([n, v]) => `<li><span style="overflow-wrap:anywhere">${esc(n)}</span><span class="num">${v}%</span><span class="track" aria-hidden="true"><span style="width:${v}%"></span></span></li>`).join("")}</ul></div>`)
					.join("")}</div>`
			: `<div class="notice n-acct">${ic("lock", "lilac")}<strong>Breakdowns come with Paid</strong><p>See clicks by referring site, device and country. Free shows totals and the daily trend.</p><div class="row"><a class="btn btn-sm" href="#plans" data-act="go" data-view="plans">See plans</a></div></div>`;
		return `<div class="page">
			<a class="back" href="#link" data-act="manage" data-id="${l.id}">${ic("back")}Back to link</a>
			<div class="page-head"><div><h1 tabindex="-1">Click analytics</h1><p class="lead" style="overflow-wrap:anywhere">${esc(splitUrl(l.dest).host)} · <span style="font-family:var(--font-url);font-size:var(--fs-body)">qrwty.io/${esc(l.slug)}</span></p></div>
			<p class="meta">As of 14 Nov 2026, 22:40 UTC.<br />Counts usually trail visits by under a minute.</p></div>
			${top}
			<div class="card stack">
				<div class="range">
					<div class="stack" style="gap:var(--s-2)"><span class="label">Range</span><div class="seg" role="group" aria-label="Range">${rangeBtns}</div></div>
					<div class="field"><label for="from">From</label><input class="input input-sm" id="from" type="date" value="${from}" min="2026-08-17" max="2026-11-14"${boundsErr ? ' aria-invalid="true" aria-describedby="range-error"' : ""} /></div>
					<div class="field"><label for="to">To</label><input class="input input-sm" id="to" type="date" value="${to}" min="2026-08-17" max="2026-11-14" /></div>
					<p class="meta" style="flex:1 1 200px">${paid ? "Paid: up to 90 days back." : "Free: the last 7 days. Dates are UTC."}</p>
				</div>
				${boundsErr ? `<p class="field-error" id="range-error" role="alert">${ic("warn", "butter")}<span>${boundsErr}</span></p>` : ""}
				<div class="totals">
					<div class="figure figure-primary"><span class="label">Filtered clicks</span><span class="val">${totF.toLocaleString("en-US")}</span><span class="def">Visits to the short link with known bots and link previews removed (filter v1).</span></div>
					<div class="figure"><span class="label">Recorded visits</span><span class="val">${totA.toLocaleString("en-US")}</span><span class="def">Every visit QRWTY recorded before redirecting, bots included.</span></div>
					<div class="figure"><span class="label">Bots and previews</span><span class="val">${(totA - totF).toLocaleString("en-US")}</span><span class="def">The difference. A click is a visit to the short link, not proof someone read the page.</span></div>
				</div>
			</div>
			<section class="card stack" aria-labelledby="trend-title">
				<div class="row" style="justify-content:space-between"><h2 id="trend-title">Clicks per day</h2>
				<div class="legend"><span><i style="background:var(--bar)"></i>Filtered clicks</span><span><i style="background:var(--bar-bots)"></i>Bots and previews</span></div></div>
				${st === "none" ? `<div class="empty" style="padding:var(--s-5)">${ic("chart", "mint", "ic-lg")}<h3>No clicks yet</h3><p>Share the link or print its QR code. Visits show up here within about a minute.</p></div>` : `<div class="chart-wrap">${chartSvg(data)}</div>`}
				<details><summary>Show as a table</summary><div class="chart-wrap"><table class="datatable"><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Filtered clicks</th><th scope="col">Recorded visits</th></tr></thead><tbody>${data.map((d) => `<tr><td>${iso(d.date)}</td><td>${d.filtered}</td><td>${d.attempts}</td></tr>`).join("")}</tbody></table></div></details>
			</section>
			<section class="card stack" aria-labelledby="bd-title"><h2 id="bd-title">Where clicks came from</h2>${breakdown}</section>
			<section class="card stack" aria-labelledby="ex-title">
				<h2 id="ex-title">Export</h2>
				<p class="muted">One row per day: date, recorded visits, filtered clicks. ${paid ? "20 exports a month on Paid; 19 left." : "1 export a month on Free; 1 left."}</p>
				<div><button type="button" class="btn" data-act="export">${ic("sheet", "mint")}Export CSV</button></div>
			</section>
		</div>`;
	}

	function viewPlans() {
		const st = S.state;
		const paid = S.plan === "paid";
		const signedIn = S.signedIn;
		const notices = {
			limit: alertBox("n-warn", "warn", "butter", "Monthly link limit reached", "You've made all 5 new links for November. Every existing link keeps working. New links unlock on 1 Dec, or upgrade for 50 a month. Guest links without an account aren't affected."),
			checkout: statusBox("n-info", "clock", "sky", "Waiting for the payment page", "Finish paying in the payment page. If you closed it, start again; you won't be charged twice.", `<button type="button" class="btn btn-sm" data-act="upgrade">Return to the payment page</button>`),
			checkoutCancelled: statusBox("n-info", "info", "sky", "Checkout cancelled", "You're still on Free. Nothing was charged."),
			confirming: statusBox("n-info", "clock", "sky", "Confirming your subscription", "The payment page says you paid. We're waiting for the payment provider to confirm it, which usually takes a few seconds. Paid features turn on when it's confirmed.", '<span class="spin" aria-hidden="true"></span><span class="meta">Checking again every few seconds</span>'),
			active: statusBox("n-ok", "check", "mint", "Paid is on", "Renews on 14 Dec 2026 for USD 5.00 (test price). Manage your card or cancel in the payment portal."),
			grace: alertBox("n-bad", "warn", "butter", "Payment failed", "Your card was declined on 12 Nov. Paid features stay on until 19 Nov while we retry. Update your card to keep Paid. Your links keep working either way.", `<button type="button" class="btn btn-sm" data-act="portal">${ic("card", "butter")}Update card</button>`),
			portalDown: alertBox("n-bad", "offline", "sky", "Payment portal unavailable", "The payment provider's portal isn't answering. Your plan hasn't changed. Try again in a few minutes."),
			cancelScheduled: statusBox("n-info", "info", "sky", "Cancellation scheduled", "Paid ends on 14 Dec 2026. After that you're on Free: 5 new links a month and 7 days of click history. Every link keeps working and recording clicks."),
			downgraded: statusBox("n-info", "info", "sky", "You are on Free again", "Paid ended on 14 Nov. Your 23 links still work and still record clicks. Click history older than 7 days is hidden until you upgrade again; nothing was deleted."),
			deletion: alertBox("n-warn", "trash", "rose", "Account deletion scheduled", "Your account will be deleted on 21 Nov 2026. Your subscription is cancelled, so there are no more charges. On that date your links are disabled and your click history is removed. Visitors will see a page saying the link is turned off.", '<button type="button" class="btn btn-sm">Keep my account</button>'),
		};
		const free = `<section class="card plan${!paid && signedIn ? " current" : ""}" aria-labelledby="p-free">
			<div class="plan-head"><h2 id="p-free">Free</h2>${!paid && signedIn ? chip("current") : ""}</div>
			<p class="price">USD 0 <small>no card needed</small></p>
			<ul class="limits">
				<li>${ic("link", "sky")}<span><b>5</b> new links a month in your account</span></li>
				<li>${ic("chart", "mint")}<span><b>7 days</b> of click history</span></li>
				<li>${ic("minus", "sky")}<span>No breakdown by site, device or country</span></li>
				<li>${ic("sheet", "mint")}<span><b>1</b> CSV export a month</span></li>
			</ul>
		</section>`;
		const paidCta = !signedIn
			? `<button type="button" class="btn btn-account" data-act="signin">${ic("person", "lilac")}Sign in to upgrade</button>`
			: paid
				? `<button type="button" class="btn" data-act="portal">${ic("card", "butter")}Manage payment</button><p class="meta">Change your card, see invoices or cancel in the payment portal.</p>`
				: st === "confirming"
					? `<button type="button" class="btn" aria-disabled="true">${ic("clock", "sky")}Confirming…</button>`
					: `<button type="button" class="btn btn-primary" data-act="upgrade">${ic("card", "butter")}Upgrade to Paid</button><p class="meta">You'll pay on the payment page, then come back here. Cancel any time.</p>`;
		const paidCard = `<section class="card plan${paid ? " current" : ""}" aria-labelledby="p-paid">
			<div class="plan-head"><h2 id="p-paid">Paid</h2>${paid ? chip("current") : ""}</div>
			<p class="price">USD 5.00 <small>a month · test price, not final</small></p>
			<ul class="limits">
				<li>${ic("link", "sky")}<span><b>50</b> new links a month in your account</span></li>
				<li>${ic("chart", "mint")}<span><b>90 days</b> of click history</span></li>
				<li>${ic("globe", "sky")}<span>Clicks by referring site, device and country</span></li>
				<li>${ic("sheet", "mint")}<span><b>20</b> CSV exports a month</span></li>
			</ul>
			<div class="stack" style="gap:var(--s-2);justify-items:start">${paidCta}</div>
		</section>`;
		return `<div class="page">
			<div class="page-head"><div><h1 tabindex="-1">Plans and billing</h1><p class="lead">Short links and QR codes are free without an account. A plan sets how many links your account makes each month and how much click history you see.</p></div>
			${signedIn ? `<span>${chip(paid ? "paid" : "free", paid ? "Paid plan" : "Free plan")}</span>` : ""}</div>
			${statusBox("n-info", "info", "sky", "Test mode", "Payments run in the payment provider's test mode. Prices are placeholders and no real card is charged.")}
			${notices[st] ?? ""}
			${signedIn ? `<section class="card stack" aria-labelledby="use-title"><div class="row" style="justify-content:space-between"><h2 id="use-title">This month</h2><span class="meta">Resets ${PERIOD_END} (UTC)</span></div><div class="usage">${usageMeter("New links", S.used, paid ? 50 : 5)}${usageMeter("CSV exports", paid ? 1 : 0, paid ? 20 : 1)}</div></section>` : ""}
			<div class="plans">${free}${paidCard}</div>
			<section class="card stack" aria-labelledby="faq-title">
				<h2 id="faq-title">What changes, and what never does</h2>
				<dl class="kv">
					<dt>If you cancel</dt><dd>Paid stays on until the end of the month you paid for, then you're on Free.</dd>
					<dt>If a payment fails</dt><dd>We retry for 7 days and Paid stays on meanwhile.</dd>
					<dt>Your links</dt><dd>Never expire or stop on any plan, including after you cancel or reach a limit.</dd>
					<dt>Deleting a link</dt><dd>Doesn't give back this month's new-link allowance.</dd>
				</dl>
			</section>
		</div>`;
	}

	function viewCheckout() {
		return `<div class="hosted">
			<p class="standin">Stand-in for the hosted payment page (test mode)</p>
			<div class="hosted-frame">
				<h1 tabindex="-1">QRWTY Paid</h1>
				<p><b>USD 5.00 a month</b> · test price, not final</p>
				<p class="muted">The real page belongs to the payment provider. QRWTY never sees your card.</p>
				<div class="row">
					<button type="button" class="btn btn-primary" data-act="pay">Pay (test fixture)</button>
					<button type="button" class="btn btn-quiet" data-act="pay-cancel">Back to QRWTY</button>
				</div>
			</div>
		</div>`;
	}

	function viewError() {
		const m = {
			unknown: ["404", "search", "This short link does not exist", "Check the address. Short links are case-sensitive, so qrwty.io/7Hq2xP9kLm and qrwty.io/7hq2xp9klm are different links."],
			deleted: ["410", "trash", "This link was deleted", "Its owner deleted it. QRWTY never gives a deleted short link to anyone else, so it won't send you somewhere unexpected."],
			disabled: ["410", "pause", "This link is turned off", "Its owner turned it off for now. It may work again later."],
			blocked: ["403", "shield", "This link was blocked for safety", "Its destination was reported as harmful, so QRWTY won't send you there."],
			outage: ["503", "clock", "Links cannot open right now", "A temporary problem stopped this link from opening. The link itself is fine. Try again in a minute."],
		}[S.state] ?? [];
		const [code, icon, title, body] = m;
		const tone = { trash: "rose", shield: "rose", pause: "sky", clock: "butter" }[icon] ?? "sky";
		return `<div class="public">
			${ic(icon === "search" ? "globe" : icon, tone, "ic-xl")}
			<p class="code">qrwty.io/7Hq2xP9kLm · ${code}</p>
			<h1 tabindex="-1">${title}</h1>
			<p class="lead">${body}</p>
			<div class="row">${S.state === "outage" ? `<button type="button" class="btn btn-primary" data-act="go" data-view="error">${ic("retry")}Try again</button>` : ""}<a class="btn" href="#create" data-act="go" data-view="create">Make your own short link</a></div>
		</div>`;
	}

	function viewTokens() {
		const cs = getComputedStyle(root);
		const v = (n) => cs.getPropertyValue(n).trim();
		const groups = [
			["Surfaces", ["--paper", "--paper-deep", "--card", "--card-edge", "--field-bg", "--field-edge"]],
			["Text and lines", ["--ink", "--ink-soft", "--ink-muted", "--line", "--link", "--focus"]],
			["Chrome", ["--chrome", "--chrome-well", "--chrome-ink", "--chrome-ink-soft", "--chrome-line", "--chrome-on"]],
			["Action", ["--accent", "--accent-press", "--on-accent", "--chrome-focus"]],
			["Status", ["--ok-bg", "--ok-ink", "--ok-dot", "--bad-bg", "--bad-ink", "--bad-dot", "--warn-bg", "--warn-ink", "--warn-dot", "--info-bg", "--info-ink", "--info-dot", "--acct-bg", "--acct-ink", "--acct-dot", "--off-bg", "--off-ink", "--off-dot", "--danger"]],
			["Icon fills, QR, charts", ["--icon-ink", "--icon-light", "--sky", "--mint", "--lilac", "--butter", "--rose", "--qr-ink", "--qr-paper", "--bar", "--bar-bots", "--grid"]],
		];
		const other = ["--font-ui", "--font-url", "--fs-meta", "--fs-body", "--fs-lead", "--fs-h3", "--fs-h2", "--fs-h1", "--fs-url", "--fw-body", "--fw-heavy", "--r-control", "--r-card", "--r-sticker", "--bw-control", "--bw-card", "--s-2", "--s-4", "--s-5", "--target", "--dur-1", "--dur-2", "--dur-3", "--ease-out", "--lift", "--lift-sm"];
		return `<div class="page">
			<div class="page-head"><div><h1 tabindex="-1">Token sheet</h1><p class="lead">Values for the current theme, read live from tokens.css. Switch the theme in the prototype bar to see the other set.</p></div></div>
			${groups.map(([t, names]) => `<section class="card stack"><h2>${t}</h2><div class="swatches">${names.map((n) => `<div class="swatch"><i style="background:var(${n})"></i><b>${n}</b><code>${esc(v(n))}</code></div>`).join("")}</div></section>`).join("")}
			<section class="card stack"><h2>Type, shape, space, motion</h2><div class="tok-grid">${other.map((n) => `<div class="tok"><b>${n}</b><code>${esc(v(n))}</code></div>`).join("")}</div>
			<p style="font-size:var(--fs-h1);font-weight:800;line-height:1.1">Shorten a link</p><p style="font-size:var(--fs-h3);font-weight:800">Your short link is ready</p><p>Body text at 15 px, weight 600, for running copy and labels.</p><span class="shorturl" style="max-width:520px">${shortHtml("7Hq2xP9kLm")}</span></section>
			<section class="card stack"><h2>Icons</h2><p class="muted">Ink outline, one accent fill, one light fill. The same drawing in both themes.</p><div class="icon-grid">${Object.keys(ICONS).filter((k) => !["back", "next", "retry"].includes(k)).map((k, i) => `<figure>${ic(k, ["sky", "mint", "lilac", "butter", "rose"][i % 5], "ic-lg")}<figcaption>${k}</figcaption></figure>`).join("")}</div></section>
		</div>`;
	}

	const VIEW_FN = { create: viewCreate, result: viewCreate, signin: viewSignin, links: viewLinks, link: viewLink, clicks: viewClicks, plans: viewPlans, checkout: viewCheckout, error: viewError, tokens: viewTokens };

	function render({ moved = false } = {}) {
		const active = doc.activeElement;
		const activeId = active && active !== doc.body ? active.id : null;
		const sel = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
		const publicPage = S.view === "error";
		$(".topbar nav").hidden = publicPage;
		$("#account").hidden = publicPage;
		renderNav();
		main.innerHTML = `<div class="wrap">${VIEW_FN[S.view]()}</div>`;
		doc.title = `${S.view === "result" ? "Your short link" : VIEWS[S.view].title} · QRWTY`;
		syncPicker();
		if (moved) {
			const h = $("h1", main);
			if (h) h.focus({ preventScroll: true });
			window.scrollTo(0, 0);
		} else if (activeId) {
			const el = doc.getElementById(activeId);
			if (el) {
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
		const dlg = $("#dialog");
		if (S.view === "link" && (S.state === "confirmDisable" || S.state === "confirmDelete")) openConfirm(S.state);
		else if (dlg.open) dlg.close();
	}

	function setHash(view) {
		try {
			history.replaceState(null, "", `${location.pathname}${location.search}#${view}`);
		} catch {
			/* sandboxed frame: the view still renders; only the address keeps the old hash */
		}
	}

	function go(view, state, opts = {}) {
		const st = state ?? STATES[view][0][0];
		if (opts.keep) {
			S.view = view;
			S.state = st;
		} else applyState(view, st);
		if (location.hash !== `#${view}`) setHash(view);
		render({ moved: opts.moved !== false });
	}

	/* ---------------- Dialogs and toasts ---------------- */
	function openConfirm(kind) {
		const dlg = $("#dialog");
		const l = currentLink();
		const host = esc(splitUrl(l.dest).host);
		dlg.setAttribute("aria-labelledby", "dlg-title");
		dlg.innerHTML =
			kind === "confirmDisable"
				? `<div class="dialog-body"><h2 id="dlg-title">Disable this link?</h2>
					<p>qrwty.io/${esc(l.slug)} to ${host}</p>
					<ul><li>People who open it or scan its QR code see a page saying it's turned off.</li><li>Clicks stop counting while it's off.</li><li>You can turn it back on any time; nothing is deleted.</li></ul>
					<div class="row"><button type="button" class="btn btn-danger-fill" data-act="confirm-disable">${ic("pause", "sky")}Yes, disable link</button><button type="button" class="btn btn-quiet" data-act="dlg-cancel">Cancel</button></div></div>`
				: `<div class="dialog-body"><h2 id="dlg-title">Delete this link for good?</h2>
					<p>qrwty.io/${esc(l.slug)} to ${host}</p>
					<ul><li>The short link and every printed copy of its QR code stop working. Visitors see a page saying it was deleted.</li><li>The address is never given to anyone else.</li><li>Its click history is removed from your account.</li><li>This month's new-link allowance isn't given back.</li></ul>
					<div class="row"><button type="button" class="btn btn-danger-fill" data-act="confirm-delete">${ic("trash", "rose")}Yes, delete link</button><button type="button" class="btn btn-quiet" data-act="dlg-cancel">Keep link</button></div></div>`;
		if (!dlg.open) dlg.showModal();
	}
	function toast(msg, action) {
		const box = doc.createElement("div");
		box.className = "toast";
		box.innerHTML = `<span>${msg}</span>${action ? `<button type="button" class="btn btn-quiet" data-act="${action[1]}">${action[0]}</button>` : ""}`;
		$("#toasts").append(box);
		setTimeout(() => box.remove(), 7000);
	}
	function exportDialog(title, bodyHtml) {
		const dlg = $("#dialog");
		dlg.setAttribute("aria-labelledby", "dlg-title");
		dlg.innerHTML = `<div class="dialog-body"><h2 id="dlg-title">${title}</h2>${bodyHtml}<p class="meta">Downloads are blocked inside this hosted preview. The local prototype (docs/design/prototype/index.html) saves the file.</p><div class="row"><button type="button" class="btn" data-act="dlg-cancel">Close</button></div></div>`;
		if (!dlg.open) dlg.showModal();
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
	function exportQr(kind, id) {
		const slug = id ? S.links.find((l) => l.id === id)?.slug : ensureResult().slug;
		const qr = QrwtyQr.encode(shortUrl(slug));
		const name = `qrwty-${slug}.${kind}`;
		if (kind === "svg") {
			const svg = QrwtyQr.toSvg(qr, { title: `QR code for ${shortUrl(slug)}` });
			if (FRAMED) return exportDialog("SVG ready", `<div class="sticker" style="width:200px">${svg}</div><p>${esc(name)} · ${svg.length.toLocaleString("en-US")} bytes, vector</p>`);
			saveBlob(new Blob([svg], { type: "image/svg+xml" }), name);
		} else {
			const canvas = doc.createElement("canvas");
			const info = QrwtyQr.toCanvas(qr, canvas, 1200);
			if (FRAMED)
				return exportDialog("PNG ready", `<div class="sticker" style="width:200px"><img alt="Exported QR code" src="${canvas.toDataURL("image/png")}" /></div><p>${esc(name)} · ${info.px} × ${info.px} px, ${info.scale} px per module</p>`);
			canvas.toBlob((b) => b && saveBlob(b, name), "image/png");
		}
		if (!id && S.view === "result") {
			const fb = $("#dl-feedback");
			if (fb) fb.innerHTML = `<span class="feedback ok" style="justify-content:center">${ic("check", "mint")}Saved ${esc(name)}</span>`;
		} else toast(`Saved ${esc(name)}`);
	}
	function exportCsv() {
		const l = currentLink();
		const data = series(S.plan === "paid" ? S.range : 7, l.slug, false);
		const csv = `date,recorded_attempts,filtered_clicks\n${data.map((d) => `${iso(d.date)},${d.attempts},${d.filtered}`).join("\n")}\n`;
		const name = `clicks-${l.slug}-${iso(data[0].date)}-to-${iso(data[data.length - 1].date)}.csv`;
		go("clicks", "exported", { keep: true, moved: false });
		if (FRAMED) exportDialog("CSV ready", `<p>${esc(name)} · ${data.length} rows</p><pre style="overflow:auto;max-height:180px;font-size:12px">${esc(csv)}</pre>`);
		else saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), name);
	}

	/* ---------------- Events ---------------- */
	function submitCreate() {
		if (S.busy) return;
		const v = $("#dest").value;
		S.draft = v;
		S.alert = null;
		const err = validate(v);
		S.fieldError = err;
		if (err) {
			render();
			$("#dest").focus();
			return;
		}
		if (!navigator.onLine) {
			S.alert = "offline";
			render();
			return;
		}
		S.busy = true;
		render();
		setTimeout(() => {
			S.busy = false;
			S.result = makeResult(v.trim());
			S.draft = "";
			S.view = "result";
			S.state = "ready";
			setHash("result");
			render();
			$("#tray-title")?.focus({ preventScroll: false });
		}, 700);
	}
	function copyText(text, onOk, onFail) {
		if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(onOk, onFail);
		else onFail();
	}

	doc.addEventListener("submit", (e) => {
		const form = e.target.closest("form[data-form]");
		if (!form) return;
		e.preventDefault();
		if (form.dataset.form === "create") submitCreate();
		if (form.dataset.form === "edit") {
			const v = $("#edit-dest").value;
			S.editDraft = v;
			S.fieldError = validate(v);
			if (S.fieldError) {
				S.state = "validation";
				render();
				$("#edit-dest").focus();
				return;
			}
			const l = currentLink();
			l.dest = v.trim();
			l.version += 1;
			S.state = "saved";
			S.fieldError = null;
			render();
		}
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
		if (e.target.id === "search") {
			S.search = e.target.value;
			render();
		}
		if (e.target.id === "edit-dest") S.editDraft = e.target.value;
	});

	doc.addEventListener("change", (e) => {
		if (e.target.id === "pick-screen") go(e.target.value, undefined, { moved: false });
		if (e.target.id === "pick-state") go(S.view, e.target.value, { moved: false });
		if (e.target.id === "pick-theme") setTheme(e.target.value);
		if (e.target.id === "from" || e.target.id === "to") {
			const f = $("#from").value;
			const t = $("#to").value;
			go("clicks", f && t && f > t ? "bounds" : S.plan === "paid" ? "paid" : "available", { keep: true, moved: false });
		}
	});

	doc.addEventListener("click", (e) => {
		const el = e.target.closest("[data-act]");
		if (!el) return;
		const act = el.dataset.act;
		const id = el.dataset.id;
		switch (act) {
			case "go":
				e.preventDefault();
				if (el.dataset.view === "result" && !S.result) return go("create");
				if (el.dataset.view === "result") return go("result", S.signedIn ? "saved" : "ready", { keep: true });
				if (["links", "plans"].includes(el.dataset.view) && S.signedIn) {
					S.alert = null;
					return go(el.dataset.view, el.dataset.view === "links" ? "populated" : S.plan === "paid" ? "active" : "free", { keep: true });
				}
				if (el.dataset.view === "links" && !S.signedIn) return go("links", "signedOut", { keep: true });
				if (el.dataset.view === "plans" && !S.signedIn) return go("plans", "signedOut", { keep: true });
				if (el.dataset.view === "create") {
					S.busy = false;
					S.alert = null;
					S.fieldError = null;
					return go("create", "blank", { keep: true });
				}
				if (el.dataset.view === "clicks") return go("clicks", S.plan === "paid" ? "paid" : "available", { keep: true });
				return go(el.dataset.view);
			case "reset":
				S = fresh();
				go("create", "blank", { moved: false });
				return;
			case "retry":
				S.alert = null;
				return submitCreate();
			case "copy": {
				const url = shortUrl(ensureResult().slug);
				const fb = $("#copy-feedback");
				copyText(
					url,
					() => {
						fb.className = "feedback ok";
						fb.innerHTML = `${ic("check", "mint")}Copied to clipboard`;
					},
					() => {
						const r = doc.createRange();
						r.selectNodeContents($("#short-url"));
						getSelection().removeAllRanges();
						getSelection().addRange(r);
						fb.className = "feedback bad";
						fb.innerHTML = `${ic("warn", "butter")}Your browser blocked copying. The link is selected, so use your browser's Copy.`;
					},
				);
				return;
			}
			case "copy-row": {
				const l = S.links.find((x) => x.id === id);
				copyText(
					shortUrl(l.slug),
					() => toast(`Copied qrwty.io/${esc(l.slug)}`),
					() => toast("Your browser blocked copying. Select the short link and copy it."),
				);
				return;
			}
			case "open":
				e.preventDefault();
				toast(`Opens qrwty.io/${esc(ensureResult().slug)} in a new tab. The prototype stays on this page.`);
				return;
			case "png":
			case "svg":
				return exportQr(act, id);
			case "save":
			case "signin":
				S.returnTo = S.view === "result" || act === "save" ? "result" : S.view === "plans" ? "plans" : "links";
				return go("signin", "start", { keep: true });
			case "idp-continue": {
				S.signedIn = true;
				if (S.returnTo === "result" && S.result) {
					S.result.saved = true;
					if (!S.links.some((l) => l.id === S.result.id))
						S.links.unshift({ id: S.result.id, slug: S.result.slug, dest: S.result.dest, state: "active", clicks: 0, attempts: 0, created: "2026-11-14", version: 1 });
					S.current = S.result.id;
					S.used = 4;
					return go("result", "saved", { keep: true });
				}
				if (S.returnTo === "plans") return go("plans", "free", { keep: true });
				return go("links", "populated", { keep: true });
			}
			case "idp-cancel":
				return go(S.result ? "signin" : "create", S.result ? "cancelled" : "blank", { keep: true });
			case "signout":
				S.signedIn = false;
				S.plan = "free";
				return go("create", "blank", { keep: true });
			case "manage":
				e.preventDefault();
				S.current = id;
				S.fieldError = null;
				return go("link", currentLink().state === "blocked" ? "blocked" : "view", { keep: true });
			case "filter":
				S.filter = el.dataset.f;
				return render();
			case "more":
				return go("links", "more", { keep: true, moved: false });
			case "edit":
				S.editDraft = currentLink().dest;
				go("link", "editing", { keep: true, moved: false });
				$("#edit-dest")?.focus();
				return;
			case "edit-cancel":
				S.fieldError = null;
				return go("link", "view", { keep: true, moved: false });
			case "edit-retry":
				S.state = "saved";
				return render();
			case "disable":
				return go("link", "confirmDisable", { keep: true, moved: false });
			case "confirm-disable":
				currentLink().state = "disabled";
				$("#dialog").close();
				go("link", "disabled", { keep: true, moved: false });
				toast("Link disabled", ["Undo", "enable"]);
				return;
			case "enable":
				currentLink().state = "active";
				toast("Link turned back on");
				return go("link", "view", { keep: true, moved: false });
			case "delete":
				return go("link", "confirmDelete", { keep: true, moved: false });
			case "confirm-delete": {
				const l = currentLink();
				S.links = S.links.filter((x) => x.id !== l.id);
				$("#dialog").close();
				S.current = S.links[0].id;
				go("links", "populated", { keep: true });
				toast(`Deleted qrwty.io/${esc(l.slug)}`);
				return;
			}
			case "dlg-cancel":
				$("#dialog").close();
				if (S.view === "link" && S.state.startsWith("confirm")) go("link", "view", { keep: true, moved: false });
				return;
			case "range": {
				const n = Number(el.dataset.n);
				if (S.plan !== "paid" && n > 7) return go("clicks", "lookback", { keep: true, moved: false });
				S.range = n;
				return go("clicks", S.plan === "paid" ? "paid" : "available", { keep: true, moved: false });
			}
			case "export":
				return exportCsv();
			case "upgrade":
				return go("checkout", "pay", { keep: true });
			case "pay":
				go("plans", "confirming", { keep: true });
				setTimeout(() => {
					if (S.view === "plans" && S.state === "confirming") {
						S.plan = "paid";
						go("plans", "active", { keep: true, moved: false });
						toast("Paid is on");
					}
				}, 2400);
				return;
			case "pay-cancel":
				return go("plans", "checkoutCancelled", { keep: true });
			case "portal":
				if (S.state === "portalDown") return;
				toast("Opens the payment portal. The prototype stays on this page.");
				return;
			default:
		}
	});

	$("#dialog").addEventListener("close", () => {
		if (S.view === "link" && S.state.startsWith("confirm")) {
			S.state = "view";
			syncPicker();
		}
	});

	/* ---------------- Prototype bar ---------------- */
	const pickScreen = $("#pick-screen");
	const pickState = $("#pick-state");
	pickScreen.innerHTML = Object.entries(VIEWS)
		.filter(([k]) => k !== "checkout")
		.map(([k, v]) => `<option value="${k}">${v.label}</option>`)
		.join("");
	function syncPicker() {
		const view = S.view === "checkout" ? "plans" : S.view;
		pickScreen.value = view;
		pickState.innerHTML = STATES[S.view].map(([k, label]) => `<option value="${k}">${label}</option>`).join("");
		pickState.value = S.state;
	}
	function setTheme(t) {
		if (t === "light" || t === "dark") root.dataset.theme = t;
		else delete root.dataset.theme;
		$("#pick-theme").value = t;
		store.set("qrwty-proto-theme", t);
		if (S.view === "tokens") render();
	}

	let resizeTimer;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => S.view === "clicks" && render(), 150);
	});

	window.addEventListener("hashchange", () => {
		const v = location.hash.slice(1);
		if (VIEW_FN[v] && v !== S.view) go(v);
	});

	/* ---------------- Boot ---------------- */
	// Keep a host's explicit data-theme unless a theme was asked for or chosen earlier.
	const initialTheme = params.get("theme") ?? store.get("qrwty-proto-theme");
	if (initialTheme) setTheme(initialTheme);
	else $("#pick-theme").value = root.dataset.theme ?? "system";
	const pick = params.get("state");
	const hashView = location.hash.slice(1);
	if (pick && pick.includes(".")) {
		const [v, s] = pick.split(".");
		applyState(v, s);
	} else if (VIEW_FN[hashView]) applyState(hashView, STATES[hashView][0][0]);
	else applyState("create", "blank");
	render();
	if (S.view === "link" && /^confirm/.test(S.state)) openConfirm(S.state);
})();
