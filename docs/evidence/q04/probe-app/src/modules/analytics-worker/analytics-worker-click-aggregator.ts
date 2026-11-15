// Q04 BINDING PROBE, not product code. Copied into the scratch export only, at this stub's
// application-owned path, to exercise the generated Pub/Sub loop (subscription, ack after the
// handler, dead-letter copy) and the verified-TLS PostgreSQL client. Q10 writes the real body.
import type { ModuleMessage } from "../entry.ts";
import type { Dependencies } from "./analytics-worker-click-aggregator.slots.ts";

export async function analyticsWorkerClickAggregator(
  dependencies: Dependencies,
  message: ModuleMessage,
): Promise<void> {
  const body = JSON.parse(new TextDecoder().decode(message.body)) as {
    probe?: unknown;
    poison?: unknown;
  };
  if (body.poison === true) throw new Error("Not implemented: probe poison message");
  if (typeof message.messageId !== "string") throw new Error("Not implemented: probe without id");
  await dependencies.analytics.execute(
    `INSERT INTO m_analytics_worker_click_aggregator.probe_seen (message_id, deliveries, worker, ssl)
     SELECT $1, 1, $2, s.ssl FROM pg_stat_ssl s WHERE s.pid = pg_backend_pid()
     ON CONFLICT (message_id) DO UPDATE SET deliveries = probe_seen.deliveries + 1`,
    [message.messageId, process.env.HOSTNAME ?? "unknown"],
  );
}
