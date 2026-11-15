// S02: count one repository's files at one commit, from Git objects only, with source-loc-v2's
// pinned parser (`codeLines`) and eligibility (`exclusionReason`) from the frozen runner copy.
// JS/TS lines: nonblank physical lines after parsed comments are removed. Other files: nonblank
// physical lines, comments kept (as tools/loc/summary.mts counts support files).
//
//   tsx count-tree.mts <runner dir> <repo> <commit> <rules: a|b> > rows.json
import { execFileSync } from "node:child_process";
import { join, posix } from "node:path";

const [runner, repo, commit, rules] = process.argv.slice(2);
if (!runner || !repo || !commit || !rules) throw new Error("usage: count-tree.mts <runner> <repo> <commit> <a|b>");
const { codeLines, exclusionReason } = await import(join(runner, "jeeves-generator/src/source-loc.ts"));
const git = (...args: string[]) =>
	execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const full = git("rev-parse", "--verify", `${commit}^{commit}`).trim();
const js = /\.(?:[cm]?[jt]sx?)$/;
const count = (path: string, text: string) =>
	js.test(path) ? codeLines(path, text).length : text.split(/\r\n|\r|\n/).filter((l) => l.trim()).length;

// Arm B: abuse files are the four links/ files B06 (b62b92c) added.
const abuse = new Set(["src/links/admission.ts", "src/links/moderation.ts", "src/links/reports.ts", "src/links/reputation.ts"]);
const bArea = (rel: string) => {
	const dir = rel.split("/")[1];
	if (abuse.has(rel)) return "abuse";
	if (dir === "session" || dir === "account") return "sessions-and-accounts";
	if (dir === "processes") return "process-entry-points";
	return dir ?? "other";
};

const rows = [];
for (const entry of git("ls-tree", "-rz", "--full-tree", full).split("\0")) {
	if (!entry) continue;
	const tab = entry.indexOf("\t");
	const [mode, kind, blob] = entry.slice(0, tab).split(" ");
	const path = entry.slice(tab + 1);
	if (kind !== "blob" || mode === "120000") continue;
	if (path.startsWith("docs/") || path.startsWith(".docs/")) continue;
	if (/\.(png|jpe?g|gif|webp|ico|zip|gz|woff2?)$/i.test(path)) continue;
	const text = git("cat-file", "blob", blob as string);
	const lines = count(path, text);
	let category: string;
	let area: string | null = null;
	let reason: string | null = null;
	if (path.startsWith("app/")) {
		const rel = path.slice(4);
		reason = exclusionReason(rel);
		if (rel.startsWith("src/") && reason === null) {
			category = "backend-source";
			area = rules === "b" ? bArea(rel) : rel.split("/").slice(0, 2).join("/");
		} else if (reason === "test-or-fixture" || rel.startsWith("test/")) category = "tests";
		else if (rel.endsWith(".sql")) category = "sql";
		else if (rel.startsWith("src/") && reason === "configuration-or-build") category = "configuration-source-excluded";
		else if (/^(Dockerfile|compose[^/]*\.ya?ml|\.dockerignore)$/.test(rel) || rel.startsWith("infra/") || rel.startsWith("scripts/"))
			category = "app-deployment-and-scripts";
		else category = "app-package-and-build-config";
	} else if (path.startsWith("infra/")) {
		category = "infrastructure";
		area = path.split("/").slice(0, 2).join("/");
	} else if (path.startsWith("web/")) category = "ui";
	else category = "repo-other";
	rows.push({ path, category, area, reason, ext: posix.extname(path) || posix.basename(path), lines });
}
console.log(JSON.stringify({ repo, commit: full, rows }, null, 1));
