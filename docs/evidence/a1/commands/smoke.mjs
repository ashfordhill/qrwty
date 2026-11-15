// A1 smoke: Link API's guest create on the regenerated stack (two copies, verify-full TLS to
// PostgreSQL and Valkey, the pack's Web Risk fixture). Prints one JSON line per check and never a
// claim token (only whether the replay matched).
//   node smoke.mjs <copy 1 url> <copy 2 url> <fixture url>
import { randomBytes, randomUUID } from "node:crypto";

const [one, two, fixture] = process.argv.slice(2);
const MODULE = "/modules/link-api-link-operations";
const scope = randomBytes(32).toString("base64url"); // 43 characters, like Session API's handle
const key = `a1-smoke-${randomUUID()}`;
const create = async (base, body, k = key) => {
  const r = await fetch(`${base}${MODULE}/links`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": k, "qrwty-guest-scope": scope },
    body: JSON.stringify(body),
  });
  return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.json().catch(() => null) };
};
let failed = 0;
const check = (name, pass, detail = {}) => {
  if (!pass) failed++;
  console.log(JSON.stringify({ check: name, pass, ...detail }));
};

const first = await create(one, { destination: "https://example.com/a1/smoke" });
const b = first.body ?? {};
check("guest create on copy 1 answers 201", first.status === 201, {
  status: first.status,
  shortUrl: b.shortUrl,
  destination: b.destination,
  etag: first.headers.etag,
  claimPresent: typeof b.claim?.token === "string" && b.claim.token.length > 0,
  claimExpiresAt: b.claim?.expiresAt,
});
const replay = await create(two, { destination: "https://example.com/a1/smoke" });
check("same key on copy 2 replays the same link and claim", replay.status === first.status &&
  JSON.stringify(replay.body) === JSON.stringify(first.body), { status: replay.status, sameBody: JSON.stringify(replay.body) === JSON.stringify(first.body) });
const conflict = await create(two, { destination: "https://example.com/a1/other" });
check("same key, other body answers 409", conflict.status === 409, { status: conflict.status, code: conflict.body?.error?.code });
const unsafe = await create(one, { destination: "https://example.com/oracle/unsafe/a1" }, `a1-smoke-${randomUUID()}`);
check("a Web Risk threat answers 422", unsafe.status === 422, { status: unsafe.status, code: unsafe.body?.error?.code });
const noKey = await fetch(`${one}${MODULE}/links`, {
  method: "POST",
  headers: { "content-type": "application/json", "qrwty-guest-scope": scope },
  body: JSON.stringify({ destination: "https://example.com/a1/nokey" }),
});
check("no Idempotency-Key answers 400", noKey.status === 400, { status: noKey.status });
const calls = (await (await fetch(`${fixture}/__oracle/calls`)).json()).calls;
check("Web Risk saw the two checked destinations", calls.length === 2, {
  calls: calls.map((c) => ({ uri: c.uri, verdict: c.verdict })),
});
process.exit(failed ? 1 : 0);
