// Q05: plan the one new revision of "QRWTY · production candidate v1" without writing anything.
// Builds the Provider edit through the studio's supported command path
// (buildSupportedAuthoringCommand, as Q01 did), applies it in memory, and lists every normal
// generation control before and after, under the studio's installed support and the frozen
// generator's (Jeeves 4e87f97), so any other newly supported choice is visible.
//
//   tsx plan-revision.mts <frozen jeeves dir> <design response json> <studio support json> <out dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [jeeves, designFile, supportFile, out] = process.argv.slice(2);
if (!jeeves || !designFile || !supportFile || !out) throw new Error("usage: see header");
const spec = await import(join(jeeves, "jeeves/packages/spec/src/index.ts"));
const generator = await import(join(jeeves, "jeeves-generator/src/index.ts"));
mkdirSync(out, { recursive: true });

const response = JSON.parse(readFileSync(designFile, "utf8"));
const design = spec.parseStoredDesign(response.design);
const studioSupport = JSON.parse(readFileSync(supportFile, "utf8"));
const frozenSupport = generator.loadLocalV2Registry().installed;
const sha = (text: string) => generator.sha256(new TextEncoder().encode(text));

const controls = (d: unknown, installed: unknown) =>
  spec.normalGenerationControls(d, installed).map((c: Record<string, unknown>) => ({
    path: (c.sourcePaths as unknown[][])[0],
    value: c.value,
    supported: c.supported,
    process: c.process ?? null,
  }));

const element = design.architecture.studio.elements.find(
  (row: { element: string }) => row.element === "click-events",
);
const command = {
  type: "edit",
  element: "click-events",
  settings: { ...element.settings, provider: "google-cloud" },
};
const batchStudio = spec.buildSupportedAuthoringCommand(design, command, studioSupport);
const batchFrozen = spec.buildSupportedAuthoringCommand(design, command, frozenSupport);
const applied = spec.applyOperations(design, batchStudio.ops, { baseRevision: design.revision });
if (!applied.ok) throw new Error(JSON.stringify(applied.errors));
const next = applied.design;

const record = {
  base: { revision: design.revision, canonicalSha256: sha(generator.canonicalJson(design)) },
  supportSha256: {
    studio: sha(generator.canonicalJson(studioSupport)),
    frozen: sha(generator.canonicalJson(frozenSupport)),
    equal: generator.canonicalJson(studioSupport) === generator.canonicalJson(frozenSupport),
  },
  command,
  batchesEqual: generator.canonicalJson(batchStudio) === generator.canonicalJson(batchFrozen),
  batch: batchStudio,
  inMemory: {
    revision: next.revision,
    canonicalSha256: sha(generator.canonicalJson(next)),
    errors: applied.findings?.filter((f: { severity?: string }) => f.severity === "error") ?? [],
    exportBlockersStudio: spec.generationExportBlockers(next, studioSupport),
    exportBlockersFrozen: spec.generationExportBlockers(next, frozenSupport),
  },
  controls: {
    before: { studio: controls(design, studioSupport), frozen: controls(design, frozenSupport) },
    after: { studio: controls(next, studioSupport), frozen: controls(next, frozenSupport) },
  },
};
writeFileSync(join(out, "plan-revision.json"), `${JSON.stringify(record, null, 2)}\n`);
writeFileSync(join(out, "design-next.in-memory.canonical.json"), generator.canonicalJson(next));
console.log(
  JSON.stringify({
    base: record.base,
    supportEqual: record.supportSha256.equal,
    batchesEqual: record.batchesEqual,
    ops: batchStudio.ops.length,
    inMemory: { revision: next.revision, sha: record.inMemory.canonicalSha256 },
    blockers: [
      record.inMemory.exportBlockersStudio.length,
      record.inMemory.exportBlockersFrozen.length,
    ],
    controls: Object.fromEntries(
      Object.entries(record.controls).map(([k, v]) => [
        k,
        { studio: v.studio.length, frozen: v.frozen.length },
      ]),
    ),
  }),
);
