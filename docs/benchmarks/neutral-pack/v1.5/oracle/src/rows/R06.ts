import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "R06",
	title: "Activation backlog and honest status",
	scope: "Local",
	expected:
		"The activation backlog lists each live check still not run, with resources, prices and teardown",
	requires: ["deploymentPreparation"],
	coverage: "live-arm",
	liveArmReason: "reads the arm's activation backlog",
	async run(ctx) {
		const path = ctx.adapter.deploymentPreparation?.activationBacklog;
		if (!path) {
			ctx.blocked("activation backlog", "deploymentPreparation.activationBacklog is not set");
			return;
		}
		const data = JSON.parse(readFileSync(resolve(ctx.run.loaded.baseDir, path), "utf8")) as {
			checks?: {
				id?: string;
				description?: string;
				resources?: unknown[];
				price?: unknown;
				teardown?: string;
				status?: string;
			}[];
		};
		const checks = data.checks ?? [];
		await ctx.artifact("activation-backlog.json", data);
		const incomplete = checks.filter(
			(c) =>
				!c.id ||
				!c.description ||
				!Array.isArray(c.resources) ||
				c.resources.length === 0 ||
				c.price === undefined ||
				c.price === null ||
				!c.teardown,
		);
		ctx.check(
			"backlog entries complete",
			checks.length > 0 && incomplete.length === 0,
			"id, description, resources, price and teardown on every entry",
			{ checks: checks.length, incomplete: incomplete.map((c) => c.id ?? "?") },
		);
		const claimed = checks.filter((c) => c.status !== "not run");
		ctx.check(
			"live checks not claimed",
			claimed.length === 0,
			'every live check has status "not run"',
			claimed.map((c) => ({ id: c.id, status: c.status })),
		);
		const required = ["D01", "D02", "D03", "D09", "D10"];
		const listed = new Set(checks.map((c) => c.id));
		ctx.check(
			"staging rows listed",
			required.every((id) => listed.has(id)),
			`backlog lists ${required.join(", ")}`,
			required.filter((id) => !listed.has(id)),
		);
	},
});
