import { byName } from "../browser/driver.ts";
import { defineRow } from "./lib/row.ts";
import { matrix, openCombo, uiReady } from "./lib/ui.ts";

const KEYS = ["create.destination", "create.submit", "nav.library"];

export default defineRow({
	id: "U03",
	title: "Keyboard and screen reader",
	scope: "One skin × light/dark × desktop/mobile",
	expected: "Labels, focus, errors, dialogs and route changes usable; no focus traps",
	requires: ["publicEntry", "browser"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's UI and the frozen accessible-name list (Q11 amendment)",
	params: { tabStops: 40 },
	async run(ctx) {
		const names = uiReady(ctx, KEYS);
		if (!names) return;
		for (const combo of matrix(ctx)) {
			const { page } = await openCombo(ctx, combo);
			const unlabeled = await page.evaluate(() => {
				const nameOf = (el: Element) =>
					el.getAttribute("aria-label") ||
					(el.getAttribute("aria-labelledby") ?? "")
						.split(/\s+/)
						.map((id) => document.getElementById(id)?.textContent ?? "")
						.join(" ")
						.trim() ||
					((el as HTMLInputElement).labels?.[0]?.textContent ?? "").trim() ||
					(el.textContent ?? "").trim() ||
					el.getAttribute("title") ||
					"";
				return [
					...document.querySelectorAll(
						"a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link]",
					),
				]
					.filter((el) => !nameOf(el))
					.map((el) => el.outerHTML.slice(0, 120));
			});
			ctx.check(
				`${combo.label}: every control labelled`,
				unlabeled.length === 0,
				"an accessible name on every interactive element",
				unlabeled.slice(0, 5),
			);
			const stops: { tag: string; focusVisible: boolean }[] = [];
			for (let i = 0; i < ctx.params.tabStops; i++) {
				await page.keyboard.press("Tab");
				stops.push(
					await page.evaluate(() => {
						const el = document.activeElement as HTMLElement | null;
						if (!el || el === document.body) return { tag: "body", focusVisible: true };
						const style = getComputedStyle(el);
						const visible =
							(style.outlineStyle !== "none" && style.outlineWidth !== "0px") ||
							style.boxShadow !== "none";
						return {
							tag: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}`,
							focusVisible: visible,
						};
					}),
				);
			}
			const distinct = new Set(stops.map((s) => s.tag)).size;
			ctx.check(
				`${combo.label}: no focus trap`,
				distinct >= 3,
				"Tab moves through at least three distinct stops",
				{ distinct, sample: stops.slice(0, 8) },
			);
			ctx.check(
				`${combo.label}: visible focus`,
				stops.every((s) => s.focusVisible),
				"a visible focus indicator at every stop",
				stops.filter((s) => !s.focusVisible).slice(0, 5),
			);
			const field = byName(page, names, "create.destination").first();
			await field.focus();
			await field.fill("not a url");
			await page.keyboard.press("Enter");
			const announced = await page
				.locator('[role="alert"], [aria-live="assertive"], [aria-live="polite"]')
				.filter({ hasText: /\S/ })
				.count();
			ctx.check(
				`${combo.label}: errors announced`,
				announced > 0,
				"an alert or live region with the validation error",
				announced,
			);
			const titleBefore = await page.title();
			await byName(page, names, "nav.library").first().focus();
			await page.keyboard.press("Enter");
			await page.waitForTimeout(1_500);
			const moved = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? "");
			const titleAfter = await page.title();
			ctx.check(
				`${combo.label}: route change announced`,
				titleAfter !== titleBefore || ["h1", "main"].includes(moved),
				"the title changes or focus moves to the new view's heading/main",
				{ titleBefore, titleAfter, focus: moved },
			);
		}
	},
});
