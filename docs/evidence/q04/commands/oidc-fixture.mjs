// Q04 test fixture: a minimal OIDC key-set server for the sign-in binding check (QG11, QG24).
// It makes an RS256 key pair at start (in memory only), serves its public key at
// /.well-known/jwks.json, and /mint?aud=&iss= signs a short-lived token for a fixed test subject.
// Runs inside the production image (it imports the image's own `jose`); never in production.
import { createServer } from "node:http";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "q04-fixture", alg: "RS256", use: "sig" };
createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://fixture");
  if (url.pathname === "/.well-known/jwks.json") {
    response.setHeader("content-type", "application/json");
    return response.end(JSON.stringify({ keys: [jwk] }));
  }
  if (url.pathname === "/mint") {
    const token = await new SignJWT({ preferred_username: "q04-probe" })
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setSubject("q04-subject")
      .setIssuer(url.searchParams.get("iss") ?? "")
      .setAudience(url.searchParams.get("aud") ?? "")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    return response.end(token);
  }
  response.statusCode = 404;
  response.end();
}).listen(8080);
