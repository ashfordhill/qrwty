// Q04 BINDING PROBE, not product code. Copied into the scratch export only, at this stub's
// application-owned path, to exercise the generated production clients (verified-TLS PostgreSQL,
// verified-TLS Valkey, Pub/Sub publisher) from inside a running process. Q08 writes the real body.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./redirect-service-resolve-and-redirect.slots.ts";

export async function redirectServiceResolveAndRedirect(
  dependencies: Dependencies,
  request: ModuleRequest,
): Promise<ModuleResponse> {
  if (request.path !== "/probe") throw new Error("Not implemented: Resolve and redirect");
  const id = request.query.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(id))
    return { status: 400, body: { error: "bad_probe_id" } };
  const [db] = await dependencies.links.query<{ user: string; ssl: boolean; version: string }>(
    "SELECT current_user AS user, s.ssl, s.version FROM pg_stat_ssl s WHERE s.pid = pg_backend_pid()",
  );
  await dependencies.hotRoutes.set(`q04:${id}`, id, 60);
  const cached = await dependencies.hotRoutes.get(`q04:${id}`);
  const started = performance.now();
  const body = request.query.poison === "1" ? { probe: id, poison: true } : { probe: id };
  await dependencies.clickEvents.publish(new TextEncoder().encode(JSON.stringify(body)), {
    messageId: id,
  });
  const publishMs = Math.round(performance.now() - started);
  return {
    status: 202,
    headers: { "cache-control": "no-store" },
    body: { db, cache: cached, published: id, publishMs, host: process.env.HOSTNAME ?? null },
  };
}
