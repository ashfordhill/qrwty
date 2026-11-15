#!/usr/bin/env node
// QRWTY arm A: start one production process image with the production profile and one
// forbidden setting, and report whether the start was refused and why (oracle R01's
// productionProfileCheck command; one JSON line on stdout, exit 0 when the check ran).
//
//   node infra/local/profile-check.mjs prepare
//   node infra/local/profile-check.mjs check <process> <setting> <category> [profile|generated]
//   node infra/local/profile-check.mjs teardown
//
// The image is the stack's production image (`$COMPOSE_PROJECT_NAME-app`). Each check runs it once
// with `docker run --rm` on an internal network (no route out) that reaches only the stack's
// verified-TLS PostgreSQL and Valkey, by address, with their certificate names in
// `_TLS_SERVERNAME`: the shape of a managed instance reached by a private address. Every other
// endpoint is production-shaped and unreachable (none is probed at startup except Pub/Sub, whose
// client finds no credentials). `profile` runs the application's preflight then the generated
// process, as Cloud Run will; `generated` runs the generated process alone, to show what the
// generated runtime refuses by itself. Credentials are copied per run from the stack's private
// runtime directory into a throwaway mount layout and never printed.
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const project = process.env.COMPOSE_PROJECT_NAME;
const exportDir = resolve(process.env.QRWTY_EXPORT_DIR ?? ".");
const tlsDir = process.env.QRWTY_LOCAL_TLS_DIR;
const workDir = resolve(process.env.QRWTY_PROFILE_WORK_DIR ?? join(exportDir, "..", "profile-runs"));
if (!project || !/^qrwtya[a-z0-9-]*$/.test(project) || !tlsDir) {
  console.log(JSON.stringify({ ok: false, error: "set COMPOSE_PROJECT_NAME=qrwtya* and QRWTY_LOCAL_TLS_DIR" }));
  process.exit(2);
}
const image = `${project}-app`;
const network = `${project}-rehearsal`;
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8" }).trim();
const profile = JSON.parse(
  readFileSync(join(exportDir, "infra/qrwty/production-profile.json"), "utf8"),
);
const stores = ["local-postgres", "cache-hot-routes", "cache-admission-cache"];
const container = (service) => `${project}-${service}-1`;

const [command, proc, setting, category, mode = "profile"] = process.argv.slice(2);

if (command === "prepare") {
  if (!docker("network", "ls", "-q", "--filter", `name=^${network}$`))
    docker("network", "create", "--internal", "--label", "qrwty.arm=a", network);
  for (const s of stores) {
    const nets = JSON.parse(docker("inspect", "-f", "{{json .NetworkSettings.Networks}}", container(s)));
    if (!(network in nets)) docker("network", "connect", network, container(s));
  }
  console.log(JSON.stringify({ ok: true, network }));
  process.exit(0);
}
if (command === "teardown") {
  for (const s of stores) spawnSync("docker", ["network", "disconnect", network, container(s)]);
  spawnSync("docker", ["network", "rm", network]);
  rmSync(workDir, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true }));
  process.exit(0);
}
if (command !== "check" || !profile.processes[proc]) {
  console.log(JSON.stringify({ ok: false, error: "usage: check <process> <setting> <category> [profile|generated]" }));
  process.exit(2);
}

const address = (service) =>
  docker("inspect", "-f", `{{(index .NetworkSettings.Networks "${network}").IPAddress}}`, container(service));
const spec = profile.processes[proc];
const env = {
  QRWTY_PROFILE: "production",
  JEEVES_REQUIRE_TLS: "true",
  QRWTY_SECRET_MOUNT_DIR: "/var/run/qrwty-secrets",
};
const issuer = "https://qrwtya-rehearsal.us.auth0.com/";
for (const variable of spec.env) {
  let m;
  if ((m = /^JEEVES_DATABASE_(.+)_HOST$/.exec(variable))) {
    Object.assign(env, {
      [variable]: address("local-postgres"),
      [`JEEVES_DATABASE_${m[1]}_CA_FILE`]: "/qrwty-tls/ca.crt",
      [`JEEVES_DATABASE_${m[1]}_TLS_SERVERNAME`]: "local-postgres",
    });
  } else if ((m = /^JEEVES_CACHE_(.+)_HOST$/.exec(variable))) {
    const service = `cache-${m[1].toLowerCase().replace(/_/g, "-")}`;
    Object.assign(env, {
      [variable]: address(service),
      [`JEEVES_CACHE_${m[1]}_CA_FILE`]: "/qrwty-tls/ca.crt",
      [`JEEVES_CACHE_${m[1]}_TLS_SERVERNAME`]: service,
    });
  } else if (/_(DATABASE|CACHE)_.+_PORT$/.test(variable)) {
    env[variable] = variable.includes("_CACHE_") ? "6379" : "5432";
  } else if (/_TLS$/.test(variable)) env[variable] = "verify-full";
  else if (variable === "JEEVES_PUBSUB_PROJECT") env[variable] = "qrwtya-rehearsal";
  else if (variable in profile.fixed) env[variable] = profile.fixed[variable];
  else if (/^JEEVES_TILE_(.+)_URL$/.test(variable))
    env[variable] = `https://qrwtya-${/^JEEVES_TILE_(.+)_URL$/.exec(variable)[1].toLowerCase().replace(/_/g, "-")}.rehearsal.qrwtya.internal`;
  else if (/^JEEVES_IDENTITY_.+_URL$/.test(variable)) env[variable] = issuer.slice(0, -1);
  else if (variable === "OIDC_ISSUER") env[variable] = issuer;
  else if (variable === "OIDC_JWKS_URL") env[variable] = `${issuer}.well-known/jwks.json`;
  else if (variable === "OIDC_AUDIENCE") env[variable] = "https://api.qrwtya.qrwty.io";
  else if (variable === "QRWTY_PUBLIC_ORIGIN_URL") env[variable] = "https://qrwty.io";
}
const db = spec.env.find((v) => /^JEEVES_DATABASE_.+_HOST$/.test(v)).replace(/_HOST$/, "");
const dbSecret = spec.secrets[0];
// The export's credentials are in its private runtime; the application's own (Q06: Link API's
// replay key ring) in QRWTY_LOCAL_APP_SECRET_DIR (infra/local/app-secrets.sh).
const appSecretDir = process.env.QRWTY_LOCAL_APP_SECRET_DIR;
const secretFile = (s) =>
  existsSync(join(exportDir, ".runtime/secrets", s)) || !appSecretDir
    ? join(exportDir, ".runtime/secrets", s)
    : join(appSecretDir, s);
const secrets = Object.fromEntries(spec.secrets.map((s) => [s, readFileSync(secretFile(s), "utf8")]));
// Production names each credential's own secret volume by its file variable (Jeeves QG34); the
// generated process alone (`generated`) reads them from SECRET_DIR, below.
if (mode !== "generated")
  for (const s of spec.secrets)
    env[`JEEVES_SECRET_${s.toUpperCase().replace(/[-.]/g, "_")}_FILE`] = `/var/run/qrwty-secrets/${s}/value`;

// The forbidden settings: each names its variable, so the reason can be compared with it.
const token = () => randomBytes(16).toString("hex");
const SETTINGS = {
  "pubsub-emulator-host": ["emulator-endpoint", "PUBSUB_EMULATOR_HOST", (e) => (e.PUBSUB_EMULATOR_HOST = "local-pubsub:8085")],
  "metadata-detection-off": ["emulator-endpoint", "METADATA_SERVER_DETECTION", (e) => (e.METADATA_SERVER_DETECTION = "none")],
  "compose-database-host": ["emulator-endpoint", `${db}_HOST`, (e) => (e[`${db}_HOST`] = "local-postgres")],
  "emulator-pubsub-project": ["emulator-endpoint", "JEEVES_PUBSUB_PROJECT", (e) => (e.JEEVES_PUBSUB_PROJECT = "local")],
  "stripe-fixture-url": ["fake-provider", "JEEVES_EXTERNAL_STRIPE_API_URL", (e) => (e.JEEVES_EXTERNAL_STRIPE_API_URL = "https://stripe-fixture.qrwtya.test")],
  "local-issuer": ["fake-provider", "OIDC_ISSUER", (e) => (e.OIDC_ISSUER = "http://127.0.0.1:47202/realms/identity")],
  "development-secret-dir": ["development-secret", "SECRET_DIR", (e) => (e.SECRET_DIR = "/run/secrets")],
  "development-credential": ["development-secret", `secret:${dbSecret}`, (_e, s) => (s[dbSecret] = `dev-${token()}`)],
  "node-tls-reject-off": ["tls-verification-disabled", "NODE_TLS_REJECT_UNAUTHORIZED", (e) => (e.NODE_TLS_REJECT_UNAUTHORIZED = "0")],
  "database-tls-disable": ["tls-verification-disabled", `${db}_TLS`, (e) => (e[`${db}_TLS`] = "disable")],
  "require-tls-off": ["tls-verification-disabled", "JEEVES_REQUIRE_TLS", (e) => delete e.JEEVES_REQUIRE_TLS],
  "missing-database-host": ["missing-required-value", `${db}_HOST`, (e) => delete e[`${db}_HOST`]],
  "missing-secret-mount": ["missing-required-value", "QRWTY_SECRET_MOUNT_DIR", (e) => delete e.QRWTY_SECRET_MOUNT_DIR],
  "placeholder-db-password": ["placeholder-credential", `secret:${dbSecret}`, (_e, s) => (s[dbSecret] = "changeme")],
  "oracle-edge-token": ["test-hook", "ORACLE_EDGE_TOKEN", (e) => (e.ORACLE_EDGE_TOKEN = token())],
  "test-clock": ["test-hook", "QRWTY_TEST_CLOCK_OFFSET_MS", (e) => (e.QRWTY_TEST_CLOCK_OFFSET_MS = "60000")],
  "test-hooks": ["test-hook", "QRWTY_TEST_HOOKS", (e) => (e.QRWTY_TEST_HOOKS = "on")],
  none: [null, null, () => {}],
};
const chosen = SETTINGS[setting];
if (!chosen || (chosen[0] !== null && chosen[0] !== category)) {
  console.log(JSON.stringify({ ok: false, error: `unknown setting ${setting} for category ${category}` }));
  process.exit(2);
}
chosen[2](env, secrets);

const run = `r01-${process.pid}-${token().slice(0, 6)}`;
const dir = join(workDir, run);
mkdirSync(join(dir, "flat"), { recursive: true, mode: 0o700 });
for (const [name, value] of Object.entries(secrets)) {
  mkdirSync(join(dir, "mount", name), { recursive: true });
  writeFileSync(join(dir, "mount", name, "value"), value, { mode: 0o600 });
  writeFileSync(join(dir, "flat", name), value, { mode: 0o600 });
}
cpSync(join(tlsDir, "ca.crt"), join(dir, "ca.crt"));
const script =
  mode === "generated"
    ? `exec node dist/processes/${proc}.js`
    : `node scripts/qrwty-production-profile.mjs ${proc} && exec node dist/processes/${proc}.js`;
if (mode === "generated" && !("SECRET_DIR" in env))
  env.SECRET_DIR = setting === "missing-secret-mount" ? "/nonexistent" : "/run/secrets";
const name = `${project}-${run}`;
const args = ["run", "-d", "--name", name, "--label", "qrwty.arm=a", "--network", network,
  "-v", `${join(dir, "ca.crt")}:/qrwty-tls/ca.crt:ro`,
  "-v", `${join(dir, "mount")}:/var/run/qrwty-secrets:ro`,
  "-v", `${join(dir, "flat")}:/run/secrets:ro`,
  ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]), image, "sh", "-c", script];
const started = performance.now();
docker(...args);
const deadlineMs = 20000;
let state = "running";
let ready = false;
while (performance.now() - started < deadlineMs) {
  const status = docker("inspect", "-f", "{{.State.Status}} {{.State.ExitCode}}", name);
  if (!status.startsWith("running")) {
    state = status;
    break;
  }
  if (spawnSync("docker", ["exec", name, "test", "-f", "/tmp/application-ready"]).status === 0) {
    ready = true;
    break;
  }
  spawnSync("sleep", ["0.25"]);
}
const durationMs = Math.round(performance.now() - started);
const logs = spawnSync("docker", ["logs", name], { encoding: "utf8" });
spawnSync("docker", ["rm", "-f", name]);
rmSync(dir, { recursive: true, force: true });
const lines = `${logs.stdout}\n${logs.stderr}`.split("\n").filter((l) => l.startsWith("{"));
const parsed = lines.map((l) => { try { return JSON.parse(l); } catch { return {}; } });
const preflight = parsed.find((l) => l.event === "profile-refused");
const startup = parsed.find((l) => l.event === "startup-failed");
const probeFailure = parsed.find((l) => l.event === "probe" && l.result === "failed");
const variable = chosen[1];
let reason = null;
let source = null;
if (preflight) {
  const hit = preflight.reasons.find((r) => r.variable === variable) ?? preflight.reasons[0];
  reason = `${hit.category}: ${hit.reason}`;
  source = "preflight";
} else if (startup) {
  reason = String(startup.error ?? "").slice(0, 300);
  source = "generated";
}
const exited = state !== "running" && !ready;
const refused = exited && reason !== null;
console.log(JSON.stringify({
  refused,
  reason,
  source,
  process: proc,
  setting,
  category: chosen[0],
  variable,
  mode,
  named: refused && variable !== null && reason.includes(variable.replace(/^secret:/, "")),
  ready,
  exit: state,
  probeFailure: probeFailure ? `${probeFailure.kind} ${probeFailure.client}: ${String(probeFailure.error).slice(0, 160)}` : null,
  durationMs,
}));
