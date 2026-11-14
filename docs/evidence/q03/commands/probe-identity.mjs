// Q03 G03 probe: the generated verifier (dist/runtime/identity.js) and the compiled audience.
// Usage: node probe-identity.mjs <built export dir>
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const app = process.argv[2];
const jose = await import(pathToFileURL(join(app, "node_modules/jose/dist/webapi/index.js")));
const { createPrincipalVerifier } = await import(pathToFileURL(join(app, "dist/runtime/identity.js")));
const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
const jwk = { ...(await jose.exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
const server = createServer((_req, res) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ keys: [jwk] })); });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const jwksUrl = `http://127.0.0.1:${server.address().port}/certs`;
// The process file compiles the audience; OIDC_ISSUER and OIDC_JWKS_URL come from the environment.
const processFile = readFileSync(join(app, "src/processes/front.ts"), "utf8");
const bindingLines = processFile.split("\n").filter((line) => /issuer:|audience:|jwksUrl:|algorithms:/.test(line)).map((line) => line.trim());
const localIssuer = "http://127.0.0.1:47922/realms/identity";
const managedIssuer = "https://securetoken.google.com/example-project";
const verify = createPrincipalVerifier({ issuer: localIssuer, audience: "identity-web", jwksUrl, algorithms: ["RS256"], jwksTimeoutMs: 3000 });
const token = (claims) => new jose.SignJWT({ sub: "user-1", ...claims }).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuedAt().setExpirationTime("5m").sign(privateKey);
const cases = [
  ["local issuer, aud identity-web (Keycloak shape)", { iss: localIssuer, aud: "identity-web" }],
  ["local issuer, aud of a managed API (example-project)", { iss: localIssuer, aud: "example-project" }],
  ["managed issuer, managed aud", { iss: managedIssuer, aud: "example-project" }],
  ["local issuer, aud array incl. identity-web", { iss: localIssuer, aud: ["account", "identity-web"] }],
];
const results = [];
for (const [name, claims] of cases) {
  try { const p = await verify(await token(claims)); results.push({ case: name, result: "accepted", subject: p.subject }); }
  catch (error) { results.push({ case: name, result: "refused", error: `${error.code ?? error.name}: ${error.message}` }); }
}
// With OIDC_ISSUER set to the managed issuer, the audience stays `${identity}-web`.
const managed = createPrincipalVerifier({ issuer: managedIssuer, audience: "identity-web", jwksUrl, algorithms: ["RS256"], jwksTimeoutMs: 3000 });
try { await managed(await token({ iss: managedIssuer, aud: "example-project" })); results.push({ case: "OIDC_ISSUER=managed, compiled aud identity-web, managed token", result: "accepted" }); }
catch (error) { results.push({ case: "OIDC_ISSUER=managed, compiled aud identity-web, managed token", result: "refused", error: `${error.code ?? error.name}: ${error.message}` }); }
// Missing environment: what startup does.
let missing;
try { createPrincipalVerifier({ issuer: process.env.UNSET_ISSUER ?? "", audience: "identity-web", jwksUrl: process.env.UNSET_JWKS ?? "", algorithms: ["RS256"], jwksTimeoutMs: 3000 }); missing = "constructed"; }
catch (error) { missing = `${error.name}: ${error.message}`; }
let insecure;
try { createPrincipalVerifier({ issuer: "http://issuer.example", audience: "identity-web", jwksUrl: "http://issuer.example/certs", algorithms: ["RS256"], jwksTimeoutMs: 3000 }); insecure = "constructed (http JWKS accepted)"; }
catch (error) { insecure = `${error.name}: ${error.message}`; }
server.close();
console.log(JSON.stringify({ bindingLines, results, missingEnvironment: missing, plainHttpIssuer: insecure }, null, 2));
