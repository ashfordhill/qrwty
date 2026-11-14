import { byName } from "../browser/driver.ts";
import { defineRow } from "./lib/row.ts";
import { matrix, openCombo, overflow, uiReady } from "./lib/ui.ts";

const KEYS = ["create.destination", "create.submit"];
const EXTRA = [
	{ name: "w320", width: 320, height: 640, isMobile: true },
	{ name: "w768", width: 768, height: 1024 },
	{ name: "landscape", width: 800, height: 360, isMobile: true },
	{ name: "zoom200", width: 720, height: 450 },
	{ name: "wide", width: 2560, height: 1080 },
];

export default defineRow({
	id: "U04",
	title: "Responsive, light/dark, reduced motion and solid fallback",
	scope: "Each skin × light/dark × desktop/mobile, plus the brief's extra widths",
	expected: "Required widths, zoom and landscape have no lost content or inaccessible controls",
	requires: ["publicEntry", "browser"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's UI and the frozen accessible-name list (Q11 amendment)",
	async run(ctx) {
		const names = uiReady(ctx, KEYS);
		if (!names) return;
		const combos = matrix(ctx);
		for (const skin of ctx.adapter.ui?.skins ?? []) {
			for (const viewport of EXTRA)
				combos.push({ skin, theme: "light", viewport, label: `${skin}/light/${viewport.name}` });
		}
		for (const combo of combos) {
			for (const motion of ["no-preference", "reduce"] as const) {
				const { page, context } = await openCombo(ctx, combo, "/", { reducedMotion: motion });
				if (motion === "reduce") {
					const cdp = await context.newCDPSession(page);
					await cdp.send("Emulation.setEmulatedMedia", {
						features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
					});
				}
				const label = `${combo.label}${motion === "reduce" ? "/reduced" : ""}`;
				const extra = await overflow(page);
				ctx.check(
					`${label}: no horizontal scroll`,
					extra <= 1,
					"content fits the viewport width",
					extra,
				);
				const unreachable: string[] = [];
				for (const key of KEYS) {
					const box = await byName(page, names, key).first().boundingBox();
					if (!box || box.width < 1 || box.x < 0 || box.x + box.width > combo.viewport.width + 1)
						unreachable.push(key);
					else if (box.height < 24 || box.width < 24)
						unreachable.push(`${key} (target under 24 px)`);
				}
				ctx.check(
					`${label}: controls reachable`,
					unreachable.length === 0,
					"every core control inside the viewport width with a ≥ 24 px target",
					unreachable,
				);
				if (motion === "reduce") {
					const animated = await page.evaluate(
						() =>
							[...document.querySelectorAll("*")].filter((el) => {
								const s = getComputedStyle(el);
								return (
									Number.parseFloat(s.animationDuration) > 0.01 &&
									s.animationIterationCount === "infinite"
								);
							}).length,
					);
					ctx.check(
						`${label}: reduced motion respected`,
						animated === 0,
						"no infinite animation with prefers-reduced-motion",
						animated,
					);
				}
				await ctx.artifact(
					`${label.replace(/\//g, "-")}.png`,
					await page.screenshot({ fullPage: true }),
				);
			}
		}
	},
});
