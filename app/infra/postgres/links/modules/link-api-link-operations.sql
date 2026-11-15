-- Link operations, a Custom, in Link API writes Links: its product tables and published views.
-- Write them here. Export never overwrites your edits: export afresh and carry them over.
-- first-run and start run this file every time, after the template migrations and views, as
-- the setup-only owner o_links of d_links, in one transaction with search_path m_link_api_link_operations:
-- unqualified names land in schema m_link_api_link_operations. Keep it re-runnable (IF NOT EXISTS, CREATE OR
-- REPLACE), with no BEGIN or COMMIT. A failure rolls the database back, and setup names this file.
--
-- Its own tables, in m_link_api_link_operations: only r_links__link_api (Link API) selects, inserts, updates and deletes.
-- What others may read goes in views in published (CREATE OR REPLACE VIEW published.<name> AS ...),
-- which every login on this database may select:
--   r_links__account_api (Account API)
--   r_links__link_api (Link API)
--   r_links__redirect_service (Redirect service)
-- Template tables it may read, by qualified name:
--   none
-- Template views:
--   none

-- QRWTY product schema (Q06). Two parts, both run on every start:
--   1. The migration sequence: numbered steps, each applied once and recorded in
--      product_migrations. An applied step is never edited; a change is a new step appended below
--      (expand first, contract in a later release). Steps hold the tables, which keep data.
--   2. Code that holds no data and is replaced every run: functions, triggers and the published
--      view. Each multi-row change is one function call, so one statement is one transaction
--      (Q03 G02: the generated client has no transaction API).
-- Invariants the database itself enforces: a slug is 10 base62 characters, never a reserved path,
-- unique per domain and never reused (a link row is never deleted; `deleted` is a permanent
-- tombstone); every change raises the version by exactly one and appends a version row; claim
-- proofs and idempotency records live in their own tables, which no published view exposes.

CREATE TABLE IF NOT EXISTS product_migrations (
  version integer PRIMARY KEY CHECK (version >= 1),
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Step 1 (Q06): domains, links, version history, claim proofs, idempotency records.
DO $step$
BEGIN
  IF EXISTS (SELECT 1 FROM product_migrations WHERE version = 1) THEN
    RETURN;
  END IF;

  CREATE TABLE domains (
    id smallint PRIMARY KEY CHECK (id >= 1),
    name text NOT NULL UNIQUE CHECK (name ~ '^[a-z][a-z0-9-]{0,62}$')
  );
  -- One domain in release 1: the deployment's public origin (configuration, not data).
  INSERT INTO domains (id, name) VALUES (1, 'primary');

  CREATE TABLE links (
    id uuid PRIMARY KEY,
    domain_id smallint NOT NULL REFERENCES domains (id),
    slug text NOT NULL CHECK (
      slug ~ '^[0-9A-Za-z]{10}$'
      AND lower(slug) <> ALL (ARRAY['api', 'auth', 'assets', 'static', 'app', 'account', 'pricing',
        'billing', 'login', 'logout', 'healthz', 'readyz', '.well-known', 'favicon.ico', 'robots.txt'])
    ),
    destination text NOT NULL CHECK (
      octet_length(destination) BETWEEN 10 AND 8192 AND destination ~ '^https?://[^/?#@[:space:]]+'
    ),
    owner_subject text CHECK (owner_subject IS NULL OR length(owner_subject) BETWEEN 1 AND 255),
    state text NOT NULL CHECK (state IN ('active', 'disabled', 'blocked', 'deleted')),
    version integer NOT NULL CHECK (version >= 1),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    expires_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT links_slug_unique UNIQUE (domain_id, slug),
    CONSTRAINT links_deleted_at CHECK ((state = 'deleted') = (deleted_at IS NOT NULL)),
    CONSTRAINT links_updated_after_created CHECK (updated_at >= created_at)
  );
  CREATE INDEX links_owner_created ON links (owner_subject, created_at DESC, id DESC)
    WHERE owner_subject IS NOT NULL;

  -- Append-only history: one row per version of each link, written by the links trigger.
  CREATE TABLE link_versions (
    link_id uuid NOT NULL REFERENCES links (id),
    version integer NOT NULL CHECK (version >= 1),
    state text NOT NULL CHECK (state IN ('active', 'disabled', 'blocked', 'deleted')),
    destination text NOT NULL,
    expires_at timestamptz,
    owned boolean NOT NULL,
    change text NOT NULL CHECK (change IN ('create', 'claim', 'update', 'disable', 'enable', 'block',
      'unblock', 'delete', 'owner-removed')),
    actor text NOT NULL CHECK (actor IN ('guest', 'owner', 'operator', 'system')),
    recorded_at timestamptz NOT NULL,
    PRIMARY KEY (link_id, version)
  );

  -- A guest link's claim proof: only the SHA-256 of the 256-bit secret, never the secret.
  CREATE TABLE link_claims (
    link_id uuid PRIMARY KEY REFERENCES links (id),
    proof_sha256 bytea NOT NULL UNIQUE CHECK (octet_length(proof_sha256) = 32),
    created_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    consumed_by text CHECK (consumed_by IS NULL OR length(consumed_by) BETWEEN 1 AND 255),
    CONSTRAINT link_claims_window CHECK (expires_at > created_at),
    CONSTRAINT link_claims_consumed CHECK ((consumed_at IS NULL) = (consumed_by IS NULL))
  );

  -- Scoped idempotency (24 hours): the scope and key are stored hashed. A replay that must carry
  -- the claim proof keeps it only sealed (AES-256-GCM with a rotated service key; the database
  -- never holds that key) and the record is deleted once its window ends.
  CREATE TABLE idempotency_records (
    scope_sha256 bytea NOT NULL CHECK (octet_length(scope_sha256) = 32),
    key_sha256 bytea NOT NULL CHECK (octet_length(key_sha256) = 32),
    operation text NOT NULL CHECK (operation IN ('create-link')),
    request_sha256 bytea NOT NULL CHECK (octet_length(request_sha256) = 32),
    response_status smallint NOT NULL CHECK (response_status BETWEEN 200 AND 299),
    response_body jsonb NOT NULL,
    sealed_secret bytea,
    link_id uuid REFERENCES links (id) DEFERRABLE INITIALLY DEFERRED,
    created_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (scope_sha256, key_sha256),
    CONSTRAINT idempotency_records_window CHECK (expires_at > created_at)
  );
  CREATE INDEX idempotency_records_expiry ON idempotency_records (expires_at);

  INSERT INTO product_migrations (version, name)
  VALUES (1, 'Q06: links, versions, claim proofs, idempotency records');
END
$step$;

-- Code (replaced every run). Every function sets its search path, so a caller's path is ignored.

-- The database clock, moved by the test profile's clock offset only (production passes 0).
CREATE OR REPLACE FUNCTION clock_now(p_offset_ms bigint) RETURNS timestamptz
LANGUAGE sql STABLE
SET search_path = m_link_api_link_operations, pg_temp
AS $$ SELECT now() + make_interval(secs => coalesce(p_offset_ms, 0) / 1000.0) $$;

-- RFC 3339 in UTC with milliseconds, the HTTP contract's timestamp form.
CREATE OR REPLACE FUNCTION rfc3339(p_at timestamptz) RETURNS text
LANGUAGE sql STABLE
SET search_path = m_link_api_link_operations, pg_temp
AS $$ SELECT to_char(p_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

-- Links are tombstoned, never deleted; identity columns never change; a deleted link never
-- changes again; every change raises the version by exactly one.
CREATE OR REPLACE FUNCTION links_guard() RETURNS trigger
LANGUAGE plpgsql
SET search_path = m_link_api_link_operations, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a link is a permanent tombstone: set its state to deleted' USING ERRCODE = 'QRW10';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.version <> 1 THEN
      RAISE EXCEPTION 'a new link starts at version 1' USING ERRCODE = 'QRW11';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.id <> OLD.id OR NEW.domain_id <> OLD.domain_id OR NEW.slug <> OLD.slug
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'a link''s id, domain, slug and creation time never change' USING ERRCODE = 'QRW12';
  END IF;
  IF OLD.state = 'deleted' THEN
    RAISE EXCEPTION 'a deleted link is a permanent tombstone' USING ERRCODE = 'QRW13';
  END IF;
  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'every change raises the version by one' USING ERRCODE = 'QRW14';
  END IF;
  RETURN NEW;
END
$$;

-- One version row per link version, in the same transaction as the change. The writer names the
-- change and the actor with set_config('qrwty.link_change' | 'qrwty.link_actor', ..., true).
CREATE OR REPLACE FUNCTION links_history() RETURNS trigger
LANGUAGE plpgsql
SET search_path = m_link_api_link_operations, pg_temp
AS $$
BEGIN
  INSERT INTO link_versions (link_id, version, state, destination, expires_at, owned, change, actor,
                             recorded_at)
  VALUES (NEW.id, NEW.version, NEW.state, NEW.destination, NEW.expires_at,
          NEW.owner_subject IS NOT NULL,
          coalesce(nullif(current_setting('qrwty.link_change', true), ''), 'update'),
          coalesce(nullif(current_setting('qrwty.link_actor', true), ''), 'system'),
          NEW.updated_at);
  RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION refuse_change() RETURNS trigger
LANGUAGE plpgsql
SET search_path = m_link_api_link_operations, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only or permanent', TG_TABLE_NAME USING ERRCODE = 'QRW15';
END
$$;

CREATE OR REPLACE TRIGGER links_guard BEFORE INSERT OR UPDATE OR DELETE ON links
  FOR EACH ROW EXECUTE FUNCTION links_guard();
CREATE OR REPLACE TRIGGER links_history AFTER INSERT OR UPDATE ON links
  FOR EACH ROW EXECUTE FUNCTION links_history();
CREATE OR REPLACE TRIGGER links_no_truncate BEFORE TRUNCATE ON links
  FOR EACH STATEMENT EXECUTE FUNCTION refuse_change();
CREATE OR REPLACE TRIGGER link_versions_append_only BEFORE UPDATE OR DELETE ON link_versions
  FOR EACH ROW EXECUTE FUNCTION refuse_change();
CREATE OR REPLACE TRIGGER link_versions_no_truncate BEFORE TRUNCATE ON link_versions
  FOR EACH STATEMENT EXECUTE FUNCTION refuse_change();

-- An unexpired idempotency record of this scope and key, for a replay before any other work.
CREATE OR REPLACE FUNCTION find_idempotent(p_scope bytea, p_key bytea, p_clock_offset_ms bigint)
RETURNS TABLE (request_sha256 bytea, status smallint, body jsonb, sealed bytea)
LANGUAGE sql STABLE
SET search_path = m_link_api_link_operations, pg_temp
AS $$
  SELECT r.request_sha256, r.response_status, r.response_body, r.sealed_secret
  FROM idempotency_records r
  WHERE r.scope_sha256 = p_scope AND r.key_sha256 = p_key
    AND r.expires_at > clock_now(p_clock_offset_ms)
$$;

-- Guest create, atomically: the idempotency record, the link (version 1 and its version row) and
-- the claim proof's hash, or nothing. The idempotency record is written first, so a concurrent
-- request with the same scope and key waits on it and then replays it (or gets `conflict` for a
-- different request). A taken slug rolls everything back (`collision`): the caller retries with a
-- new slug, within its bound. `invalid-expiry`: expiresAt is not after the database clock.
-- `retry`: the record that conflicted was gone when read (its window ended meanwhile).
CREATE OR REPLACE FUNCTION create_guest_link(
  p_scope bytea, p_key bytea, p_request bytea, p_link_id uuid, p_slug text, p_destination text,
  p_expires_at timestamptz, p_short_url text, p_proof_sha256 bytea, p_sealed bytea,
  p_clock_offset_ms bigint)
RETURNS TABLE (outcome text, status smallint, body jsonb, sealed bytea)
LANGUAGE plpgsql VOLATILE
SET search_path = m_link_api_link_operations, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_now(p_clock_offset_ms);
  v_claim_expires timestamptz := v_now + interval '24 hours';
  v_body jsonb;
  v_found record;
BEGIN
  -- This key's window is over: the key may be used afresh. Then a bounded share of other expired
  -- records (skipping any another writer holds), so the table stays bounded without a scheduler.
  DELETE FROM idempotency_records r
  WHERE r.scope_sha256 = p_scope AND r.key_sha256 = p_key AND r.expires_at <= v_now;
  DELETE FROM idempotency_records r
  WHERE r.ctid = ANY (ARRAY(
    SELECT x.ctid FROM idempotency_records x
    WHERE x.expires_at <= v_now
    LIMIT 16 FOR UPDATE SKIP LOCKED));

  v_body := jsonb_build_object(
    'id', p_link_id,
    'shortUrl', p_short_url,
    'destination', p_destination,
    'version', 1,
    'state', 'active',
    'createdAt', rfc3339(v_now),
    'updatedAt', rfc3339(v_now),
    'expiresAt', CASE WHEN p_expires_at IS NULL THEN NULL ELSE rfc3339(p_expires_at) END,
    'owned', false,
    'claim', jsonb_build_object('expiresAt', rfc3339(v_claim_expires)));

  BEGIN
    INSERT INTO idempotency_records (scope_sha256, key_sha256, operation, request_sha256,
      response_status, response_body, sealed_secret, link_id, created_at, expires_at)
    VALUES (p_scope, p_key, 'create-link', p_request, 201, v_body, p_sealed, p_link_id, v_now,
      v_now + interval '24 hours')
    ON CONFLICT (scope_sha256, key_sha256) DO NOTHING;
    IF NOT FOUND THEN
      SELECT r.request_sha256, r.response_status, r.response_body, r.sealed_secret INTO v_found
      FROM idempotency_records r
      WHERE r.scope_sha256 = p_scope AND r.key_sha256 = p_key AND r.expires_at > v_now;
      IF NOT FOUND THEN
        outcome := 'retry';
      ELSIF v_found.request_sha256 <> p_request THEN
        outcome := 'conflict';
      ELSE
        outcome := 'replay';
        status := v_found.response_status;
        body := v_found.response_body;
        sealed := v_found.sealed_secret;
      END IF;
      RETURN NEXT;
      RETURN;
    END IF;

    IF p_expires_at IS NOT NULL AND p_expires_at <= v_now THEN
      RAISE EXCEPTION 'expiresAt is not in the future' USING ERRCODE = 'QRW02';
    END IF;

    PERFORM set_config('qrwty.link_change', 'create', true);
    PERFORM set_config('qrwty.link_actor', 'guest', true);
    INSERT INTO links (id, domain_id, slug, destination, owner_subject, state, version, created_at,
      updated_at, expires_at)
    VALUES (p_link_id, 1, p_slug, p_destination, NULL, 'active', 1, v_now, v_now, p_expires_at)
    ON CONFLICT ON CONSTRAINT links_slug_unique DO NOTHING;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'slug taken' USING ERRCODE = 'QRW01';
    END IF;
    INSERT INTO link_claims (link_id, proof_sha256, created_at, expires_at)
    VALUES (p_link_id, p_proof_sha256, v_now, v_claim_expires);

    outcome := 'created';
    status := 201;
    body := v_body;
    sealed := p_sealed;
    RETURN NEXT;
    RETURN;
  EXCEPTION
    WHEN SQLSTATE 'QRW01' THEN
      outcome := 'collision';
      RETURN NEXT;
      RETURN;
    WHEN SQLSTATE 'QRW02' THEN
      outcome := 'invalid-expiry';
      RETURN NEXT;
      RETURN;
  END;
END
$$;

-- The routing view (least privilege): what the Redirect service needs to answer a slug, and
-- nothing else. No owner, claim or idempotency data; a destination only while the link is active.
CREATE OR REPLACE VIEW published.link_routes AS
SELECT l.domain_id, l.slug, l.id AS link_id, l.state, l.version, l.expires_at,
       CASE WHEN l.state = 'active' THEN l.destination END AS destination
FROM links l;
