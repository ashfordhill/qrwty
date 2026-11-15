// Q05 diagnostic smoke: reach Account API's two stubs behind its Required sign-in. In the scratch
// stack's local Keycloak only, it creates a confidential client `q05-smoke` with a service account
// and the `identity-web` audience, takes a client-credentials access token through the published
// loopback port (so `iss` is the export's OIDC_ISSUER), and sends it on stdin to a fetch inside
// Session API's container. No password, secret or token is printed or written; each lives only in
// this process's memory and the container's stdin.
//
//   node smoke-token.mjs <export copy> <identity port>
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [root, port] = process.argv.slice(2);
const base = `http://127.0.0.1:${port}`;
const env = readFileSync(join(root, ".runtime/secrets/identity.env"), "utf8");
const adminPassword = /^KC_BOOTSTRAP_ADMIN_PASSWORD=(.*)$/m.exec(env)?.[1];
if (!adminPassword) throw new Error("no admin credential in the scratch runtime");
const form = (fields) => new URLSearchParams(fields);
const ok = async (res, what) => {
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status}`);
  return res;
};

const admin = await (
  await ok(
    await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
      method: "POST",
      body: form({ grant_type: "password", client_id: "admin-cli", username: "admin", password: adminPassword }),
    }),
    "admin token",
  )
).json();
const auth = { authorization: `Bearer ${admin.access_token}`, "content-type": "application/json" };
await ok(
  await fetch(`${base}/admin/realms/identity/clients`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      clientId: "q05-smoke",
      publicClient: false,
      serviceAccountsEnabled: true,
      standardFlowEnabled: false,
      directAccessGrantsEnabled: false,
      protocolMappers: [
        {
          name: "smoke-audience",
          protocol: "openid-connect",
          protocolMapper: "oidc-audience-mapper",
          config: { "included.client.audience": "identity-web", "access.token.claim": "true", "id.token.claim": "false" },
        },
      ],
    }),
  }),
  "create client",
);
const [client] = await (
  await ok(await fetch(`${base}/admin/realms/identity/clients?clientId=q05-smoke`, { headers: auth }), "find client")
).json();
const secret = (
  await (
    await ok(await fetch(`${base}/admin/realms/identity/clients/${client.id}/client-secret`, { headers: auth }), "secret")
  ).json()
).value;
const token = (
  await (
    await ok(
      await fetch(`${base}/realms/identity/protocol/openid-connect/token`, {
        method: "POST",
        body: form({ grant_type: "client_credentials", client_id: "q05-smoke", client_secret: secret }),
      }),
      "client token",
    )
  ).json()
).access_token;
const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
console.log(JSON.stringify({ via: "keycloak", client: "q05-smoke", iss: claims.iss, aud: claims.aud, hasSub: !!claims.sub }));

const inner = `
  let token = "";
  for await (const chunk of process.stdin) token += chunk;
  for (const path of ["/modules/account-api-sign-in/me", "/modules/account-api-my-links", "/modules/account-api-link-analytics"]) {
    const res = await fetch("http://app-account-api:3000" + path, { headers: { authorization: "Bearer " + token.trim() } });
    const body = await res.text();
    console.log(JSON.stringify({ via: "inside", method: "GET", path: "http://app-account-api:3000" + path, bearer: "client-credentials token", status: res.status, body: path.endsWith("/me") ? body.replace(/"subject":"[^"]*"/, '"subject":"<service account>"') : body.slice(0, 300) }));
  }`;
const run = spawnSync("docker", ["exec", "-i", "qrwtya-q05-app-session-api-1", "node", "--input-type=module", "-e", inner], {
  input: token,
  encoding: "utf8",
});
process.stdout.write(run.stdout);
if (run.status !== 0) {
  process.stderr.write(run.stderr);
  process.exit(1);
}
