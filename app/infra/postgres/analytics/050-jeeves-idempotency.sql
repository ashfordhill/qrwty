-- Jeeves-owned: the idempotency records of the stubs that write this database (QL04).
CREATE SCHEMA IF NOT EXISTS jeeves;
REVOKE ALL ON SCHEMA jeeves FROM PUBLIC;
CREATE TABLE IF NOT EXISTS jeeves.idempotency_records (tile text NOT NULL, scope_kind text NOT NULL, scope_id text NOT NULL, idem_key text NOT NULL, request_hash bytea NOT NULL, status integer NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, PRIMARY KEY (tile, scope_kind, scope_id, idem_key));
CREATE INDEX IF NOT EXISTS idempotency_records_expires ON jeeves.idempotency_records (expires_at);
