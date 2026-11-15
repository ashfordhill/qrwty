// Q04: SIGTERM one Redirect service copy while traffic flows through the edge, then start it
// again; count the answers and sample the database connections per login. Monotonic clock only.
//   node drain-under-load.mjs <edge base URL> <project>
import { execFileSync, spawn } from "node:child_process";

const [edge, project] = process.argv.slice(2);
const target = `${project}-app-redirect-service-1`;
const url = (i) => `${edge}/api/redirect-service/modules/redirect-service-resolve-and-redirect/probe?id=q04-load-${i}`;
const counts = {};
let maxConnections = {};
let sent = 0;
let running = true;
const t0 = performance.now();
const at = () => Math.round(performance.now() - t0);
const sample = () => {
  const out = execFileSync("docker", ["exec", `${project}-local-postgres-1`, "psql", "-U", "postgres", "-At", "-F", " ",
    "-c", "SELECT usename, count(*) FROM pg_stat_activity WHERE usename LIKE 'r\\_%' GROUP BY 1"], { encoding: "utf8" });
  for (const line of out.split("\n").filter(Boolean)) {
    const [login, n] = line.split(" ");
    maxConnections[login] = Math.max(maxConnections[login] ?? 0, Number(n));
  }
};
const worker = async () => {
  while (running) {
    const i = sent++;
    try {
      const r = await fetch(url(i), { signal: AbortSignal.timeout(5000) });
      await r.arrayBuffer();
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    } catch (error) {
      const key = `error:${error.cause?.code ?? error.name}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
};
const workers = Array.from({ length: 32 }, worker);
const sampler = setInterval(sample, 500);
const events = [];
await new Promise((r) => setTimeout(r, 2000));
events.push({ at: at(), event: "SIGTERM (docker stop -t 10)", target });
const stopStart = performance.now();
await new Promise((resolve) => spawn("docker", ["stop", "-t", "10", target]).on("exit", resolve));
const drainedMs = Math.round(performance.now() - stopStart);
const exitCode = Number(execFileSync("docker", ["inspect", "-f", "{{.State.ExitCode}}", target], { encoding: "utf8" }));
events.push({ at: at(), event: "stopped", drainedMs, exitCode });
await new Promise((r) => setTimeout(r, 2000));
execFileSync("docker", ["start", target]);
events.push({ at: at(), event: "started" });
for (let i = 0; i < 60; i++) {
  if (execFileSync("docker", ["inspect", "-f", "{{.State.Health.Status}}", target], { encoding: "utf8" }).trim() === "healthy") break;
  await new Promise((r) => setTimeout(r, 500));
}
events.push({ at: at(), event: "healthy again" });
await new Promise((r) => setTimeout(r, 2000));
running = false;
await Promise.all(workers);
clearInterval(sampler);
sample();
console.log(JSON.stringify({ requests: sent, counts, events, maxConnectionsPerLogin: maxConnections,
  poolBound: "10 per copy per login (2 copies: 20)", durationMs: at() }));
