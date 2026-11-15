// Result writer: one results.jsonl per oracle run, artifacts with SHA-256, and a summary table.
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { redactText, redactValue } from "../redact.ts";
import type { Artifact, CheckRecord, ResultLine, Status } from "../types.ts";

export function sha256(data: Buffer | string): string {
	return createHash("sha256").update(data).digest("hex");
}

/** failed > blocked > not run > passed; a row with no checks is blocked. */
export function deriveStatus(checks: CheckRecord[]): Status {
	if (checks.length === 0) return "blocked";
	if (checks.some((c) => c.status === "failed")) return "failed";
	if (checks.some((c) => c.status === "blocked")) return "blocked";
	if (checks.some((c) => c.status === "not run")) return "not run";
	return "passed";
}

export class RunWriter {
	readonly resultsPath: string;

	readonly outDir: string;
	readonly runId: string;

	constructor(outDir: string, runId: string) {
		this.outDir = outDir;
		this.runId = runId;
		mkdirSync(outDir, { recursive: true });
		this.resultsPath = join(outDir, "results.jsonl");
	}

	async artifact(acceptanceId: string, name: string, content: unknown): Promise<Artifact> {
		const safe = name.replace(/[^A-Za-z0-9._-]/g, "_");
		const path = join(this.outDir, "artifacts", this.runId, acceptanceId, safe);
		mkdirSync(dirname(path), { recursive: true });
		const data = Buffer.isBuffer(content)
			? content
			: typeof content === "string"
				? Buffer.from(redactText(content), "utf8")
				: Buffer.from(`${JSON.stringify(redactValue(content), null, 2)}\n`, "utf8");
		writeFileSync(path, data);
		return { path: relative(this.outDir, path), sha256: sha256(data) };
	}

	write(line: ResultLine): void {
		const clean = redactValue(line) as ResultLine;
		appendFileSync(this.resultsPath, `${JSON.stringify(clean)}\n`);
	}
}

export function readResults(path: string): ResultLine[] {
	return readFileSync(path, "utf8")
		.split("\n")
		.filter((l) => l.trim() !== "")
		.map((l) => JSON.parse(l) as ResultLine);
}

/** Markdown summary generated from results.jsonl (the latest result per acceptance ID wins). */
export function summaryTable(lines: ResultLine[]): string {
	const latest = new Map<string, ResultLine>();
	for (const line of lines) latest.set(line.acceptanceId, line);
	const rows = [...latest.values()].sort((a, b) =>
		a.acceptanceId.localeCompare(b.acceptanceId, "en", { numeric: true }),
	);
	const counts: Record<string, number> = {};
	for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
	const out = [
		`Run ${rows[0]?.runId ?? "-"}, arm ${rows[0]?.arm ?? "-"}, commit ${rows[0]?.commit ?? "-"}`,
		"",
		`Totals: ${Object.entries(counts)
			.map(([k, v]) => `${k} ${v}`)
			.join(", ")}`,
		"",
		"| ID | Status | Checks (passed/failed/blocked/not run) | Started | Ended | Notes |",
		"| --- | --- | --- | --- | --- | --- |",
	];
	for (const r of rows) {
		const c = r.observed.checks;
		const n = (s: Status) => c.filter((x) => x.status === s).length;
		const notes = r.notes.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 160);
		out.push(
			`| ${r.acceptanceId} | ${r.status} | ${n("passed")}/${n("failed")}/${n("blocked")}/${n("not run")} | ${r.startedAt} | ${r.endedAt} | ${notes} |`,
		);
	}
	return `${out.join("\n")}\n`;
}
