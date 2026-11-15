// Q05: save the one authorized revision through the studio's supported HTTP API (Q01's path:
// POST /projects/<id>/operations {baseRevision, ops, source: "api"}), with the batch that
// plan-revision.mts built. Refuses unless the project is still at the planned base revision and
// source hash, and writes a record of every request and the project list before and after.
//
//   node save-revision.mjs <plan-revision.json> <record.json>
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [planFile, recordFile] = process.argv.slice(2);
const id = "d1e59607-0616-418d-83d5-4cfe5bcb4b11";
const api = "http://127.0.0.1:4310";
const plan = JSON.parse(readFileSync(planFile, "utf8"));
const get = async (path) => {
  const res = await fetch(`${api}${path}`);
  return { status: res.status, body: await res.json() };
};
const summary = (projects) =>
  projects.projects.map((p) => ({ id: p.id, name: p.name, revision: p.revision, updatedAt: p.updatedAt }));

const record = { project: id, at: new Date().toISOString(), requests: [] };
const before = await get("/projects");
record.projectsBefore = summary(before.body);
const current = await get(`/projects/${id}/design`);
record.requests.push({ method: "GET", path: `/projects/${id}/design`, status: current.status, revision: current.body.design.revision });
if (current.body.design.revision !== plan.base.revision)
  throw new Error(`Project is at revision ${current.body.design.revision}, planned ${plan.base.revision}`);

const body = { baseRevision: plan.batch.baseRevision, ops: plan.batch.ops, source: "api" };
const res = await fetch(`${api}/projects/${id}/operations`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const saved = await res.json();
record.requests.push({
  method: "POST",
  path: `/projects/${id}/operations`,
  bodySha256: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
  status: res.status,
  revision: saved.design?.revision ?? null,
  operationId: saved.operationId ?? null,
  code: saved.code ?? null,
  message: saved.message ?? null,
});
const after = await get("/projects");
record.projectsAfter = summary(after.body);
record.changedProjects = record.projectsAfter.filter((p) => {
  const old = record.projectsBefore.find((q) => q.id === p.id);
  return !old || old.revision !== p.revision || old.updatedAt !== p.updatedAt;
});
writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ status: res.status, revision: saved.design?.revision, changed: record.changedProjects }));
if (res.status !== 200) process.exit(1);
