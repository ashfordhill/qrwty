import { credentialFreeEnv } from "./lib/env.ts";
import { profileCheck } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

const REQUIRED = [
	"emulator-endpoint",
	"fake-provider",
	"development-secret",
	"tls-verification-disabled",
	"missing-required-value",
	"test-hook",
];

export default defineRow({
	id: "R01",
	title: "Production profile refuses development settings; ordinary checks need no credentials",
	scope: "Local",
	expected:
		"Start each process with the production profile and, in turn, an emulator endpoint, a fake provider, a development secret, disabled TLS verification, a missing required value and each test hook: every start is refused with a named reason. Ordinary build and tests run with no cloud credentials in the environment",
	requires: ["productionProfileCheck", "command:ordinaryBuildAndTest"],
	coverage: "live-arm",
	liveArmReason: "runs the arm's own production configuration validator and build",
	async run(ctx) {
		const spec = ctx.adapter.productionProfileCheck;
		if (!spec) return;
		const categories = new Set(spec.settings.map((s) => s.category));
		const absent = REQUIRED.filter((c) => !categories.has(c));
		ctx.check(
			"every category declared",
			absent.length === 0,
			`at least one setting per category: ${REQUIRED.join(", ")}`,
			{ absent },
		);
		const accepted: unknown[] = [];
		for (const process of spec.processes) {
			for (const setting of spec.settings) {
				const out = await profileCheck(ctx, process, setting);
				if (!out.refused) accepted.push(out);
			}
		}
		ctx.check(
			"every forbidden start refused",
			accepted.length === 0,
			`${spec.processes.length * spec.settings.length} starts refused with a named reason`,
			accepted,
		);
		const ordinary = await ctx.commands.tryRun("ordinaryBuildAndTest", {}, credentialFreeEnv());
		ctx.check(
			"ordinary build and tests without credentials",
			ordinary.exitCode === 0,
			"exit 0 with cloud credentials removed and an empty HOME",
			{
				exitCode: ordinary.exitCode,
				durationMs: ordinary.durationMs,
				stderrTail: ordinary.stderrTail.slice(-400),
			},
		);
	},
});
