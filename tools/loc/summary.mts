// Summarize one source-loc-v2 report for arm A (pack loc-method): G0, R, C, D, B and both
// identities; the baseline's split into generated scaffolding and stub bodies (by the baseline
// manifest's ownership); open work at the final commit (unwritten stubs, hooks files, generated
// source no process reaches); UI; and support counts for the final commit's app/ by category.
// Everything is read from Git objects at the report's two commits. JS/TS lines use the pinned
// parser's `codeLines` (source-loc-v2); other files count nonblank physical lines, comments kept.
//
//   tsx summary.mts <runner dir> <source-loc-v2.json> <summary.json>
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";

const [runner, reportFile, outFile] = process.argv.slice(2);
if (!runner || !reportFile || !outFile) throw new Error("usage: summary.mts <runner> <report> <out>");
const { codeLines } = await import(join(runner, "jeeves-generator/src/source-loc.ts"));
const report = JSON.parse(readFileSync(reportFile, "utf8"));
const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const app: string = report.app;
const files = (commit: string) => {
  const rows = new Map<string, string>();
  for (const entry of git("ls-tree", "-rz", "--full-tree", commit, "--", app).split("\0")) {
    if (!entry) continue;
    const tab = entry.indexOf("\t");
    rows.set(entry.slice(tab + 1).slice(app.length + 1), entry.slice(0, tab).split(" ")[2] ?? "");
  }
  return rows;
};
const blob = (id: string) => git("cat-file", "blob", id);
const manifest = JSON.parse(git("show", `${report.baselineCommit}:${app}/.jeeves/manifest.json`));
const ownership = new Map<string, string>(
  manifest.files.map((f: { path: string; ownership: string }) => [f.path, f.ownership]),
);
const finalFiles = files(report.finalCommit);

// Backend totals and identities (loc-method Definitions).
const t = report.totals;
const backend = {
  G0: t.baselineLoc,
  R: t.retainedTemplateLoc,
  C: t.postTemplateLoc,
  D: t.removedOrReplacedTemplateLoc,
  B: t.finalLoc,
  templateSharePercent: t.templatePercent,
  identities: {
    "R + C = B": t.retainedTemplateLoc + t.postTemplateLoc === t.finalLoc,
    "G0 - R = D": t.baselineLoc - t.retainedTemplateLoc === t.removedOrReplacedTemplateLoc,
  },
  includedFiles: t.includedFiles,
};

// The baseline's eligible lines by manifest ownership.
type Row = { path: string; baselineLoc: number; finalLoc: number; finalSha256: string | null };
const baselineRows = (report.included as (Row & { baselineSha256: string | null })[]).filter(
  (r) => r.baselineSha256 !== null,
);
const group = (rows: Row[]) => ({
  files: rows.length,
  loc: rows.reduce((sum, r) => sum + r.baselineLoc, 0),
});
const byDir = (rows: Row[]) =>
  Object.fromEntries(
    [...new Set(rows.map((r) => r.path.split("/").slice(0, 2).join("/")))]
      .sort()
      .map((dir) => [dir, group(rows.filter((r) => r.path.startsWith(`${dir}/`)))]),
  );
const scaffold = baselineRows.filter((r) => ownership.get(r.path) === "generated-scaffold");
const extension = baselineRows.filter((r) => ownership.get(r.path) === "generated-extension");
const other = baselineRows.filter(
  (r) => !["generated-scaffold", "generated-extension"].includes(ownership.get(r.path) ?? ""),
);
const isStubBody = (path: string) => /^src\/modules\/[^/]+\/[^/]+\.ts$/.test(path) && !path.endsWith(".slots.ts");
const baselineSplit = {
  scaffolding: { ...group(scaffold), byDirectory: byDir(scaffold),
    slotsFiles: group(scaffold.filter((r) => r.path.endsWith(".slots.ts"))) },
  stubBodies: { ...group(extension), allAreStubBodies: extension.every((r) => isStubBody(r.path)),
    paths: extension.map((r) => r.path) },
  unclassified: group(other),
};

// Open work at the final commit.
const expected = new Map<string, string>(
  manifest.files.map((f: { path: string; sha256: string }) => [f.path, f.sha256]),
);
const finalIncluded = report.included as Row[];
const stubs = extension.map((r) => {
  const now = finalIncluded.find((f) => f.path === r.path);
  return { path: r.path, unwritten: now?.finalSha256 === expected.get(r.path) };
});
const hooksFiles = [...finalFiles.keys()].filter((p) => /\.hooks\.[cm]?[jt]sx?$/.test(p)).sort();
const finalReport = finalFiles.has(".jeeves/report.json")
  ? JSON.parse(blob(finalFiles.get(".jeeves/report.json") ?? ""))
  : null;
const reportHooks = (finalReport?.processes?.tiles ?? []).flatMap(
  (tile: { hooks?: unknown[] }) => tile.hooks ?? [],
);
// Generated source no process reaches: relative imports from every src/processes/*.ts.
const included = new Set(finalIncluded.filter((r) => r.finalSha256).map((r) => r.path));
const reached = new Set<string>();
const queue = [...included].filter((p) => p.startsWith("src/processes/"));
while (queue.length) {
  const path = queue.pop() as string;
  if (reached.has(path)) continue;
  reached.add(path);
  const text = codeLines(path, blob(finalFiles.get(path) ?? "")).join("\n");
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    const target = posix.normalize(posix.join(posix.dirname(path), m[1] as string));
    if (included.has(target)) queue.push(target);
  }
}
const unreached = [...included].filter((p) => !reached.has(p)).sort();
const openWork = {
  stubBodies: { total: stubs.length, unwritten: stubs.filter((s) => s.unwritten).length,
    unwrittenPaths: stubs.filter((s) => s.unwritten).map((s) => s.path) },
  hooks: { files: hooksFiles, reportHooks },
  unreachedIncludedSource: unreached.map((p) => ({
    path: p, loc: finalIncluded.find((r) => r.path === p)?.finalLoc ?? 0 })),
};

// UI and support counts for the final commit's app/.
const js = /\.(?:[cm]?[jt]sx?)$/;
const lines = (path: string, text: string) =>
  js.test(path) ? codeLines(path, text).length : text.split(/\r\n|\r|\n/).filter((l) => l.trim()).length;
const configuration = new Set<string>(report.scope.configurationPaths ?? []);
const category = (path: string, reason: string) => {
  if (reason === "ui-source") return "ui";
  if (reason === "test-or-fixture") return "tests";
  if (path.startsWith(".jeeves/") || path.startsWith("diagnostics/")) return "generator-metadata";
  if (configuration.has(path) || reason === "configuration-or-build") return "configuration-source";
  if (path.endsWith(".sql")) return ownership.get(path) === "generated-extension" ? "product-sql" : "generated-sql";
  if (path.startsWith("scripts/")) return "scripts";
  if (/^(compose[^/]*\.ya?ml|Dockerfile|\.dockerignore|ffmpeg-os\.lock)$/.test(path) || path.startsWith("infra/"))
    return "deployment-config";
  if (/^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig[^/]*\.json|\.gitignore)$/.test(path))
    return "package-and-build-config";
  if (path.endsWith(".md")) return "docs";
  return "other";
};
const support: Record<string, { files: number; lines: number; byExtension: Record<string, number> }> = {};
for (const row of report.excluded as { path: string; reason: string }[]) {
  const id = finalFiles.get(row.path);
  if (!id) continue;
  const name = category(row.path, row.reason);
  const count = lines(row.path, blob(id));
  const ext = posix.extname(row.path) || posix.basename(row.path);
  support[name] ??= { files: 0, lines: 0, byExtension: {} };
  const s = support[name] as { files: number; lines: number; byExtension: Record<string, number> };
  s.files += 1;
  s.lines += count;
  s.byExtension[ext] = (s.byExtension[ext] ?? 0) + count;
}
const ui = support.ui ?? { files: 0, lines: 0, byExtension: {} };
delete support.ui;
const webTree = git("ls-tree", "--name-only", report.finalCommit, "--", "web").trim();

const summary = {
  method: report.method,
  parser: report.parser,
  baselineCommit: report.baselineCommit,
  finalCommit: report.finalCommit,
  baselineManifestSha256: report.baselineManifestSha256,
  scopeSha256: report.scopeSha256,
  backend,
  baselineSplit,
  openWork,
  ui: { ...ui, webDirectoryAtFinal: webTree ? "present (count with ui-loc-v1)" : "absent" },
  support: { scope: `${app}/ at the final commit; source-loc-v2 exclusions by category`, categories: support },
};
writeFileSync(outFile, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ backend, scaffolding: baselineSplit.scaffolding.loc,
  stubBodies: baselineSplit.stubBodies.loc, unwrittenStubs: openWork.stubBodies.unwritten,
  hooks: hooksFiles.length, unreached: unreached.length }));
