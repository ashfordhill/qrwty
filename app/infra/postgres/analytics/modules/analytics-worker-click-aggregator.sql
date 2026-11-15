-- Click aggregator, a Custom, in Analytics worker writes Analytics: its product tables and published views.
-- Write them here. Export never overwrites your edits: export afresh and carry them over.
-- first-run and start run this file every time, after the template migrations and views, as
-- the setup-only owner o_analytics of d_analytics, in one transaction with search_path m_analytics_worker_click_aggregator:
-- unqualified names land in schema m_analytics_worker_click_aggregator. Keep it re-runnable (IF NOT EXISTS, CREATE OR
-- REPLACE), with no BEGIN or COMMIT. A failure rolls the database back, and setup names this file.
--
-- Its own tables, in m_analytics_worker_click_aggregator: only r_analytics__analytics_worker (Analytics worker) selects, inserts, updates and deletes.
-- What others may read goes in views in published (CREATE OR REPLACE VIEW published.<name> AS ...),
-- which every login on this database may select:
--   r_analytics__account_api (Account API)
--   r_analytics__analytics_worker (Analytics worker)
-- Template tables it may read, by qualified name:
--   none
-- Template views:
--   none

-- QRWTY click analytics (A4: Q10's ingestion and the owner's reads). Two parts, both run on every
-- start, as Link operations' file does (Q06):
--   1. The migration sequence: numbered steps, each applied once and recorded in
--      product_migrations; an applied step is never edited, a change is a new step below.
--   2. Code that holds no data, replaced every run: functions and the published views.
-- Each consumed event is one call of record_click, one statement and so one transaction: the
-- receipt (the dedup) and the daily aggregate commit together, and the worker acknowledges the
-- message only after that call returns. Retention (decisions §3): receipts 35 days after the
-- event time (the dedup horizon, past the 31-day replay horizon), aggregates 13 months, quarantine
-- until repaired. Storage: one receipt row (about 80 bytes with its index entries) per accepted
-- event for 35 days, so 35 x the daily event count; one aggregate row per link and day with a
-- click. No row holds an IP address, user agent, referrer path or query, destination or cookie.

CREATE TABLE IF NOT EXISTS product_migrations (
  version integer PRIMARY KEY CHECK (version >= 1),
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Step 1 (A4): receipts, daily aggregates, the quarantine and the consumer's progress.
DO $step$
BEGIN
  IF EXISTS (SELECT 1 FROM product_migrations WHERE version = 1) THEN
    RETURN;
  END IF;

  -- One row per accepted event ID: the dedup, for 35 days after its event time.
  CREATE TABLE click_receipts (
    event_id uuid PRIMARY KEY,
    link_id uuid NOT NULL,
    event_time timestamptz NOT NULL,
    received_at timestamptz NOT NULL
  );
  CREATE INDEX click_receipts_event_time ON click_receipts (event_time);

  -- Counts per link and UTC day of the event time. Recorded attempts: every non-synthetic event,
  -- bots included; filtered clicks: those without filter-v1's bot class; synthetic: kept apart.
  CREATE TABLE click_daily (
    link_id uuid NOT NULL,
    day date NOT NULL,
    recorded_attempts bigint NOT NULL DEFAULT 0 CHECK (recorded_attempts >= 0),
    filtered_clicks bigint NOT NULL DEFAULT 0
      CHECK (filtered_clicks >= 0 AND filtered_clicks <= recorded_attempts),
    synthetic_attempts bigint NOT NULL DEFAULT 0 CHECK (synthetic_attempts >= 0),
    PRIMARY KEY (link_id, day)
  );

  -- Events that are not counted: malformed, another schema, or outside the replay horizon. Kept
  -- with their bytes until an operator repairs and replays them; never dropped. One row per
  -- message and reason, so a redelivered message is kept once.
  CREATE TABLE click_quarantine (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 255),
    link_id uuid,
    reason text NOT NULL CHECK (reason ~ '^[a-z_]{1,40}$'),
    data bytea NOT NULL CHECK (octet_length(data) <= 65536),
    received_at timestamptz NOT NULL,
    repaired_at timestamptz,
    CONSTRAINT click_quarantine_once UNIQUE (message_id, reason)
  );

  -- The consumer's progress, one row: when it last committed, and how late that event was.
  CREATE TABLE click_pipeline (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    last_commit_at timestamptz NOT NULL,
    last_event_time timestamptz NOT NULL,
    last_lag_ms bigint NOT NULL CHECK (last_lag_ms >= 0)
  );

  INSERT INTO product_migrations (version, name)
  VALUES (1, 'click receipts, daily aggregates, quarantine, pipeline');
END
$step$;

-- One accepted event: true the first time its ID is seen, false for a duplicate (nothing counted
-- twice). Two copies taking the same ID at once: the second waits on the receipt's key and then
-- finds it.
CREATE OR REPLACE FUNCTION record_click(p_event_id uuid, p_link_id uuid, p_event_time timestamptz,
  p_synthetic boolean, p_bot boolean)
RETURNS boolean
LANGUAGE plpgsql VOLATILE
SET search_path = m_analytics_worker_click_aggregator, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_first boolean;
BEGIN
  INSERT INTO click_receipts (event_id, link_id, event_time, received_at)
  VALUES (p_event_id, p_link_id, p_event_time, v_now)
  ON CONFLICT (event_id) DO NOTHING;
  v_first := FOUND;
  IF v_first THEN
    INSERT INTO click_daily AS d (link_id, day, recorded_attempts, filtered_clicks, synthetic_attempts)
    VALUES (p_link_id, (p_event_time AT TIME ZONE 'UTC')::date,
            CASE WHEN p_synthetic THEN 0 ELSE 1 END,
            CASE WHEN p_synthetic OR p_bot THEN 0 ELSE 1 END,
            CASE WHEN p_synthetic THEN 1 ELSE 0 END)
    ON CONFLICT (link_id, day) DO UPDATE SET
      recorded_attempts = d.recorded_attempts + excluded.recorded_attempts,
      filtered_clicks = d.filtered_clicks + excluded.filtered_clicks,
      synthetic_attempts = d.synthetic_attempts + excluded.synthetic_attempts;
    INSERT INTO click_pipeline AS p (id, last_commit_at, last_event_time, last_lag_ms)
    VALUES (true, v_now, p_event_time,
            greatest(0, floor(extract(epoch FROM v_now - p_event_time) * 1000))::bigint)
    ON CONFLICT (id) DO UPDATE SET last_commit_at = excluded.last_commit_at,
      last_event_time = excluded.last_event_time, last_lag_ms = excluded.last_lag_ms;
  ELSE
    UPDATE click_pipeline SET last_commit_at = v_now;
  END IF;
  RETURN v_first;
END
$$;

-- An event that is not counted, kept once per message and reason.
CREATE OR REPLACE FUNCTION quarantine_click(p_message_id text, p_link_id uuid, p_reason text,
  p_data bytea)
RETURNS void
LANGUAGE sql VOLATILE
SET search_path = m_analytics_worker_click_aggregator, pg_temp
AS $$
  INSERT INTO click_quarantine (message_id, link_id, reason, data, received_at)
  VALUES (p_message_id, p_link_id, p_reason, p_data, clock_timestamp())
  ON CONFLICT ON CONSTRAINT click_quarantine_once DO NOTHING;
$$;

-- Bounded retention: at most p_limit receipts past the 35-day dedup horizon and p_limit aggregate
-- rows past 13 months, oldest first; returns how many rows went. The worker calls it once a
-- minute, so a missed run only leaves rows for the next one.
CREATE OR REPLACE FUNCTION purge_expired(p_limit integer)
RETURNS integer
LANGUAGE plpgsql VOLATILE
SET search_path = m_analytics_worker_click_aggregator, pg_temp
AS $$
DECLARE
  v_receipts integer;
  v_days integer;
BEGIN
  DELETE FROM click_receipts WHERE event_id IN (
    SELECT event_id FROM click_receipts
    WHERE event_time < clock_timestamp() - interval '35 days'
    ORDER BY event_time LIMIT p_limit FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS v_receipts = ROW_COUNT;
  DELETE FROM click_daily WHERE (link_id, day) IN (
    SELECT link_id, day FROM click_daily
    WHERE day < ((clock_timestamp() AT TIME ZONE 'UTC') - interval '13 months')::date
    ORDER BY day LIMIT p_limit FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS v_days = ROW_COUNT;
  RETURN v_receipts + v_days;
END
$$;

-- What Account API reads (Link analytics): counts per link and day, the consumer's progress, and
-- the open quarantine per link (a null link_id: an event that named no valid link).
CREATE OR REPLACE VIEW published.click_daily AS
SELECT link_id, day, recorded_attempts, filtered_clicks FROM click_daily;

CREATE OR REPLACE VIEW published.click_pipeline AS
SELECT last_commit_at, last_event_time, last_lag_ms FROM click_pipeline;

CREATE OR REPLACE VIEW published.click_quarantine_open AS
SELECT link_id, count(*) AS events, min(received_at) AS oldest
FROM click_quarantine WHERE repaired_at IS NULL GROUP BY link_id;
