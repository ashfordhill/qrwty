-- Abuse and moderation, a Custom, in Link API writes Links: its product tables and published views.
-- Write them here. Export never overwrites your edits: export afresh and carry them over.
-- first-run and start run this file every time, after the template migrations and views, as
-- the setup-only owner o_links of d_links, in one transaction with search_path m_link_api_abuse_and_moderation:
-- unqualified names land in schema m_link_api_abuse_and_moderation. Keep it re-runnable (IF NOT EXISTS, CREATE OR
-- REPLACE), with no BEGIN or COMMIT. A failure rolls the database back, and setup names this file.
--
-- Its own tables, in m_link_api_abuse_and_moderation: only r_links__link_api (Link API) selects, inserts, updates and deletes.
-- What others may read goes in views in published (CREATE OR REPLACE VIEW published.<name> AS ...),
-- which every login on this database may select:
--   r_links__account_api (Account API)
--   r_links__link_api (Link API)
--   r_links__redirect_service (Redirect service)
-- Template tables it may read, by qualified name:
--   none
-- Template views:
--   none

-- QRWTY Q09 (A6): abuse reports and operator moderation. The links themselves are Link
-- operations' (m_link_api_link_operations.links, whose file runs after this one): this file only
-- refers to them inside PL/pgSQL bodies, which are resolved when they run, never when created.
-- Two parts, both run on every start, as in Link operations' file:
--   1. The migration sequence: numbered steps, each applied once (product_migrations, this schema).
--   2. Functions, replaced every run. Each change is one function call, so one transaction.
-- Retention (decisions §3): reports and operator actions are kept 13 months, restricted to Link API
-- (no published view), and purged in bounded batches as new ones arrive. No row holds an IP
-- address: a reporter is the SHA-256 of Session API's keyed hash of its network.

CREATE TABLE IF NOT EXISTS product_migrations (
  version integer PRIMARY KEY CHECK (version >= 1),
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Step 1 (A6): reports, per-link report totals, operator actions.
DO $step$
BEGIN
  IF EXISTS (SELECT 1 FROM product_migrations WHERE version = 1) THEN
    RETURN;
  END IF;

  -- One row per link, reporter and reason (a repeat counts in `reports`); at most 200 rows per
  -- link, after which only the link's total grows.
  CREATE TABLE abuse_reports (
    link_id uuid NOT NULL,
    reporter_sha256 bytea NOT NULL CHECK (octet_length(reporter_sha256) = 32),
    reason text NOT NULL CHECK (reason IN ('phishing', 'malware', 'spam', 'other')),
    details text CHECK (details IS NULL OR char_length(details) BETWEEN 1 AND 1000),
    reports integer NOT NULL CHECK (reports >= 1),
    first_at timestamptz NOT NULL,
    last_at timestamptz NOT NULL,
    PRIMARY KEY (link_id, reporter_sha256, reason)
  );
  CREATE INDEX abuse_reports_last ON abuse_reports (last_at);

  CREATE TABLE link_report_totals (
    link_id uuid PRIMARY KEY,
    reports bigint NOT NULL CHECK (reports >= 1),
    first_at timestamptz NOT NULL,
    last_at timestamptz NOT NULL
  );
  CREATE INDEX link_report_totals_last ON link_report_totals (last_at);

  -- Every block and unblock: who (an operator account's subject or the CLI's actor), why, when,
  -- and the states before and after. A CLI request's nonce is recorded once (no replay).
  CREATE TABLE operator_actions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    link_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('block', 'unblock')),
    actor text NOT NULL CHECK (char_length(actor) BETWEEN 1 AND 255),
    reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
    from_state text NOT NULL CHECK (from_state IN ('active', 'disabled', 'blocked')),
    to_state text NOT NULL CHECK (to_state IN ('active', 'disabled', 'blocked')),
    request_id text UNIQUE CHECK (request_id IS NULL OR request_id ~ '^[A-Za-z0-9_-]{16,64}$'),
    at timestamptz NOT NULL
  );
  CREATE INDEX operator_actions_link ON operator_actions (link_id, at DESC, id DESC);
  CREATE INDEX operator_actions_at ON operator_actions (at);

  INSERT INTO product_migrations (version, name)
  VALUES (1, 'A6: abuse reports, report totals, operator actions');
END
$step$;

-- Deletes at most 100 rows of each table older than 13 months, skipping rows another writer holds.
CREATE OR REPLACE FUNCTION purge_abuse_data(p_now timestamptz) RETURNS void
LANGUAGE plpgsql VOLATILE
SET search_path = m_link_api_abuse_and_moderation, pg_temp
AS $$
DECLARE
  v_cut timestamptz := p_now - interval '13 months';
BEGIN
  DELETE FROM abuse_reports r WHERE r.ctid = ANY (ARRAY(
    SELECT x.ctid FROM abuse_reports x WHERE x.last_at < v_cut LIMIT 100 FOR UPDATE SKIP LOCKED));
  DELETE FROM link_report_totals t WHERE t.ctid = ANY (ARRAY(
    SELECT x.ctid FROM link_report_totals x WHERE x.last_at < v_cut LIMIT 100 FOR UPDATE SKIP LOCKED));
  DELETE FROM operator_actions a WHERE a.ctid = ANY (ARRAY(
    SELECT x.ctid FROM operator_actions x WHERE x.at < v_cut LIMIT 100 FOR UPDATE SKIP LOCKED));
END
$$;

-- A report of the link with this slug: true when it was counted, false when no link (or only a
-- deleted one) has the slug. Never changes the link.
CREATE OR REPLACE FUNCTION record_report(p_slug text, p_reason text, p_details text, p_reporter bytea)
RETURNS boolean
LANGUAGE plpgsql VOLATILE
SET search_path = m_link_api_abuse_and_moderation, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_link uuid;
  v_rows integer;
BEGIN
  PERFORM purge_abuse_data(v_now);
  SELECT l.id INTO v_link FROM m_link_api_link_operations.links l
  WHERE l.domain_id = 1 AND l.slug = p_slug AND l.state <> 'deleted';
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO link_report_totals AS t (link_id, reports, first_at, last_at)
  VALUES (v_link, 1, v_now, v_now)
  ON CONFLICT (link_id) DO UPDATE SET reports = t.reports + 1, last_at = excluded.last_at;
  UPDATE abuse_reports r SET reports = r.reports + 1, last_at = v_now,
    details = coalesce(p_details, r.details)
  WHERE r.link_id = v_link AND r.reporter_sha256 = p_reporter AND r.reason = p_reason;
  IF FOUND THEN
    RETURN true;
  END IF;
  SELECT count(*) INTO v_rows FROM abuse_reports r WHERE r.link_id = v_link;
  IF v_rows < 200 THEN
    INSERT INTO abuse_reports AS r (link_id, reporter_sha256, reason, details, reports, first_at, last_at)
    VALUES (v_link, p_reporter, p_reason, p_details, 1, v_now, v_now)
    ON CONFLICT (link_id, reporter_sha256, reason) DO UPDATE SET reports = r.reports + 1,
      last_at = excluded.last_at;
  END IF;
  RETURN true;
END
$$;

-- An operator's block or unblock, atomically: the link's state and version (and its version row,
-- by Link operations' trigger, actor `operator`) and the operator action. Outcomes: `changed`,
-- `unchanged` (already in that state; the action is still recorded), `unknown` (no such link),
-- `deleted` (a tombstone never changes) and `replayed` (this CLI nonce was used). An unblock
-- returns the link to its state before the block; a link whose owner was erased meanwhile becomes
-- disabled, never active (decisions §3).
CREATE OR REPLACE FUNCTION moderate_link(
  p_link_id uuid, p_action text, p_actor text, p_reason text, p_request_id text)
RETURNS TABLE (outcome text, id uuid, slug text, destination text, version integer, state text,
               created_at timestamptz, updated_at timestamptz, expires_at timestamptz, owned boolean)
LANGUAGE plpgsql VOLATILE
SET search_path = m_link_api_abuse_and_moderation, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_state text;
  v_owner bytea;
  v_to text;
  v_from text;
BEGIN
  IF p_action NOT IN ('block', 'unblock') THEN
    RAISE EXCEPTION 'unknown moderation action' USING ERRCODE = 'QRW20';
  END IF;
  IF p_request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM operator_actions a WHERE a.request_id = p_request_id) THEN
    outcome := 'replayed';
    RETURN NEXT;
    RETURN;
  END IF;
  SELECT l.state, l.owner_key INTO v_state, v_owner
  FROM m_link_api_link_operations.links l WHERE l.id = p_link_id FOR UPDATE;
  IF NOT FOUND THEN
    outcome := 'unknown';
    RETURN NEXT;
    RETURN;
  END IF;
  IF v_state = 'deleted' THEN
    outcome := 'deleted';
    RETURN NEXT;
    RETURN;
  END IF;
  IF p_action = 'block' THEN
    v_to := 'blocked';
  ELSIF v_state <> 'blocked' THEN
    v_to := v_state;
  ELSE
    SELECT a.from_state INTO v_from FROM operator_actions a
    WHERE a.link_id = p_link_id AND a.action = 'block' AND a.from_state <> 'blocked'
    ORDER BY a.at DESC, a.id DESC LIMIT 1;
    v_to := coalesce(v_from, 'active');
    IF v_to = 'active' AND v_owner IS NULL AND EXISTS (
      SELECT 1 FROM m_link_api_link_operations.link_versions v
      WHERE v.link_id = p_link_id AND v.change = 'owner-removed') THEN
      v_to := 'disabled';
    END IF;
  END IF;
  BEGIN
    IF v_to <> v_state THEN
      PERFORM set_config('qrwty.link_change', p_action, true);
      PERFORM set_config('qrwty.link_actor', 'operator', true);
      UPDATE m_link_api_link_operations.links l
      SET state = v_to, version = l.version + 1, updated_at = greatest(v_now, l.updated_at)
      WHERE l.id = p_link_id;
    END IF;
    INSERT INTO operator_actions (link_id, action, actor, reason, from_state, to_state, request_id, at)
    VALUES (p_link_id, p_action, p_actor, p_reason, v_state, v_to, p_request_id, v_now);
  EXCEPTION WHEN unique_violation THEN
    outcome := 'replayed';
    RETURN NEXT;
    RETURN;
  END;
  PERFORM purge_abuse_data(v_now);
  outcome := CASE WHEN v_to <> v_state THEN 'changed' ELSE 'unchanged' END;
  SELECT l.id, l.slug, l.destination, l.version, l.state, l.created_at, l.updated_at, l.expires_at,
         l.owner_key IS NOT NULL
  INTO id, slug, destination, version, state, created_at, updated_at, expires_at, owned
  FROM m_link_api_link_operations.links l WHERE l.id = p_link_id;
  RETURN NEXT;
END
$$;

-- What an operator sees of the link with this slug (deleted ones too): its fields, whether it has
-- an owner (never who), its report totals by reason and its last 10 operator actions.
CREATE OR REPLACE FUNCTION operator_link(p_slug text)
RETURNS TABLE (id uuid, slug text, destination text, version integer, state text,
               created_at timestamptz, updated_at timestamptz, expires_at timestamptz,
               owned boolean, reports bigint, last_report_at timestamptz, report_reasons jsonb,
               actions jsonb)
LANGUAGE plpgsql STABLE
SET search_path = m_link_api_abuse_and_moderation, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.slug, l.destination, l.version, l.state, l.created_at, l.updated_at, l.expires_at,
         l.owner_key IS NOT NULL, t.reports, t.last_at,
         (SELECT jsonb_object_agg(x.reason, x.n) FROM (
            SELECT r.reason, sum(r.reports)::bigint AS n FROM abuse_reports r
            WHERE r.link_id = l.id GROUP BY r.reason) x),
         (SELECT jsonb_agg(jsonb_build_object('action', a.action, 'actor', a.actor,
            'reason', a.reason, 'from', a.from_state, 'to', a.to_state,
            'at', to_char(a.at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
            ORDER BY a.at DESC, a.id DESC) FROM (
            SELECT * FROM operator_actions a2 WHERE a2.link_id = l.id
            ORDER BY a2.at DESC, a2.id DESC LIMIT 10) a)
  FROM m_link_api_link_operations.links l
  LEFT JOIN link_report_totals t ON t.link_id = l.id
  WHERE l.domain_id = 1 AND l.slug = p_slug;
END
$$;
