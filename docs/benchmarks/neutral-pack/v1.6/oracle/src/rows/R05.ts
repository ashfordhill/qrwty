import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runSpec } from "../faults/commands.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "R05",
	title: "Fresh-checkout release rehearsal; identical artifacts across configurations",
	scope: "Local",
	expected:
		"From a fresh clone, the documented build, start, migrate, deploy-rehearsal and rollback commands work; image digests and UI hashes are identical across test configurations; no source edit is needed to change environment",
	requires: ["deploymentPreparation"],
	coverage: "live-arm",
	liveArmReason: "runs the arm's release rehearsal from a fresh clone",
	async run(ctx) {
		const prep = ctx.adapter.deploymentPreparation ?? {};
		if (!prep.freshCheckout) {
			ctx.blocked("fresh-checkout commands", "deploymentPreparation.freshCheckout is not set");
		} else {
			for (const step of ["build", "start", "migrate", "deployRehearsal", "rollback"] as const) {
				const out = await runSpec(step, prep.freshCheckout[step], ctx.run.loaded.baseDir);
				ctx.commands.log.push(out);
				const json = (out.json ?? {}) as { sourceEdits?: number };
				ctx.check(`${step} works`, out.exitCode === 0, "exit 0", {
					exitCode: out.exitCode,
					durationMs: out.durationMs,
					stderrTail: out.stderrTail.slice(-300),
				});
				if (step === "deployRehearsal") {
					ctx.check(
						"no source edit to change environment",
						json.sourceEdits === 0,
						"deployRehearsal reports sourceEdits: 0 (a clean working tree after switching configuration)",
						json,
					);
				}
			}
		}
		if (!prep.imageDigestsByConfiguration) {
			ctx.blocked(
				"identical artifacts",
				"deploymentPreparation.imageDigestsByConfiguration is not set",
			);
			return;
		}
		const data = JSON.parse(
			readFileSync(resolve(ctx.run.loaded.baseDir, prep.imageDigestsByConfiguration), "utf8"),
		) as {
			configurations?: Record<
				string,
				{ images?: Record<string, string>; uiHashes?: Record<string, string> }
			>;
		};
		const configs = Object.entries(data.configurations ?? {});
		const canonical = (v: unknown) =>
			JSON.stringify(Object.entries((v ?? {}) as Record<string, string>).sort());
		const imagesSame =
			configs.length >= 2 && new Set(configs.map(([, c]) => canonical(c.images))).size === 1;
		const uiSame =
			configs.length >= 2 && new Set(configs.map(([, c]) => canonical(c.uiHashes))).size === 1;
		ctx.check(
			"image digests identical",
			imagesSame,
			"the same digests in every test configuration (at least two)",
			configs.map(([name]) => name),
		);
		ctx.check(
			"UI hashes identical",
			uiSame,
			"the same UI hashes in every test configuration",
			configs.map(([name]) => name),
		);
		const adapterImages = canonical(ctx.adapter.images);
		ctx.check(
			"adapter images match",
			configs.length > 0 && canonical(configs[0][1].images) === adapterImages,
			"oracle-adapter.json images equal the rehearsed digests",
			null,
		);
	},
});
