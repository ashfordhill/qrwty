// A1: run the production preflight (infra/app-overlay) offline against a throwaway Cloud Run mount
// layout of random values, for the new contracts (QG29's JEEVES_MIGRATE_TLS, QG34's per-secret
// file variables). Prints one JSON line per case; never prints a value.
//   node preflight-check.mjs <overlay dir> <work dir>
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [overlay, work] = process.argv.slice(2);
const profile = JSON.parse(
  (await import("node:fs")).readFileSync(join(overlay, "infra/qrwty/production-profile.json"), "utf8"),
);
const mount = join(work, "mount");
rmSync(work, { recursive: true, force: true });
const fileVariable = (s) => `JEEVES_SECRET_${s.toUpperCase().replace(/[-.]/g, "_")}_FILE`;
const allSecrets = new Set(Object.values(profile.processes).flatMap((p) => p.secrets));
for (const s of allSecrets) {
  mkdirSync(join(mount, s), { recursive: true });
  const value =
    s === "link-replay-keys"
      ? `k${randomBytes(3).toString("hex")} ${randomBytes(32).toString("base64url")}`
      : randomBytes(24).toString("hex");
  writeFileSync(join(mount, s, "value"), `${value}\n`, { mode: 0o600 });
}
const issuer = "https://qrwtya-check.us.auth0.com/";
const base = (proc) => {
  const env = { QRWTY_PROFILE: "production", JEEVES_REQUIRE_TLS: "true", QRWTY_SECRET_MOUNT_DIR: mount };
  for (const v of profile.processes[proc].env) {
    if (/_HOST$/.test(v) || v === "PGHOST") env[v] = "/cloudsql/qrwty-check:us-central1:qrwtya-pg";
    else if (/_PORT$/.test(v) || v === "PGPORT") env[v] = "5432";
    else if (/^JEEVES_(DATABASE)_.+_TLS$/.test(v)) env[v] = "disable";
    else if (/_TLS$/.test(v)) env[v] = v === "JEEVES_MIGRATE_TLS" ? "disable" : "verify-full";
    else if (v in profile.fixed) env[v] = profile.fixed[v];
    else if (v === "OIDC_ISSUER") env[v] = issuer;
    else if (v === "OIDC_JWKS_URL") env[v] = `${issuer}.well-known/jwks.json`;
    else if (v === "OIDC_AUDIENCE") env[v] = "https://api.qrwtya.qrwty.io";
    else if (/^JEEVES_IDENTITY_.+_URL$/.test(v)) env[v] = issuer.slice(0, -1);
    else if (/_URL$/.test(v)) env[v] = "https://qrwtya-check.example.com";
    else if (v === "JEEVES_PUBSUB_PROJECT") env[v] = "qrwty-check";
    else if (v === "QRWTY_PUBLIC_ORIGIN_URL") env[v] = "https://qrwty.io";
  }
  // Cache hosts are addresses on a private network, not sockets.
  for (const v of Object.keys(env)) if (/^JEEVES_CACHE_.+_HOST$/.test(v)) env[v] = "10.1.2.3";
  for (const s of profile.processes[proc].secrets) env[fileVariable(s)] = join(mount, s, "value");
  return env;
};
const cases = [
  ["link-api", "production", () => {}, true],
  ["link-api", "cache AUTH_DISABLED, /dev/null", (e) => {
    e.QRWTY_CACHE_AUTH_DISABLED = "true";
    e.JEEVES_SECRET_CACHE_ADMISSION_CACHE_FILE = "/dev/null";
  }, true],
  ["link-api", "/dev/null for a database login", (e) => (e.JEEVES_SECRET_SQL_LINKS__LINK_API_FILE = "/dev/null"), false],
  ["link-api", "missing file variable", (e) => delete e.JEEVES_SECRET_LINK_REPLAY_KEYS_FILE, false],
  ["link-api", "file outside its own volume", (e) => (e.JEEVES_SECRET_LINK_REPLAY_KEYS_FILE = join(mount, "sql-links--link-api", "value")), false],
  ["link-api", "file variable for another process's credential", (e) => (e.JEEVES_SECRET_OWNER_LINKS_FILE = join(mount, "owner-links", "value")), false],
  ["link-api", "SECRET_DIR set", (e) => (e.SECRET_DIR = "/run/secrets"), false],
  ["migrate", "production (socket, disable)", () => {}, true],
  ["migrate", "TCP host, verify-full", (e) => {
    e.PGHOST = "10.1.2.4";
    e.JEEVES_MIGRATE_TLS = "verify-full";
  }, true],
  ["migrate", "TCP host, disable", (e) => (e.PGHOST = "10.1.2.4"), false],
  ["migrate", "JEEVES_MIGRATE_TLS missing", (e) => delete e.JEEVES_MIGRATE_TLS, false],
  ["redirect-service", "production", (e) => {
    e.QRWTY_CACHE_AUTH_DISABLED = "true";
    e.JEEVES_SECRET_CACHE_HOT_ROUTES_FILE = "/dev/null";
  }, true],
];
let failures = 0;
for (const [proc, label, change, expectOk] of cases) {
  const env = base(proc);
  change(env);
  const r = spawnSync("node", ["scripts/qrwty-production-profile.mjs", proc], {
    cwd: overlay,
    env: { PATH: process.env.PATH, ...env },
    encoding: "utf8",
  });
  const out = (r.status === 0 ? r.stdout : r.stderr).trim().split("\n").pop();
  const parsed = JSON.parse(out);
  const ok = r.status === 0;
  if (ok !== expectOk) failures++;
  console.log(JSON.stringify({
    process: proc,
    case: label,
    expected: expectOk ? "ok" : "refused",
    got: ok ? "ok" : "refused",
    pass: ok === expectOk,
    ...(ok ? { secrets: parsed.secrets } : { reasons: parsed.reasons.map((x) => `${x.category}: ${x.variable}`) }),
  }));
}
rmSync(work, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
