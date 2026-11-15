import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runSpec } from "../faults/commands.ts";
import { canIsolateNetwork, credentialFreeEnv } from "./lib/env.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "R04",
	title: "Offline IaC validation and secret inventory",
	scope: "Local",
	expected:
		"The offline IaC validation command exits 0 without credentials or network calls; the secret inventory names an owner and source for every binding",
	requires: ["deploymentPreparation"],
	coverage: "live-arm",
	liveArmReason: "runs the arm's IaC validation and reads its secret inventory",
	async run(ctx) {
		const prep = ctx.adapter.deploymentPreparation ?? {};
		if (!prep.iacValidate) {
			ctx.blocked("offline IaC validation", "deploymentPreparation.iacValidate is not set");
		} else {
			const isolated = canIsolateNetwork();
			const spec = isolated
				? { ...prep.iacValidate, argv: ["unshare", "-rn", ...prep.iacValidate.argv] }
				: prep.iacValidate;
			const out = await runSpec(
				"iacValidate",
				spec,
				ctx.run.loaded.baseDir,
				{},
				credentialFreeEnv(),
			);
			ctx.commands.log.push(out);
			ctx.check("IaC validates offline", out.exitCode === 0, "exit 0 without credentials", {
				exitCode: out.exitCode,
				stderrTail: out.stderrTail.slice(-400),
			});
			if (isolated)
				ctx.check(
					"no network",
					out.exitCode === 0,
					"exit 0 inside a network namespace with no interfaces (unshare -rn)",
					{ networkIsolated: true },
				);
			else ctx.blocked("no network", "unshare -rn is not available on this host");
		}
		if (!prep.secretInventory) {
			ctx.blocked("secret inventory", "deploymentPreparation.secretInventory is not set");
			return;
		}
		const inventory = JSON.parse(
			readFileSync(resolve(ctx.run.loaded.baseDir, prep.secretInventory), "utf8"),
		) as {
			bindings?: { name?: string; owner?: string; source?: string; classification?: string }[];
		};
		const bindings = inventory.bindings ?? [];
		const incomplete = bindings.filter((b) => !b.name || !b.owner || !b.source);
		ctx.check(
			"every binding has an owner and source",
			bindings.length > 0 && incomplete.length === 0,
			"name, owner and source on every binding",
			{ bindings: bindings.length, incomplete: incomplete.map((b) => b.name ?? "?") },
		);
	},
});
