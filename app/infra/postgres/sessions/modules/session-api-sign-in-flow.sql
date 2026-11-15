-- Sign-in flow, a Custom, in Session API writes Sessions: its product tables and published views.
-- Write them here. Export never overwrites your edits: export afresh and carry them over.
-- first-run and start run this file every time, after the template migrations and views, as
-- the setup-only owner o_sessions of d_sessions, in one transaction with search_path m_session_api_sign_in_flow:
-- unqualified names land in schema m_session_api_sign_in_flow. Keep it re-runnable (IF NOT EXISTS, CREATE OR
-- REPLACE), with no BEGIN or COMMIT. A failure rolls the database back, and setup names this file.
--
-- Its own tables, in m_session_api_sign_in_flow: only r_sessions__session_api (Session API) selects, inserts, updates and deletes.
-- What others may read goes in views in published (CREATE OR REPLACE VIEW published.<name> AS ...),
-- which every login on this database may select:
--   r_sessions__session_api (Session API)
-- Template tables it may read, by qualified name:
--   none
-- Template views:
--   none

-- QRWTY sessions (A3, Q07). Session API's two stubs share these tables: both run as Session API's
-- login, which uses both module schemas; API forwarding calls these functions by their qualified
-- names. Like the Links SQL: numbered steps (applied once, recorded in product_migrations) hold
-- the tables; functions are replaced every run, each multi-row change one call.
--   login_attempts: one per /auth/login, for 10 minutes: the hashes of its state, its browser
--     binding cookie and its nonce, and the PKCE verifier sealed with SESSION_KEYS; taken (deleted)
--     once by the callback.
--   sessions: one per signed-in browser, named by the SHA-256 of its cookie token. tokens_sealed
--     holds the access and refresh tokens and the profile, sealed (AES-256-GCM, SESSION_KEYS),
--     never plaintext; revocation empties it. subject_key (SHA-256 of "account" NUL subject) finds
--     an account's sessions. Guests have no row (cookies.ts).

CREATE TABLE IF NOT EXISTS product_migrations (
  version integer PRIMARY KEY CHECK (version >= 1),
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

DO $step$
BEGIN
  IF EXISTS (SELECT 1 FROM product_migrations WHERE version = 1) THEN
    RETURN;
  END IF;

  CREATE TABLE login_attempts (
    state_sha256 bytea PRIMARY KEY CHECK (octet_length(state_sha256) = 32),
    binding_sha256 bytea NOT NULL CHECK (octet_length(binding_sha256) = 32),
    nonce_sha256 bytea NOT NULL CHECK (octet_length(nonce_sha256) = 32),
    verifier_sealed bytea NOT NULL,
    return_to text NOT NULL CHECK (length(return_to) BETWEEN 1 AND 512),
    created_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
  );
  CREATE INDEX login_attempts_expiry ON login_attempts (expires_at);

  CREATE TABLE sessions (
    id_sha256 bytea PRIMARY KEY CHECK (octet_length(id_sha256) = 32),
    subject_key bytea NOT NULL CHECK (octet_length(subject_key) = 32),
    tokens_sealed bytea NOT NULL,
    token_generation integer NOT NULL CHECK (token_generation >= 1),
    access_expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    last_seen_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
    revoked_at timestamptz,
    CONSTRAINT sessions_revoked_empty CHECK (revoked_at IS NULL OR octet_length(tokens_sealed) = 0)
  );
  CREATE INDEX sessions_subject ON sessions (subject_key);
  CREATE INDEX sessions_expiry ON sessions (expires_at);

  INSERT INTO product_migrations (version, name) VALUES (1, 'A3: login attempts and sessions');
END
$step$;

-- A sign-in starts: its attempt, for 10 minutes; then up to 16 ended attempts are removed, so the
-- table stays bounded without a scheduler.
CREATE OR REPLACE FUNCTION begin_login(p_state bytea, p_binding bytea, p_nonce bytea,
  p_verifier_sealed bytea, p_return_to text)
RETURNS void
LANGUAGE plpgsql VOLATILE
SET search_path = m_session_api_sign_in_flow, pg_temp
AS $$
BEGIN
  INSERT INTO login_attempts (state_sha256, binding_sha256, nonce_sha256, verifier_sealed,
    return_to, created_at, expires_at)
  VALUES (p_state, p_binding, p_nonce, p_verifier_sealed, p_return_to, now(),
    now() + interval '10 minutes');
  DELETE FROM login_attempts a WHERE a.ctid = ANY (ARRAY(
    SELECT x.ctid FROM login_attempts x WHERE x.expires_at <= now()
    LIMIT 16 FOR UPDATE SKIP LOCKED));
END
$$;

-- The callback takes its attempt once: deleted and returned while unexpired, else nothing.
CREATE OR REPLACE FUNCTION take_login(p_state bytea)
RETURNS TABLE (binding_sha256 bytea, nonce_sha256 bytea, verifier_sealed bytea, return_to text,
               live boolean)
LANGUAGE sql VOLATILE
SET search_path = m_session_api_sign_in_flow, pg_temp
AS $$
  DELETE FROM login_attempts a WHERE a.state_sha256 = p_state
  RETURNING a.binding_sha256, a.nonce_sha256, a.verifier_sealed, a.return_to, a.expires_at > now()
$$;

-- A signed-in session: created with its sealed tokens; a session the browser held before (the
-- guest's has no row; an account's is revoked) never continues, so a fixed cookie can't be
-- upgraded. Up to 16 sessions ended over a day ago are removed.
CREATE OR REPLACE FUNCTION create_session(p_id bytea, p_subject_key bytea, p_tokens bytea,
  p_access_expires_at timestamptz, p_absolute_seconds integer, p_previous bytea)
RETURNS void
LANGUAGE plpgsql VOLATILE
SET search_path = m_session_api_sign_in_flow, pg_temp
AS $$
BEGIN
  IF p_previous IS NOT NULL THEN
    UPDATE sessions s SET revoked_at = now(), tokens_sealed = '\x'::bytea
    WHERE s.id_sha256 = p_previous AND s.revoked_at IS NULL;
  END IF;
  INSERT INTO sessions (id_sha256, subject_key, tokens_sealed, token_generation, access_expires_at,
    created_at, last_seen_at, expires_at)
  VALUES (p_id, p_subject_key, p_tokens, 1, p_access_expires_at, now(), now(),
    now() + make_interval(secs => p_absolute_seconds));
  DELETE FROM sessions s WHERE s.ctid = ANY (ARRAY(
    SELECT x.ctid FROM sessions x
    WHERE coalesce(least(x.revoked_at, x.expires_at), x.expires_at) <= now() - interval '1 day'
    LIMIT 16 FOR UPDATE SKIP LOCKED));
END
$$;

-- A session by its cookie: `active` (and its last use moves to now when over a minute old),
-- `expired` (absolute or idle limit passed; it is revoked now), `revoked` or `unknown`.
CREATE OR REPLACE FUNCTION use_session(p_id bytea, p_idle_seconds integer)
RETURNS TABLE (status text, subject_key bytea, tokens_sealed bytea, token_generation integer,
               access_expires_at timestamptz)
LANGUAGE plpgsql VOLATILE
SET search_path = m_session_api_sign_in_flow, pg_temp
AS $$
DECLARE
  v sessions%ROWTYPE;
BEGIN
  SELECT s.* INTO v FROM sessions s WHERE s.id_sha256 = p_id;
  IF NOT FOUND THEN
    status := 'unknown';
  ELSIF v.revoked_at IS NOT NULL THEN
    status := 'revoked';
  ELSIF v.expires_at <= now() OR v.last_seen_at + make_interval(secs => p_idle_seconds) <= now() THEN
    UPDATE sessions s SET revoked_at = now(), tokens_sealed = '\x'::bytea
    WHERE s.id_sha256 = p_id AND s.revoked_at IS NULL;
    status := 'expired';
  ELSE
    IF v.last_seen_at < now() - interval '1 minute' THEN
      UPDATE sessions s SET last_seen_at = now() WHERE s.id_sha256 = p_id;
    END IF;
    status := 'active';
    subject_key := v.subject_key;
    tokens_sealed := v.tokens_sealed;
    token_generation := v.token_generation;
    access_expires_at := v.access_expires_at;
  END IF;
  RETURN NEXT;
END
$$;

-- Refreshed tokens replace the sealed ones only if no other replica refreshed first (the
-- generation it read); `stored` false means re-read the session and use the winner's tokens.
CREATE OR REPLACE FUNCTION store_tokens(p_id bytea, p_generation integer, p_tokens bytea,
  p_access_expires_at timestamptz)
RETURNS boolean
LANGUAGE sql VOLATILE
SET search_path = m_session_api_sign_in_flow, pg_temp
AS $$
  WITH updated AS (
    UPDATE sessions s SET tokens_sealed = p_tokens, access_expires_at = p_access_expires_at,
      token_generation = s.token_generation + 1
    WHERE s.id_sha256 = p_id AND s.token_generation = p_generation AND s.revoked_at IS NULL
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM updated)
$$;

-- Sign-out: this session ends and its tokens are gone. Its former sealed tokens are returned once,
-- so the caller can revoke the refresh token at the issuer.
CREATE OR REPLACE FUNCTION revoke_session(p_id bytea)
RETURNS TABLE (tokens_sealed bytea)
LANGUAGE sql VOLATILE
SET search_path = m_session_api_sign_in_flow, pg_temp
AS $$
  WITH old AS (SELECT s.id_sha256, s.tokens_sealed FROM sessions s
               WHERE s.id_sha256 = p_id AND s.revoked_at IS NULL FOR UPDATE)
  UPDATE sessions s SET revoked_at = now(), tokens_sealed = '\x'::bytea
  FROM old WHERE s.id_sha256 = old.id_sha256
  RETURNING old.tokens_sealed
$$;

-- Account deletion: every session of the account ends; their former sealed tokens are returned.
CREATE OR REPLACE FUNCTION revoke_account(p_subject_key bytea)
RETURNS TABLE (id_sha256 bytea, tokens_sealed bytea)
LANGUAGE sql VOLATILE
SET search_path = m_session_api_sign_in_flow, pg_temp
AS $$
  WITH old AS (SELECT s.id_sha256, s.tokens_sealed FROM sessions s
               WHERE s.subject_key = p_subject_key AND s.revoked_at IS NULL FOR UPDATE)
  UPDATE sessions s SET revoked_at = now(), tokens_sealed = '\x'::bytea
  FROM old WHERE s.id_sha256 = old.id_sha256
  RETURNING old.id_sha256, old.tokens_sealed
$$;
