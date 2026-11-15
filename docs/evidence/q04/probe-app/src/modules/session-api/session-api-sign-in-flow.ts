// Q04 BINDING PROBE, not product code. Copied into the scratch export only, at this stub's
// application-owned path, to exercise the generated Identity client (JEEVES_IDENTITY_<ID>_URL)
// and the verified-TLS PostgreSQL client. Q07 writes the real sign-in flow.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./session-api-sign-in-flow.slots.ts";

export async function sessionApiSignInFlow(
  dependencies: Dependencies,
  request: ModuleRequest,
): Promise<ModuleResponse> {
  if (request.path !== "/probe") throw new Error("Not implemented: Sign-in flow");
  const response = await dependencies.identity.request("/realms/identity", {
    signal: AbortSignal.timeout(2000),
  });
  const realm = (await response.json().catch(() => null)) as { realm?: string } | null;
  const [db] = await dependencies.sessions.query<{ user: string; ssl: boolean }>(
    "SELECT current_user AS user, s.ssl FROM pg_stat_ssl s WHERE s.pid = pg_backend_pid()",
  );
  return { status: 200, body: { identity: { status: response.status, realm: realm?.realm }, db } };
}
