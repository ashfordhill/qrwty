// QRWTY arm A: the production-profile preflight (application-owned, not generated; no dependencies).
//
//   node scripts/qrwty-production-profile.mjs <process>
//
// Runs before a generated process or the migration job in production (Cloud Run's command:
// `node scripts/qrwty-production-profile.mjs <p> && exec node …`). It checks the whole
// environment against infra/qrwty/production-profile.json before any network call and refuses
// every emulator, fake, insecure, development, test-only or missing setting with a named reason
// (one JSON line on stderr, exit 1; never a value). Each credential the process reads is the file
// its JEEVES_SECRET_<NAME>_FILE names (Jeeves QG34), which must be its own Cloud Run secret volume,
// <QRWTY_SECRET_MOUNT_DIR>/<name>/value; it writes nothing.
// The generated runtime's own checks (JEEVES_REQUIRE_TLS, Invalid endpoint, Invalid setting) still
// apply after it.
import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const profilePath = process.env.QRWTY_PROFILE_FILE ?? "infra/qrwty/production-profile.json";
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const name = process.argv[2];
const env = process.env;
const problems = [];
const refuse = (category, variable, reason) =>
  problems.push({ category, variable, reason: reason.includes(variable.replace(/^secret:/, "")) ? reason : `${variable}: ${reason}` });

const spec = profile.processes[name];
if (!spec) {
  console.error(JSON.stringify({ level: "error", event: "profile-refused", process: name ?? null,
    reasons: [{ category: "missing-required-value", variable: "argv", reason: "unknown process" }] }));
  process.exit(1);
}

// 1. The profile switches.
for (const [variable, value] of Object.entries(profile.required)) {
  if (env[variable] === undefined || env[variable] === "")
    refuse("missing-required-value", variable, `${variable} is not set`);
  else if (env[variable] !== value)
    refuse(variable === "JEEVES_REQUIRE_TLS" ? "tls-verification-disabled" : "missing-required-value",
      variable, `${variable} must be ${value}`);
}
// 2. Variables that exist only in a development or test environment.
for (const variable of Object.keys(env).sort())
  for (const rule of profile.forbidden)
    if (new RegExp(rule.pattern).test(variable)) refuse(rule.category, variable, rule.reason);

// 3. Each variable the process reads, present and production-shaped.
const localHost = (host) =>
  !host.includes(".") || // a Compose service name such as local-postgres or cache-hot-routes
  /^(localhost|host\.docker\.internal|0\.0\.0\.0|\[?::1\]?)$/i.test(host) ||
  /^127\./.test(host) ||
  /\.(localhost|local|test|example|invalid)$/i.test(host);
const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};
const checkUrl = (variable, value) => {
  const url = parseUrl(value);
  if (!url) return refuse("missing-required-value", variable, `${variable} is not a URL`);
  if (url.protocol !== "https:") refuse("tls-verification-disabled", variable, `${variable} is not https`);
  if (localHost(url.hostname)) refuse("emulator-endpoint", variable, `${variable} names a local host`);
  return url;
};
// Every endpoint variable present is checked, read by this process or not, so a development value
// can't sit unnoticed in a shared environment; only the process's own list must be present.
// A credential's file variable is checked with the credentials (4).
const present = Object.keys(env).filter(
  (k) =>
    /^(JEEVES_|OIDC_)/.test(k) &&
    !/_(CA_FILE|TLS_SERVERNAME|PORT)$/.test(k) &&
    !/^JEEVES_SECRET_.+_FILE$/.test(k) &&
    !(k in profile.required),
);
for (const variable of [...new Set([...spec.env, ...present])].sort()) {
  const value = env[variable];
  if (value === undefined || value === "") {
    refuse("missing-required-value", variable, `${variable} is not set`);
    continue;
  }
  if (/_PORT$/.test(variable)) {
    if (!/^[1-9][0-9]{0,4}$/.test(value)) refuse("missing-required-value", variable, `${variable} is not a port`);
    continue;
  }
  // The migration job's own TLS (Jeeves QG29): over TCP it must verify; over Cloud SQL's socket
  // the connector encrypts.
  if (variable === "JEEVES_MIGRATE_TLS") {
    if (value !== "verify-full" && !(value === "disable" && (env.PGHOST ?? "").startsWith("/")))
      refuse("tls-verification-disabled", variable, `${variable} is not verify-full for a TCP database`);
    continue;
  }
  const tls = /^JEEVES_(DATABASE|CACHE)_(.+)_TLS$/.exec(variable);
  if (tls) {
    const host = env[`JEEVES_${tls[1]}_${tls[2]}_HOST`] ?? "";
    if (value !== "verify-full" && !(tls[1] === "DATABASE" && host.startsWith("/")))
      refuse("tls-verification-disabled", variable, `${variable} is not verify-full`);
    continue;
  }
  if (/_HOST$/.test(variable) || variable === "PGHOST") {
    if (value.startsWith("/")) {
      if (!/^\/cloudsql\/[a-z][a-z0-9-]*:[a-z0-9-]+:[a-z][a-z0-9-]*$/.test(value))
        refuse("emulator-endpoint", variable, `${variable} is not a Cloud SQL socket directory`);
    } else if (localHost(value)) refuse("emulator-endpoint", variable, `${variable} names a local host`);
    continue;
  }
  if (variable in profile.fixed) {
    if (value !== profile.fixed[variable])
      refuse("fake-provider", variable, `${variable} is not the provider's production endpoint`);
    continue;
  }
  if (variable === "OIDC_ISSUER") {
    const url = checkUrl(variable, value);
    if (url && (url.pathname !== "/" || url.search || url.hash))
      refuse("fake-provider", variable, "OIDC_ISSUER is not a managed tenant issuer (https://<tenant>/)");
    continue;
  }
  if (variable === "OIDC_JWKS_URL") {
    checkUrl(variable, value);
    if (env.OIDC_ISSUER && value !== `${env.OIDC_ISSUER}.well-known/jwks.json`)
      refuse("fake-provider", variable, "OIDC_JWKS_URL is not the issuer's key set");
    continue;
  }
  if (variable === "OIDC_AUDIENCE") {
    if (value === "identity-web" || !/^https:\/\/[^\s]+$/.test(value))
      refuse("fake-provider", variable, "OIDC_AUDIENCE is not the arm's API identifier");
    continue;
  }
  if (/^JEEVES_IDENTITY_.+_URL$/.test(variable)) {
    const url = checkUrl(variable, value);
    if (url && (url.pathname !== "/" || value.endsWith("/")))
      refuse("fake-provider", variable, `${variable} is not the managed issuer's origin`);
    continue;
  }
  if (/_URL$/.test(variable)) {
    checkUrl(variable, value);
    continue;
  }
  if (variable === "JEEVES_PUBSUB_PROJECT") {
    if (/^(local|test|demo|emulator)([-:]|$)/.test(value) || value.startsWith("demo-"))
      refuse("emulator-endpoint", variable, "JEEVES_PUBSUB_PROJECT is the emulator's project");
    continue;
  }
}

// 4. Credentials: one Cloud Run secret volume per credential, named by its file variable (QG34).
const fileVariable = (secret) => `JEEVES_SECRET_${secret.toUpperCase().replace(/[-.]/g, "_")}_FILE`;
const mount = env[profile.secretMount.variable];
const empty = new Set(profile.emptySecretAllowed?.secrets ?? []);
const placeholder =
  /^(changeme|change-me|placeholder|password|secret|example|todo|none|null|x+|<[^>]*>|\$\{[^}]*\})$/i;
const development = /^(dev|local|test|fixture|oracle)[-_]/i;
let checked = 0;
if (!mount) refuse("missing-required-value", profile.secretMount.variable, "credential mount directory is not set");
else if (!isAbsolute(mount)) refuse("missing-required-value", profile.secretMount.variable, "not an absolute path");
else if (/(^|\/)\.runtime(\/|$)/.test(mount) || mount === "/run/secrets")
  refuse("development-secret", profile.secretMount.variable, "the local Compose credential directory");
else {
  // A file variable for a credential this process doesn't read can't stand in for a checked one.
  const own = new Set(spec.secrets.map(fileVariable));
  for (const variable of Object.keys(env).filter((k) => /^JEEVES_SECRET_.+_FILE$/.test(k)).sort())
    if (!own.has(variable))
      refuse("development-secret", variable, `${variable} names a credential this process does not read`);
  for (const secret of spec.secrets) {
    const variable = fileVariable(secret);
    const file = env[variable];
    // A cache whose Memorystore instance runs AUTH_DISABLED has no secret to mount: its variable
    // names /dev/null, an empty credential, and the generated client sends no AUTH.
    const mayBeEmpty = empty.has(secret) && env.QRWTY_CACHE_AUTH_DISABLED === "true";
    if (file === undefined || file === "") {
      refuse("missing-required-value", variable, `${variable} is not set`);
      continue;
    }
    if (file === "/dev/null") {
      if (!mayBeEmpty) refuse("placeholder-credential", `secret:${secret}`, `credential ${secret} is empty`);
      checked++;
      continue;
    }
    if (file !== join(mount, secret, "value")) {
      refuse("development-secret", variable, `${variable} is not the credential's own secret volume`);
      continue;
    }
    let value;
    try {
      value = readFileSync(file, "utf8").trim();
    } catch {
      refuse("missing-required-value", `secret:${secret}`, `credential ${secret} is not mounted`);
      continue;
    }
    if (value === "") {
      if (!mayBeEmpty) refuse("placeholder-credential", `secret:${secret}`, `credential ${secret} is empty`);
    } else if (placeholder.test(value) || value.length < 16)
      refuse("placeholder-credential", `secret:${secret}`, `credential ${secret} is a placeholder`);
    else if (development.test(value))
      refuse("development-secret", `secret:${secret}`, `credential ${secret} is a development value`);
    checked++;
  }
}

if (problems.length) {
  console.error(JSON.stringify({ level: "error", event: "profile-refused", process: name, reasons: problems }));
  process.exit(1);
}
console.log(JSON.stringify({ level: "info", event: "profile-ok", process: name, secrets: checked }));
