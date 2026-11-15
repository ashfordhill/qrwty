#!/usr/bin/env node
// Neutral oracle CLI. Run from the arm's own copy of the pack:
//   node src/cli.ts validate-adapter <oracle-adapter.json>
//   node src/cli.ts list
//   node src/cli.ts run --adapter <file> --out <evidence dir> [--rows A09,A24 | --all]
//                       [--scope local|staging] [--no-reset]
//   node src/cli.ts fixtures --adapter <file>        (Stripe and Web Risk fixtures until Ctrl-C)
//   node src/cli.ts summary <results.jsonl>
// Browser rows always use the pack's frozen name list (FROZEN_UI_NAMES_PATH in runner.ts).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { loadAdapter } from "./adapter.ts";
import { readResults, summaryTable } from "./observe/results.ts";
import { ALL_ROWS, selectRows } from "./rows/index.ts";
import { runRows, startFixtures } from "./runner.ts";

async function main(argv: string[]): Promise<number> {
	const [command, ...rest] = argv;
	const { values, positionals } = parseArgs({
		args: rest,
		allowPositionals: true,
		options: {
			adapter: { type: "string" },
			out: { type: "string" },
			rows: { type: "string" },
			all: { type: "boolean" },
			scope: { type: "string", default: "local" },
			"ui-names": { type: "string" },
			"no-reset": { type: "boolean" },
		},
	});
	if (values["ui-names"] !== undefined)
		throw new Error(
			"--ui-names was removed in pack v1.5: browser rows always use the pack's frozen name list, files/docs/design/accessible-names.json",
		);
	switch (command) {
		case "validate-adapter": {
			const loaded = loadAdapter(positionals[0] ?? values.adapter ?? "oracle-adapter.json");
			console.log(
				JSON.stringify({ ok: true, arm: loaded.adapter.arm, commit: loaded.adapter.commit }),
			);
			return 0;
		}
		case "list": {
			for (const row of ALL_ROWS) {
				console.log(`${row.id}\t${row.coverage}\t${row.scope}\t${row.title}`);
			}
			return 0;
		}
		case "summary": {
			const path = positionals[0];
			if (!path) throw new Error("summary needs a results.jsonl path");
			const table = summaryTable(readResults(path));
			writeFileSync(join(dirname(path), "summary.md"), table);
			process.stdout.write(table);
			return 0;
		}
		case "fixtures": {
			if (!values.adapter) throw new Error("fixtures needs --adapter");
			const fixtures = await startFixtures(loadAdapter(values.adapter));
			console.log(
				JSON.stringify({
					stripe: fixtures.stripe?.url ?? null,
					webRisk: fixtures.webRisk?.url ?? null,
				}),
			);
			await new Promise<void>((resolve) => process.once("SIGINT", () => resolve()));
			await fixtures.stripe?.close();
			await fixtures.webRisk?.close();
			return 0;
		}
		case "run": {
			if (!values.adapter || !values.out) throw new Error("run needs --adapter and --out");
			if (values.scope !== "local" && values.scope !== "staging")
				throw new Error("--scope is local or staging");
			const rows = values.all || !values.rows ? ALL_ROWS : selectRows(values.rows.split(","));
			const lines = await runRows({
				loaded: loadAdapter(values.adapter),
				rows,
				outDir: values.out,
				scope: values.scope,
				command: `node src/cli.ts ${argv.join(" ")}`,
				uiNamesPath: values["ui-names"],
				resetBetweenRows: !values["no-reset"],
				log: (line) => console.error(line),
			});
			const table = summaryTable(lines);
			writeFileSync(join(values.out, "summary.md"), table);
			process.stdout.write(table);
			return lines.every((l) => l.status === "passed") ? 0 : 1;
		}
		default:
			console.error("usage: node src/cli.ts <validate-adapter|list|run|fixtures|summary> ...");
			return 2;
	}
}

main(process.argv.slice(2)).then(
	(code) => process.exit(code),
	(error) => {
		console.error((error as Error).message);
		process.exit(2);
	},
);
