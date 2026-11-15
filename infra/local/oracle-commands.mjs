#!/usr/bin/env node
// QRWTY arm A: the oracle adapter's commands for the local test-profile stack (pack v1.6,
// oracle README "Commands"). Each prints one JSON value on stdout; non-zero exit on failure.
//
//   node infra/local/oracle-commands.mjs terminate|start|restart|stop|kill <replica or worker>
//   node infra/local/oracle-commands.mjs inspect dbConnections
//   node infra/local/oracle-commands.mjs faultPoint force-slug-collision on|off <slug>   (Q06)
//   node infra/local/oracle-commands.mjs adapter <out.json>    (writes the Q04 adapter manifest)
//
// A target is `<service>-<n>` (for example `redirect-service-1`): the Compose container
// `$COMPOSE_PROJECT_NAME-app-<service>-<n>`. `terminate` sends SIGTERM through `docker stop` with
// a 10 s bound (Cloud Run's SIGTERM-to-SIGKILL window) and reports how long the drain took on a
// monotonic clock and the exit code (137 would mean the bound was reached).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const project = process.env.COMPOSE_PROJECT_NAME;
if (!project || !/^qrwtya[a-z0-9-]*$/.test(project)) {
  console.log(JSON.stringify({ ok: false, error: "COMPOSE_PROJECT_NAME must be qrwtya*" }));
  process.exit(2);
}
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8" }).trim();
const [command, arg, state, faultArg] = process.argv.slice(2);
const container = (target) => {
  if (!/^[a-z-]+-[0-9]+$/.test(target ?? "")) throw new Error(`bad target ${target}`);
  return `${project}-app-${target}`;
};
const BOUND_MS = 10_000;
const HTTP = ["redirect-service", "session-api", "link-api", "account-api", "billing-api"];
const ROLES = { "redirect-service": "redirect", "session-api": "session", "link-api": "link", "account-api": "account", "billing-api": "billing" };
const LOGINS = {
  r_links__redirect_service: "redirect-service", r_links__link_api: "link-api",
  r_links__account_api: "account-api", r_analytics__account_api: "account-api",
  r_analytics__analytics_worker: "analytics-worker", r_billing__billing_api: "billing-api",
  r_sessions__session_api: "session-api",
};
const replicasOf = (service) =>
  docker("ps", "-a", "--filter", `label=com.docker.compose.project=${project}`,
    "--filter", `label=com.docker.compose.service=app-${service}`, "--format", "{{.Names}}")
    .split("\n").filter(Boolean).sort();

try {
  if (command === "terminate") {
    const name = container(arg);
    const started = performance.now();
    docker("stop", "-t", String(BOUND_MS / 1000), name);
    const drainedMs = Math.round(performance.now() - started);
    const exitCode = Number(docker("inspect", "-f", "{{.State.ExitCode}}", name));
    console.log(JSON.stringify({ drainedMs, boundMs: BOUND_MS, exitCode }));
  } else if (command === "start" || command === "restart" || command === "stop" || command === "kill") {
    const name = container(arg);
    if (command === "restart") docker("restart", "-t", String(BOUND_MS / 1000), name);
    else if (command === "stop") docker("stop", "-t", String(BOUND_MS / 1000), name);
    else docker(command, name);
    console.log(JSON.stringify({ ok: true }));
  } else if (command === "faultPoint") {
    // TEST PROFILE ONLY (Q06): Link API's force-slug-collision, set on every Link API replica
    // through its QRWTY_TEST_HOOKS route on the replica's loopback test port. The production
    // preflight refuses QRWTY_TEST_HOOKS, so no deployed copy has this route.
    if (arg !== "force-slug-collision" || (state !== "on" && state !== "off"))
      throw new Error(`unsupported fault point ${arg} ${state}`);
    const replicas = replicasOf("link-api");
    if (replicas.length === 0) throw new Error("no link-api replica");
    for (const name of replicas) {
      const url = `http://${docker("port", name, "3000").split("\n")[0]}/modules/link-api-link-operations/__test/fault-points`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: arg, state, ...(state === "on" ? { arg: faultArg } : {}) }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.status !== 200) throw new Error(`${name} answered ${response.status}`);
    }
    console.log(JSON.stringify({ ok: true, replicas: replicas.length }));
  } else if (command === "inspect" && arg === "dbConnections") {
    const rows = docker("exec", `${project}-local-postgres-1`, "psql", "-U", "postgres", "-At", "-F", " ", "-c",
      "SELECT usename, count(*) FROM pg_stat_activity WHERE usename LIKE 'r\\_%' GROUP BY 1");
    const byService = {};
    for (const service of [...HTTP, "analytics-worker"]) {
      // Each copy's pool on each login holds at most 10 connections (module-clients databaseClient).
      const logins = Object.entries(LOGINS).filter(([, s]) => s === service).map(([l]) => l);
      byService[service] = { current: 0, max: 10 * logins.length * replicasOf(service).length };
    }
    for (const line of rows.split("\n").filter(Boolean)) {
      const [login, count] = line.split(" ");
      if (LOGINS[login]) byService[LOGINS[login]].current += Number(count);
    }
    console.log(JSON.stringify({ byService }));
  } else if (command === "adapter") {
    const out = resolve(arg);
    const exportDir = resolve(process.env.QRWTY_EXPORT_DIR);
    const self = resolve(process.argv[1]);
    const profile = JSON.parse(readFileSync(resolve(exportDir, "infra/qrwty/production-profile.json"), "utf8"));
    const cmd = (...args) => ({ argv: ["node", self, ...args], cwd: relative(dirname(out), exportDir), timeoutMs: 120000 });
    const services = {};
    for (const service of HTTP)
      services[service] = {
        roles: [ROLES[service]],
        replicas: replicasOf(service).map((name) => ({
          name: name.slice(`${project}-app-`.length),
          url: `http://${docker("port", name, "3000").split("\n")[0]}`,
          container: name,
        })),
        health: "/healthz",
        readiness: "/healthz",
      };
    const imageId = docker("image", "inspect", "-f", "{{.Id}}", `${project}-app`);
    const settings = readFileSync(resolve(dirname(self), "../../docs/evidence/q04/commands/r01-matrix.sh"), "utf8")
      .match(/settings="([^"]+)"/)[1].split(" ").map((s) => ({ name: s.split(":")[0], category: s.split(":")[1] }))
      .concat([{ name: "test-hooks", category: "test-hook" }]); // Q06: Link API's QRWTY_TEST_HOOKS
    const adapter = {
      schemaVersion: 1,
      arm: "a",
      commit: process.env.QRWTY_TESTED_COMMIT,
      images: { app: imageId },
      publicEntry: { url: `http://127.0.0.1:${process.env.LOCAL_HTTP_PORT}`, origin: `http://127.0.0.1:${process.env.LOCAL_HTTP_PORT}` },
      edgeTokenEnv: "ORACLE_EDGE_TOKEN",
      services,
      workers: replicasOf("analytics-worker").map((name) => ({ name: name.slice(`${project}-app-`.length), kind: "analytics", container: name })),
      commands: {
        terminate: cmd("terminate", "{target}"),
        start: cmd("start", "{target}"),
        restart: cmd("restart", "{target}"),
        stop: cmd("stop", "{target}"),
        kill: cmd("kill", "{target}"),
        inspect: cmd("inspect", "{what}"),
        faultPoint: cmd("faultPoint", "{name}", "{state}", "{arg}"),
        ordinaryBuildAndTest: { argv: ["bash", resolve(dirname(self), "ordinary-build.sh")], cwd: relative(dirname(out), exportDir), timeoutMs: 300000 },
      },
      faultPoints: ["force-slug-collision"],
      // The pack's Web Risk fixture, on the Docker bridge's host address (172.17.0.1, not reachable
      // from outside this host): the containers reach it as host.docker.internal:47212.
      providers: { webRisk: { listen: process.env.QRWTY_WEB_RISK_LISTEN ?? "172.17.0.1:47212", deadlineMs: 500 } },
      productionProfileCheck: {
        command: { argv: ["node", resolve(dirname(self), "profile-check.mjs"), "check", "{process}", "{setting}", "{category}", "profile"], cwd: relative(dirname(out), exportDir), timeoutMs: 60000 },
        processes: Object.keys(profile.processes).filter((p) => p !== "migrate"),
        settings,
      },
      deploymentPreparation: { limitations: "../limitations.json" },
    };
    writeFileSync(out, `${JSON.stringify(adapter, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, out }));
  } else {
    throw new Error(`unknown command ${command} ${arg ?? ""}`);
  }
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: String(error.message ?? error).slice(0, 300) }));
  process.exit(1);
}
