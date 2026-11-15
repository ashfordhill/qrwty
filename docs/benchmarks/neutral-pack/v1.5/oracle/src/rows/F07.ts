import { allReplicas } from "../adapter.ts";
import A02 from "./A02.ts";
import A05 from "./A05.ts";
import A07 from "./A07.ts";
import A22 from "./A22.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F07",
	title: "A02, A05, A07 and A22 races with each replica in its own container",
	scope: "Local",
	expected: "All invariants hold with no shared process memory",
	requires: ["publicEntry", "identity", "stripe", "command:restart"],
	coverage: "live-arm",
	liveArmReason: "needs replicas in separate containers; composes A02, A05, A07 and A22",
	params: { ...A07.params, ...A22.params },
	async run(ctx) {
		const replicas = allReplicas(ctx.adapter);
		const containers = replicas.map((r) => r.container ?? "");
		const separate =
			containers.every((c) => c.length > 0) && new Set(containers).size === containers.length;
		ctx.check(
			"one container per replica",
			separate,
			"every replica names a distinct container",
			replicas.map((r) => ({ replica: r.name, container: r.container ?? null })),
		);
		for (const row of [A02, A05, A07, A22]) {
			const before = ctx.checks.length;
			if (ctx.commands.has("reset")) await ctx.commands.run("reset");
			ctx.stripe().resetState();
			await row.run(ctx);
			for (const check of ctx.checks.slice(before)) check.name = `${row.id}: ${check.name}`;
		}
	},
});
