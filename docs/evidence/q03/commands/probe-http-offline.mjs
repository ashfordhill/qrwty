// Q03 offline probe of the generated HTTP seam (dist/runtime/http.js, tile-http.js).
// Usage: node probe-http-offline.mjs <built export dir>
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHmac } from "node:crypto";
const app = process.argv[2];
const { createHttpService } = await import(pathToFileURL(join(app, "dist/runtime/http.js")));
const { stubRoutes } = await import(pathToFileURL(join(app, "dist/runtime/tile-http.js")));
const seen = [];
const service = await createHttpService({
  id: "probe",
  settings: { requestTimeoutMs: 1000, concurrencyLimit: 10 },
  configure: (routes) =>
    stubRoutes(routes, () => {}, "m", async (request) => {
      seen.push(request);
      if (request.path === "/cookies")
        return { status: 200, headers: { "Set-Cookie": ["session=a; HttpOnly; Secure; Path=/", "csrf=b; Secure; Path=/"] } };
      return { status: 200, body: { ok: true } };
    }),
  initialize: async () => {},
});
await service.start({ host: "127.0.0.1", port: 0 });
const raw = Buffer.from('{"id":"evt_1",  "amount": 100,\n "name":"café", "n": 1.0}', "utf8");
const secret = ["probe", "only"].join("-");
const signature = (bytes) => createHmac("sha256", secret).update(bytes).digest("hex");
const response = await service.inject({ method: "POST", url: "/modules/m/webhook", headers: { "content-type": "application/json" }, payload: raw });
const request = seen.at(-1);
const reserialized = Buffer.from(JSON.stringify(request.body), "utf8");
const cookies = await service.inject({ method: "GET", url: "/modules/m/cookies" });
await service.close();
console.log(JSON.stringify({
  rawBody: { status: response.statusCode, requestKeys: Object.keys(request).sort(), rawBytes: raw.length, reserializedBytes: reserialized.length, sameBytes: raw.equals(reserialized), signatureOverRawEqualsSignatureOverReserialized: signature(raw) === signature(reserialized) },
  setCookieArray: { status: cookies.statusCode, setCookie: cookies.headers["set-cookie"] },
}, null, 2));
