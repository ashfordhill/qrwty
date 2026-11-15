import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineRow } from "./lib/row.ts";

const COMPONENTS = ["pubsub-emulator", "stripe-fixture", "web-risk-fixture", "local-issuer"];

export default defineRow({
	id: "R02",
	title: "Real adapters exercised locally; limitations listed",
	scope: "Local",
	expected:
		"Production clients run against the local real stores and emulator; signed fixtures exercise the real validation code; each emulator or fixture limitation is listed",
	requires: ["deploymentPreparation"],
	coverage: "live-arm",
	liveArmReason:
		"reads the arm's limitation inventory; the behaviour itself is exercised by the A and F rows",
	async run(ctx) {
		const path = ctx.adapter.deploymentPreparation?.limitations;
		if (!path) {
			ctx.blocked("limitations inventory", "deploymentPreparation.limitations is not set");
			return;
		}
		const file = resolve(ctx.run.loaded.baseDir, path);
		const data = JSON.parse(readFileSync(file, "utf8")) as {
			items?: { component?: string; limitation?: string; productionClient?: string }[];
		};
		const items = data.items ?? [];
		await ctx.artifact("limitations.json", data);
		const covered = new Set(items.filter((i) => i.limitation?.trim()).map((i) => i.component));
		const missing = COMPONENTS.filter((c) => !covered.has(c));
		ctx.check(
			"each emulator and fixture listed",
			missing.length === 0,
			`a limitation for ${COMPONENTS.join(", ")}`,
			{ missing, items: items.length },
		);
		ctx.check(
			"production clients named",
			items.every((i) => !!i.productionClient),
			"each item names the production client it exercises",
			items.filter((i) => !i.productionClient).map((i) => i.component),
		);
		ctx.note(
			"that production clients really run against local stores is shown by the A and F rows, not by this file",
		);
	},
});
