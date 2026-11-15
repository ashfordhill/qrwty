// Q11 checks on the prototype: frozen accessible names, reflow/overflow at the brief's widths,
// reduced motion and transparency, WCAG 2.2 AA contrast (token pairs and a rendered-text scan),
// target size, focus visibility, labels, console errors and external requests.
// Usage (repo root): node docs/evidence/q11/scripts/checks.mjs
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, context, contrast, OUT, REPO, SHEETS, serve, VIEWPORTS } from "./lib.mjs";

const ALL_STATES = [...Object.entries(SHEETS).flatMap(([v, ss]) => ss.map((s) => `${v}.${s}`)), "checkout.pay", "tokens.sheet"];
const url = (origin, state) => `${origin}/index.html?shot=1&state=${state}#${state.split(".")[0]}`;

// Where each frozen name appears.
const NAME_STATES = {
	"create.blank": ["create.destination", "create.submit", "nav.signIn", "nav.library", "nav.pricing"],
	"result.ready": ["result.shortUrl", "result.copy", "result.open", "result.downloadPng", "result.downloadSvg", "result.qr", "result.save"],
	"result.saved": ["result.saved"],
	"result.claimExpired": ["result.claimExpired"],
	"result.alreadyClaimed": ["result.alreadyClaimed"],
	"create.offline": ["status.offline"],
	"create.error": ["status.error"],
	"create.provider": ["status.error"],
	"create.rate": ["status.rateLimited"],
	"create.reputation": ["create.reputationRejected"],
	"signin.expired": ["status.sessionExpired"],
	"signin.failure": ["signin.failed"],
	"signin.cancelled": ["signin.cancelled"],
	"links.populated": ["library.firstItem", "library.more"],
	"links.network": ["library.loadFailed"],
	"links.stale": ["library.stale"],
	"links.unauthorized": ["library.unauthorized"],
	"link.view": ["link.edit", "link.disable", "link.analytics", "link.delete"],
	"link.editing": ["edit.destination", "edit.save"],
	"link.saved": ["link.saved"],
	"link.conflict": ["link.conflict"],
	"link.confirmDisable": ["link.confirmDisable", "link.disableDialog"],
	"link.disabled": ["link.disabled", "link.enable"],
	"link.blocked": ["link.blocked"],
	"link.confirmDelete": ["link.confirmDelete", "link.deleteDialog"],
	"clicks.available": ["analytics.export"],
	"clicks.delayed": ["analytics.delayed"],
	"clicks.incident": ["analytics.incident"],
	"clicks.lookback": ["analytics.lookback"],
	"clicks.exportFailed": ["analytics.exportFailed"],
	"plans.free": ["billing.upgrade", "billing.testMode"],
	"plans.active": ["billing.portal", "billing.active"],
	"plans.confirming": ["billing.confirming"],
	"plans.grace": ["billing.grace"],
	"plans.limit": ["billing.limitReached"],
	"plans.checkout": ["billing.checkoutPending"],
	"plans.checkoutCancelled": ["billing.checkoutCancelled"],
	"plans.portalDown": ["billing.portalUnavailable"],
	"plans.cancelScheduled": ["billing.cancelScheduled"],
	"plans.downgraded": ["billing.downgraded"],
	"plans.deletion": ["billing.deletionScheduled"],
	"error.unknown": ["public.notFound"],
	"error.deleted": ["public.deleted"],
	"error.disabled": ["public.disabled"],
	"error.blocked": ["public.blocked"],
	"error.outage": ["public.outage"],
};

// UI and text pairs for the contrast table: [foreground token, background token, kind].
const PAIRS = [
	["--ink", "--paper", "text"], ["--ink", "--card", "text"], ["--ink", "--paper-deep", "text"], ["--ink", "--field-bg", "text"],
	["--ink-soft", "--card", "text"], ["--ink-soft", "--paper", "text"],
	["--ink-muted", "--card", "text"], ["--ink-muted", "--paper", "text"], ["--ink-muted", "--paper-deep", "text"], ["--ink-muted", "--field-bg", "text"],
	["--link", "--card", "text"], ["--link", "--paper", "text"],
	["--chrome-ink", "--chrome", "text"], ["--chrome-ink", "--chrome-well", "text"], ["--chrome-ink-soft", "--chrome", "text"], ["--chrome-on-ink", "--chrome-on", "text"],
	["--on-accent", "--accent", "text"], ["--on-accent", "--accent-press", "text"],
	["--ok-ink", "--ok-bg", "text"], ["--bad-ink", "--bad-bg", "text"], ["--warn-ink", "--warn-bg", "text"], ["--info-ink", "--info-bg", "text"], ["--acct-ink", "--acct-bg", "text"], ["--off-ink", "--off-bg", "text"],
	["--danger", "--card", "text"], ["--card", "--ink", "text"],
	["--icon-ink", "--lilac", "text"], ["--icon-ink", "--lilac-hover", "text"],
	["--line", "--card", "ui"], ["--line", "--paper", "ui"], ["--field-edge", "--card", "ui"], ["--field-edge", "--paper", "ui"], ["--field-edge", "--field-bg", "ui"], ["--field-edge", "--paper-deep", "ui"],
	["--focus", "--paper", "ui"], ["--focus", "--card", "ui"], ["--focus", "--field-bg", "ui"], ["--chrome-focus", "--chrome", "ui"],
	["--chrome-line", "--chrome", "ui"], [["--on-accent", "--accent"], "--card", "ui (primary button edge: the better of its ink border and its yellow fill)"],
	["--bar", "--card", "ui"], ["--line", "--bar-bots", "ui"], ["--ok-dot", "--ok-bg", "ui"], ["--bad-dot", "--bad-bg", "ui"], ["--warn-dot", "--warn-bg", "ui"], ["--info-dot", "--info-bg", "ui"], ["--acct-dot", "--acct-bg", "ui"], ["--off-dot", "--off-bg", "ui"],
	["--qr-ink", "--qr-paper", "qr"],
];

function validateNames(json, schema) {
	const errs = [];
	const roles = schema.properties.names.additionalProperties.properties.role.enum;
	if (typeof json.version !== "string" || !json.version) errs.push("version");
	if (Object.keys(json).some((k) => !["version", "names"].includes(k))) errs.push("extra top-level key");
	for (const [k, v] of Object.entries(json.names ?? {})) {
		if (!roles.includes(v.role)) errs.push(`${k}: role ${v.role}`);
		if (typeof v.name !== "string" || !v.name) errs.push(`${k}: name`);
		if (Object.keys(v).some((x) => !["role", "name"].includes(x))) errs.push(`${k}: extra key`);
		if (/[^\x20-\x7e]/.test(v.name)) errs.push(`${k}: non-ASCII name`);
	}
	return errs;
}

async function main() {
	const names = JSON.parse(await readFile(join(REPO, "docs/design/accessible-names.json"), "utf8"));
	const schema = JSON.parse(await readFile(join(REPO, "docs/benchmarks/neutral-pack/v1.4/oracle/ui-names.schema.json"), "utf8"));
	const oracleKeys = (await readFile(join(REPO, "docs/benchmarks/neutral-pack/v1.4/oracle/src/browser/names.ts"), "utf8")).match(/^\t"([a-zA-Z.]+)":/gm).map((m) => m.slice(2, -2));
	const result = {
		generatedAt: new Date().toISOString(),
		names: { schemaErrors: validateNames(names, schema), oracleKeysMissing: oracleKeys.filter((k) => !names.names[k]), notPlaced: Object.keys(names.names).filter((k) => !Object.values(NAME_STATES).flat().includes(k)), misses: [], checked: 0 },
		overflow: [],
		reducedMotion: [],
		contrastPairs: {},
		contrastScan: { checked: 0, failures: [], minRatio: null },
		targets: [],
		focus: [],
		unlabeled: [],
		external: [],
		errors: [],
	};
	const srv = await serve();
	const browser = await chromium.launch();

	// 1. Frozen names in each theme and viewport.
	for (const theme of ["light", "dark"]) {
		for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
			const { ctx, external, errors } = await context(browser, srv.origin, { viewport: vp, colorScheme: theme });
			const page = await ctx.newPage();
			for (const [state, keys] of Object.entries(NAME_STATES)) {
				await page.goto(url(srv.origin, state));
				for (const key of keys) {
					const { role, name } = names.names[key];
					const loc = page.getByRole(role, { name, exact: true }).first();
					const ok = await loc.isVisible().catch(() => false);
					result.names.checked++;
					if (!ok) result.names.misses.push(`${theme}/${vpName}/${state}: ${key} (${role} "${name}")`);
				}
			}
			result.external.push(...external);
			result.errors.push(...errors);
			await ctx.close();
		}
	}

	// 2. Overflow: every state at 360 and 320; core states at the brief's other sizes.
	const sizes = [
		["360x800", { width: 360, height: 800, isMobile: true, hasTouch: true }, ALL_STATES],
		["320x640", { width: 320, height: 640, isMobile: true, hasTouch: true }, ALL_STATES],
		["768x1024", { width: 768, height: 1024 }, ALL_STATES],
		["landscape 800x360", { width: 800, height: 360, isMobile: true, hasTouch: true }, ALL_STATES],
		["zoom200 720x450", { width: 720, height: 450 }, ALL_STATES],
		["1440x900", VIEWPORTS.desktop, ALL_STATES],
		["wide 2560x1080", { width: 2560, height: 1080 }, ALL_STATES],
	];
	for (const [label, vp, states] of sizes) {
		for (const motion of ["no-preference", "reduce"]) {
			if (motion === "reduce" && !label.startsWith("360")) continue;
			const { ctx, external, errors } = await context(browser, srv.origin, { viewport: vp, reducedMotion: motion });
			const page = await ctx.newPage();
			let worst = 0;
			const bad = [];
			for (const state of states) {
				await page.goto(url(srv.origin, state));
				const extra = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
				worst = Math.max(worst, extra);
				if (extra > 1) bad.push(`${state} +${extra}px`);
			}
			result.overflow.push({ size: label, motion, states: states.length, worstPx: worst, over: bad });
			result.external.push(...external);
			result.errors.push(...errors);
			await ctx.close();
		}
	}

	// 3. Reduced motion and reduced transparency.
	{
		const { ctx, external, errors } = await context(browser, srv.origin, { viewport: VIEWPORTS.mobile, reducedMotion: "reduce" });
		const page = await ctx.newPage();
		const cdp = await ctx.newCDPSession(page);
		await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-reduced-transparency", value: "reduce" }] });
		for (const state of ALL_STATES) {
			await page.goto(url(srv.origin, state));
			const r = await page.evaluate(() => {
				const infinite = [...document.querySelectorAll("*")].filter((el) => {
					const s = getComputedStyle(el);
					return Number.parseFloat(s.animationDuration) > 0.01 && s.animationIterationCount === "infinite" && s.animationName !== "none";
				}).length;
				const moving = [...document.querySelectorAll(".btn, .tray, .toast, .nav a")].filter((el) => {
					const s = getComputedStyle(el);
					return (s.animationName !== "none" && Number.parseFloat(s.animationDuration) > 0) || s.transitionDuration.split(",").some((d) => Number.parseFloat(d) > 0);
				}).length;
				const dlg = document.querySelector("dialog[open]");
				const backdrop = dlg ? getComputedStyle(dlg, "::backdrop").backgroundColor : null;
				return { infinite, moving, backdrop };
			});
			result.reducedMotion.push({ state, ...r });
		}
		// The same pages without the preference, to show the motion that reduce removes.
		const plain = await (await context(browser, srv.origin, { viewport: VIEWPORTS.mobile })).ctx.newPage();
		for (const state of ["create.submitting", "plans.confirming", "result.ready"]) {
			await plain.goto(url(srv.origin, state));
			const r = await plain.evaluate(() => ({
				infinite: [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).animationIterationCount === "infinite" && getComputedStyle(el).animationName !== "none").length,
				btnTransition: getComputedStyle(document.querySelector(".btn")).transitionDuration,
			}));
			result.reducedMotion.push({ state, preference: "no-preference", ...r });
		}
		result.external.push(...external);
		result.errors.push(...errors);
		await ctx.close();
	}

	// 4. Contrast: token pairs in each theme, then every rendered text element of every state.
	for (const theme of ["light", "dark"]) {
		const { ctx, external, errors } = await context(browser, srv.origin, { viewport: VIEWPORTS.desktop, colorScheme: theme });
		const page = await ctx.newPage();
		await page.goto(url(srv.origin, "create.blank"));
		const tokens = await page.evaluate((list) => {
			const cs = getComputedStyle(document.documentElement);
			return Object.fromEntries([...new Set(list.flat())].filter((t) => t.startsWith("--")).map((t) => [t, cs.getPropertyValue(t).trim()]));
		}, PAIRS.map(([a, b]) => [a, b].flat()));
		result.contrastPairs[theme] = PAIRS.map(([fgs, bg, kind]) => {
			const best = [fgs].flat().map((fg) => ({ fg, ratio: contrast(tokens[fg], tokens[bg]) })).sort((x, y) => y.ratio - x.ratio)[0];
			const need = kind === "text" ? 4.5 : kind === "qr" ? 7 : 3;
			return { fg: best.fg, bg, fgValue: tokens[best.fg], bgValue: tokens[bg], kind, ratio: Math.round(best.ratio * 100) / 100, need, pass: best.ratio >= need };
		});
		for (const state of ALL_STATES) {
			await page.goto(url(srv.origin, state));
			const found = await page.evaluate(() => {
				const parse = (c) => {
					const m = c.match(/rgba?\(([^)]+)\)/);
					if (!m) return null;
					const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
					return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
				};
				const bgOf = (el) => {
					for (let n = el; n; n = n.parentElement) {
						const c = parse(getComputedStyle(n).backgroundColor);
						if (c && c.a >= 0.99) return c;
						if (c && c.a > 0) return { ...c, translucent: true };
					}
					return parse(getComputedStyle(document.body).backgroundColor);
				};
				const out = [];
				const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
				const seen = new Set();
				for (let t = walker.nextNode(); t; t = walker.nextNode()) {
					const el = t.parentElement;
					if (!el || seen.has(el) || !t.textContent.trim()) continue;
					seen.add(el);
					if (el.closest(".review, svg, [hidden], .sr-only, option, select")) continue;
					const box = el.getBoundingClientRect();
					if (box.width === 0 || box.height === 0) continue;
					const s = getComputedStyle(el);
					if (s.visibility === "hidden" || Number.parseFloat(s.opacity) === 0) continue;
					const disabled = !!el.closest('[aria-disabled="true"], :disabled');
					const fg = parse(s.color);
					const bg = bgOf(el);
					const size = Number.parseFloat(s.fontSize);
					const weight = Number.parseInt(s.fontWeight, 10);
					const large = size >= 24 || (size >= 18.66 && weight >= 700);
					out.push({ text: t.textContent.trim().slice(0, 40), fg, bg, large, disabled, translucent: !!bg?.translucent });
				}
				return out;
			});
			for (const f of found) {
				const lum = ({ r, g, b }) => {
					const ch = (v) => {
						const s = v / 255;
						return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
					};
					return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
				};
				// Blend a translucent foreground over its background.
				const fg = f.fg.a < 1 ? { r: f.fg.r * f.fg.a + f.bg.r * (1 - f.fg.a), g: f.fg.g * f.fg.a + f.bg.g * (1 - f.fg.a), b: f.fg.b * f.fg.a + f.bg.b * (1 - f.fg.a) } : f.fg;
				const [hi, lo] = [lum(fg), lum(f.bg)].sort((a, b) => b - a);
				const ratio = (hi + 0.05) / (lo + 0.05);
				const need = f.large ? 3 : 4.5;
				result.contrastScan.checked++;
				if (!f.disabled) result.contrastScan.minRatio = Math.min(result.contrastScan.minRatio ?? 99, Math.round(ratio * 100) / 100);
				if (ratio < need && !f.disabled) result.contrastScan.failures.push({ theme, state, text: f.text, ratio: Math.round(ratio * 100) / 100, need });
				if (f.translucent) result.contrastScan.failures.push({ theme, state, text: f.text, note: "translucent background" });
			}
		}
		result.external.push(...external);
		result.errors.push(...errors);
		await ctx.close();
	}

	// 5. Target size (WCAG 2.5.8, 24 x 24 CSS px), labels and focus, at mobile and desktop.
	for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
		const { ctx, external, errors } = await context(browser, srv.origin, { viewport: vp });
		const page = await ctx.newPage();
		for (const state of ALL_STATES) {
			await page.goto(url(srv.origin, state));
			const r = await page.evaluate(() => {
				const controls = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [tabindex='0']")].filter((el) => !el.closest(".review, [hidden]") && el.getBoundingClientRect().width > 0);
				const small = controls
					.filter((el) => {
						const b = el.getBoundingClientRect();
						const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
						return !inline && (b.width < 24 || b.height < 24);
					})
					.map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`);
				const nameOf = (el) =>
					el.getAttribute("aria-label") ||
					(el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim() ||
					(el.labels?.[0]?.textContent ?? "").trim() ||
					(el.textContent ?? "").trim() ||
					el.getAttribute("title") ||
					"";
				const unlabeled = controls.filter((el) => !nameOf(el)).map((el) => el.outerHTML.slice(0, 100));
				return { controls: controls.length, small, unlabeled };
			});
			if (r.small.length) result.targets.push({ viewport: vpName, state, small: r.small });
			if (r.unlabeled.length) result.unlabeled.push({ viewport: vpName, state, unlabeled: r.unlabeled });
		}
		// Focus: Tab through 40 stops on three screens; the outline must be drawn (not only a shadow).
		for (const state of ["create.blank", "result.ready", "links.populated", "plans.free"]) {
			await page.goto(url(srv.origin, state));
			const stops = [];
			for (let i = 0; i < 40; i++) {
				await page.keyboard.press("Tab");
				stops.push(
					await page.evaluate(() => {
						const el = document.activeElement;
						if (!el || el === document.body) return { tag: "body", outline: true };
						const s = getComputedStyle(el);
						return { tag: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}`, outline: s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) >= 2, offset: s.outlineOffset };
					}),
				);
			}
			result.focus.push({ viewport: vpName, state, distinct: new Set(stops.map((s) => s.tag)).size, withoutOutline: stops.filter((s) => !s.outline).map((s) => s.tag) });
		}
		result.external.push(...external);
		result.errors.push(...errors);
		await ctx.close();
	}

	await browser.close();
	await srv.close();
	result.external = [...new Set(result.external)];
	result.errors = [...new Set(result.errors)];
	await writeFile(join(OUT, "results/checks.json"), `${JSON.stringify(result, null, 2)}\n`);
	const rm = result.reducedMotion.filter((r) => !r.preference);
	console.log(
		JSON.stringify(
			{
				names: { checked: result.names.checked, misses: result.names.misses.length, schemaErrors: result.names.schemaErrors, oracleKeysMissing: result.names.oracleKeysMissing, notPlaced: result.names.notPlaced },
				overflow: result.overflow.map((o) => `${o.size}${o.motion === "reduce" ? " reduce" : ""}: worst ${o.worstPx}px over ${o.states} states${o.over.length ? ` ${o.over.join(", ")}` : ""}`),
				reducedMotion: { states: rm.length, infinite: rm.reduce((a, r) => a + r.infinite, 0), moving: rm.reduce((a, r) => a + r.moving, 0), backdrops: rm.filter((r) => r.backdrop).map((r) => r.backdrop), plain: result.reducedMotion.filter((r) => r.preference) },
				contrastPairs: Object.fromEntries(Object.entries(result.contrastPairs).map(([t, ps]) => [t, { fail: ps.filter((p) => p.pass === false).map((p) => `${p.fg}/${p.bg} ${p.ratio}`), min: Math.min(...ps.filter((p) => p.kind === "text").map((p) => p.ratio)) }])),
				contrastScan: { checked: result.contrastScan.checked, minRatio: result.contrastScan.minRatio, failures: result.contrastScan.failures.slice(0, 12), failureCount: result.contrastScan.failures.length },
				targets: result.targets.slice(0, 6),
				unlabeled: result.unlabeled.slice(0, 4),
				focus: result.focus,
				external: result.external,
				errors: result.errors,
			},
			null,
			1,
		),
	);
}
main();
