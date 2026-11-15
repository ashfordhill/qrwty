-- Q04 BINDING PROBE, not product SQL. Copied into the scratch export only. Q10 writes the real
-- aggregation tables. Re-runnable: it runs at every first-run and start.
CREATE TABLE IF NOT EXISTS probe_seen (
  message_id text PRIMARY KEY,
  deliveries integer NOT NULL,
  worker text NOT NULL,
  ssl boolean,
  first_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
