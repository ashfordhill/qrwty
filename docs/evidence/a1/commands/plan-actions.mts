// A1: print the per-file actions update:v2 would take (the CLI prints only counts and lists).
// Reads the same inputs updateDirectory reads; writes nothing.
//   tsx plan-actions.ts <jeeves dir> <design.json> <export dir>
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [jeeves, design, dir] = process.argv.slice(2);
const { loadLocalV2Registry } = await import(join(jeeves, "jeeves-generator/templates/local-v2/index.ts"));
const { assembleV2 } = await import(join(jeeves, "jeeves-generator/src/v2/assemble.ts"));
const { planUpdate } = await import(join(jeeves, "jeeves-generator/src/update.ts"));
const bundle = assembleV2({ designJson: readFileSync(design, "utf8") }, loadLocalV2Registry());
const next = bundle.manifest.files.map(({ path, sha256, ownership }: any) => ({ path, sha256, ownership }));
const previous = JSON.parse(readFileSync(join(dir, ".jeeves/manifest.json"), "utf8")).files;
const disk = new Map<string, string>();
for (const f of [...next, ...previous]) {
  const p = join(dir, f.path);
  if (existsSync(p)) disk.set(f.path, createHash("sha256").update(readFileSync(p)).digest("hex"));
}
const plan = planUpdate({ next, previous, disk, overrides: [], pendingShadows: [] });
const own = new Map(next.map((f: any) => [f.path, f.ownership]));
for (const a of plan.actions) console.log(`${a.action}\t${own.get(a.path) ?? previous.find((f: any) => f.path === a.path)?.ownership}\t${a.path}`);
