import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F08",
	title: "Old and new versions side by side",
	scope: "Local",
	expected:
		"Expand/contract migrations and the versioned event codec keep both working, or the rollback is explicitly blocked before apply. Not run until a second version exists",
	requires: ["publicEntry"],
	coverage: "live-arm",
	liveArmReason: "needs two released versions of the arm",
	async run(ctx) {
		const previous = ctx.adapter.versions?.previous;
		if (!previous) {
			ctx.notRun(
				"second version",
				"not run until a second version of the arm exists (acceptance-oracle.md §4)",
			);
			return;
		}
		ctx.blocked(
			"mixed-version procedure",
			`previous version ${previous} is declared; the side-by-side procedure is frozen by a later pack version when a second release exists`,
		);
	},
});
