// Q03: build a minimal probe design through the studio's supported command path, in memory.
// Writes canonical JSON. No Jeeves file or project is written.
import { writeFileSync } from "node:fs";
import {
  applyOperations,
  buildSupportedAuthoringCommand,
  emptyDesign,
  generationExportBlockers,
} from "/home/ash/github/jeeves/jeeves/packages/spec/src/index.ts";
import { canonicalJson } from "/home/ash/github/jeeves/jeeves-generator/src/index.ts";
import { loadLocalV2Registry } from "/home/ash/github/jeeves/jeeves-generator/templates/local-v2/index.ts";

const out = process.argv[2];
if (!out) throw new Error("usage: build-fixture.mts <out.json>");
const installed = loadLocalV2Registry().installed;
let design = emptyDesign();
const log: unknown[] = [];
function run(command: Record<string, unknown>) {
  let batch;
  try {
    batch = buildSupportedAuthoringCommand(design, command as never, installed);
  } catch (error) {
    log.push({ command, refused: (error as Error).message });
    return false;
  }
  const result = applyOperations(design, batch.ops, { baseRevision: batch.baseRevision });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  design = result.design;
  log.push({ command, revision: design.revision });
  return true;
}
const tile = (from: string, id: string, name: string, kind: string) =>
  run({ type: "addTile", from: { tile: from }, side: "after", tile: { id, name, kind }, linkId: `${from}-${id}` });
run({ type: "addAction", lane: "download", name: "Call", system: { name: "Q03 probe", description: "Disposable Q03 capability probe." } });
run({ type: "addTile", from: { lane: "download" }, side: "after", tile: { id: "front", name: "Front", kind: "service" }, linkId: "download-front" });
tile("front", "identity", "Identity", "identity");
tile("front", "store", "Store", "database");
tile("front", "hot", "Hot", "cache");
tile("front", "events", "Events", "queue");
tile("front", "provider", "Provider", "external-api");
tile("events", "tally", "Tally", "worker");
tile("tally", "tally-db", "Tally DB", "database");
run({ type: "addModule", host: "front", kind: "auth-guard", name: "Sign-in" });
run({ type: "connectModule", module: "front-sign-in", slot: "identity", target: { tile: "identity" } });
run({ type: "addModule", host: "front", kind: "custom", name: "Probe" });
for (const target of ["store", "hot", "events", "provider", "identity"])
  run({ type: "connectModule", module: "front-probe", slot: "uses", target: { tile: target } });
run({ type: "addModule", host: "front", kind: "custom", name: "Internal grant" });
run({ type: "connectModule", module: "front-internal-grant", slot: "uses", target: { tile: "store" } });
run({ type: "addModule", host: "tally", kind: "custom", name: "Count" });
run({ type: "connectModule", module: "tally-count", slot: "uses", target: { tile: "events" } });
run({ type: "connectModule", module: "tally-count", slot: "uses", target: { tile: "tally-db" } });
run({ type: "editComponent", component: "front-sign-in", settings: { kind: "auth-guard", credential: "jwt", signIn: "optional" } });
run({ type: "setRunnableProcesses", on: true });
// Refusals the audit records (in memory only).
run({ type: "edit", element: "events", settings: { kind: "queue", mode: "work-queue", provider: "google-cloud" } });
run({ type: "edit", element: "events", settings: { kind: "queue", mode: "topic", provider: "unspecified" } });
const blockers = generationExportBlockers(design, installed);
writeFileSync(out, canonicalJson(design));
writeFileSync(`${out}.log.json`, `${JSON.stringify({ log, blockers }, null, 2)}\n`);
console.log(JSON.stringify({ revision: design.revision, refused: log.filter((x) => (x as { refused?: string }).refused).length, blockers: blockers.length }));
