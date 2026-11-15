-- Customer billing, a Custom, in Billing API writes Billing: its product tables and published views.
-- Write them here. Export never overwrites your edits: export afresh and carry them over.
-- first-run and start run this file every time, after the template migrations and views, as
-- the setup-only owner o_billing of d_billing, in one transaction with search_path m_billing_api_customer_billing:
-- unqualified names land in schema m_billing_api_customer_billing. Keep it re-runnable (IF NOT EXISTS, CREATE OR
-- REPLACE), with no BEGIN or COMMIT. A failure rolls the database back, and setup names this file.
--
-- Its own tables, in m_billing_api_customer_billing: only r_billing__billing_api (Billing API) selects, inserts, updates and deletes.
-- What others may read goes in views in published (CREATE OR REPLACE VIEW published.<name> AS ...),
-- which every login on this database may select:
--   r_billing__billing_api (Billing API)
-- Template tables it may read, by qualified name:
--   none
-- Template views:
--   none

-- QRWTY billing (A7: Q10a and Q10b). Every Billing API table lives here, in one schema, so its three
-- modules share one restricted store with one logical writer (billing contract): the account to
-- customer mapping, the subscription state and its entitlement revision, the lease that fences
-- reconciliation, the webhook inbox and the CSV export allowance. Payment events and Entitlements
-- use these by qualified name (m_billing_api_customer_billing.<name>) through Billing API's login.
-- Two parts, both run on every start: the migration steps (each applied once, recorded in
-- product_migrations, never edited), then code that holds no data (functions), replaced each run.
-- No card data, no email and no Auth0 subject: an account is the same 32-byte owner key Link API
-- uses (a hash of the verified subject).

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

  -- One row per account that has opened billing. customer_id is set once, by the server, and
  -- never reassigned (unique; no public request names it). The subscription fields are the last
  -- canonical state read from Stripe under the lease below; revision rises with every change.
  CREATE TABLE accounts (
    account_key bytea PRIMARY KEY CHECK (octet_length(account_key) = 32),
    customer_id text UNIQUE CHECK (customer_id ~ '^cus_[A-Za-z0-9]{1,250}$'),
    status text NOT NULL DEFAULT 'none'
      CHECK (status IN ('none', 'incomplete', 'active', 'past_due', 'canceled', 'expired')),
    subscription_id text CHECK (subscription_id ~ '^sub_[A-Za-z0-9]{1,250}$'),
    price_id text CHECK (price_id ~ '^price_[A-Za-z0-9_]{1,250}$'),
    paid_through timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    first_failure_at timestamptz,
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    confirmed_by text CHECK (confirmed_by IN ('webhook', 'reconciliation')),
    synced_at timestamptz,
    -- The open Checkout session, reused until it expires or completes, so repeated clicks never
    -- open a second one; attempt numbers its Stripe idempotency key.
    checkout_attempt integer NOT NULL DEFAULT 0 CHECK (checkout_attempt >= 0),
    checkout_session_id text CHECK (checkout_session_id ~ '^cs_[A-Za-z0-9_]{1,250}$'),
    checkout_url text CHECK (checkout_url ~ '^https://'),
    checkout_expires_at timestamptz,
    checkout_completed_at timestamptz,
    checkout_returned_at timestamptz,
    -- Reconciliation's lease: one holder at a time; fence rises with every lease, and a result is
    -- applied only by the holder of the current fence before its lease ends.
    lease_token uuid,
    lease_until timestamptz,
    fence bigint NOT NULL DEFAULT 0 CHECK (fence >= 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
  );

  -- Verified Stripe events, unique by event ID, inserted before the webhook answers 2xx. Pending
  -- items are leased by a worker and retried with a bounded backoff; after the last attempt an
  -- item stays `failed` for repair. Done and ignored items are kept 35 days (decisions §3).
  CREATE TABLE webhook_inbox (
    event_id text PRIMARY KEY CHECK (event_id ~ '^evt_[A-Za-z0-9_]{1,250}$'),
    event_type text NOT NULL CHECK (event_type ~ '^[a-z0-9_.]{1,100}$'),
    event_created timestamptz NOT NULL,
    customer_id text,
    payload jsonb NOT NULL,
    state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'done', 'ignored', 'failed')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at timestamptz NOT NULL,
    lease_token uuid,
    lease_until timestamptz,
    last_error text CHECK (length(last_error) <= 200),
    received_at timestamptz NOT NULL,
    processed_at timestamptz
  );
  CREATE INDEX webhook_inbox_due ON webhook_inbox (next_attempt_at) WHERE state = 'pending';
  CREATE INDEX webhook_inbox_customer ON webhook_inbox (customer_id, next_attempt_at)
    WHERE state = 'pending';
  CREATE INDEX webhook_inbox_processed ON webhook_inbox (processed_at)
    WHERE state IN ('done', 'ignored');

  -- CSV exports per account and UTC month (decisions §4): spent atomically, never refunded.
  CREATE TABLE export_usage (
    account_key bytea NOT NULL CHECK (octet_length(account_key) = 32),
    period_start date NOT NULL,
    used integer NOT NULL CHECK (used >= 0),
    PRIMARY KEY (account_key, period_start)
  );

  INSERT INTO product_migrations (version, name)
  VALUES (1, 'A7: accounts, subscription state, leases, webhook inbox, export usage');
END
$step$;

-- Takes the account's reconciliation lease for p_ms when nobody holds an unexpired one: the new
-- fence, or no row. Creates the account row when there is none.
CREATE OR REPLACE FUNCTION take_lease(p_account bytea, p_token uuid, p_ms integer)
RETURNS TABLE (fence bigint, customer_id text, first_failure_at timestamptz)
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
BEGIN
  INSERT INTO accounts (account_key) VALUES (p_account) ON CONFLICT (account_key) DO NOTHING;
  RETURN QUERY
  UPDATE accounts a SET lease_token = p_token,
    lease_until = clock_timestamp() + make_interval(secs => p_ms / 1000.0),
    fence = a.fence + 1
  WHERE a.account_key = p_account AND (a.lease_until IS NULL OR a.lease_until < clock_timestamp())
  RETURNING a.fence, a.customer_id, a.first_failure_at;
END
$$;

CREATE OR REPLACE FUNCTION release_lease(p_account bytea, p_token uuid)
RETURNS void
LANGUAGE sql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
  UPDATE accounts SET lease_token = NULL, lease_until = NULL
  WHERE account_key = p_account AND lease_token = p_token;
$$;

-- Applies canonical provider state read under the lease: only by the holder of the current fence
-- while its lease lasts, so a late or expired worker can never overwrite a newer result. Raises
-- the revision when anything an entitlement depends on changed; records who confirmed a newly
-- active subscription; releases the lease. `applied`, and the revision after it.
CREATE OR REPLACE FUNCTION apply_subscription(
  p_account bytea, p_token uuid, p_fence bigint, p_status text, p_subscription text, p_price text,
  p_paid_through timestamptz, p_cancel boolean, p_first_failure timestamptz, p_source text)
RETURNS TABLE (applied boolean, revision bigint)
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
DECLARE
  v accounts%ROWTYPE;
  v_changed boolean;
BEGIN
  SELECT * INTO v FROM accounts WHERE account_key = p_account FOR UPDATE;
  IF NOT FOUND OR v.lease_token IS DISTINCT FROM p_token OR v.fence <> p_fence
     OR v.lease_until IS NULL OR v.lease_until < clock_timestamp() THEN
    applied := false;
    revision := coalesce(v.revision, 0);
    RETURN NEXT;
    RETURN;
  END IF;
  v_changed := v.status IS DISTINCT FROM p_status
    OR v.subscription_id IS DISTINCT FROM p_subscription
    OR v.price_id IS DISTINCT FROM p_price
    OR v.paid_through IS DISTINCT FROM p_paid_through
    OR v.cancel_at_period_end IS DISTINCT FROM p_cancel
    OR v.first_failure_at IS DISTINCT FROM p_first_failure;
  UPDATE accounts a SET
    status = p_status,
    subscription_id = p_subscription,
    price_id = p_price,
    paid_through = p_paid_through,
    cancel_at_period_end = p_cancel,
    first_failure_at = p_first_failure,
    revision = a.revision + CASE WHEN v_changed THEN 1 ELSE 0 END,
    confirmed_by = CASE WHEN p_status IN ('active', 'past_due') AND v.status NOT IN ('active', 'past_due')
                        THEN p_source
                        WHEN p_status IN ('active', 'past_due') THEN a.confirmed_by
                        ELSE NULL END,
    checkout_completed_at = CASE WHEN p_status IN ('active', 'past_due')
                                 THEN coalesce(a.checkout_completed_at, clock_timestamp())
                                 ELSE a.checkout_completed_at END,
    synced_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    lease_token = NULL,
    lease_until = NULL
  WHERE a.account_key = p_account
  RETURNING a.revision INTO revision;
  applied := true;
  RETURN NEXT;
END
$$;

-- Stores a verified event once: `inserted` true for the first delivery, false for a duplicate.
CREATE OR REPLACE FUNCTION inbox_insert(p_event text, p_type text, p_created timestamptz,
  p_customer text, p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
BEGIN
  INSERT INTO webhook_inbox (event_id, event_type, event_created, customer_id, payload,
    next_attempt_at, received_at)
  VALUES (p_event, p_type, p_created, p_customer, p_payload, clock_timestamp(), clock_timestamp())
  ON CONFLICT (event_id) DO NOTHING;
  RETURN FOUND;
END
$$;

-- Leases up to p_limit due items (of one customer, or any) for p_ms; each lease is one attempt.
CREATE OR REPLACE FUNCTION inbox_lease(p_token uuid, p_ms integer, p_limit integer, p_customer text)
RETURNS TABLE (event_id text, event_type text, event_created timestamptz, customer_id text,
               attempts integer, payload jsonb)
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE webhook_inbox w SET lease_token = p_token,
    lease_until = clock_timestamp() + make_interval(secs => p_ms / 1000.0),
    attempts = w.attempts + 1
  WHERE w.event_id IN (
    SELECT i.event_id FROM webhook_inbox i
    WHERE i.state = 'pending' AND i.next_attempt_at <= clock_timestamp()
      AND (i.lease_until IS NULL OR i.lease_until < clock_timestamp())
      AND (p_customer IS NULL OR i.customer_id = p_customer)
    ORDER BY i.next_attempt_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED)
  RETURNING w.event_id, w.event_type, w.event_created, w.customer_id, w.attempts, w.payload;
END
$$;

-- Finishes a leased item (`done` or `ignored`), only for the lease holder.
CREATE OR REPLACE FUNCTION inbox_finish(p_event text, p_token uuid, p_state text, p_note text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
BEGIN
  UPDATE webhook_inbox SET state = p_state, processed_at = clock_timestamp(),
    lease_token = NULL, lease_until = NULL, last_error = left(p_note, 200)
  WHERE event_id = p_event AND lease_token = p_token AND state = 'pending';
  RETURN FOUND;
END
$$;

-- A leased item failed: retried after 2^attempts seconds (at most an hour), or kept `failed` for
-- repair after p_max attempts. Only the lease holder can do either.
CREATE OR REPLACE FUNCTION inbox_retry(p_event text, p_token uuid, p_error text, p_max integer)
RETURNS text
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
DECLARE
  v_state text;
BEGIN
  UPDATE webhook_inbox w SET
    state = CASE WHEN w.attempts >= p_max THEN 'failed' ELSE 'pending' END,
    next_attempt_at = clock_timestamp() + make_interval(secs => least(3600, power(2, w.attempts))),
    lease_token = NULL, lease_until = NULL, last_error = left(p_error, 200)
  WHERE w.event_id = p_event AND w.lease_token = p_token AND w.state = 'pending'
  RETURNING w.state INTO v_state;
  RETURN v_state;
END
$$;

-- Removes processed items older than 35 days, at most p_limit a call.
CREATE OR REPLACE FUNCTION inbox_purge(p_limit integer)
RETURNS integer
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM webhook_inbox WHERE event_id IN (
    SELECT event_id FROM webhook_inbox
    WHERE state IN ('done', 'ignored') AND processed_at < clock_timestamp() - interval '35 days'
    LIMIT p_limit);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;

-- Spends one CSV export of the account's UTC month when fewer than p_limit are spent; the row is
-- locked until the statement ends, so two exports never both take the last one.
CREATE OR REPLACE FUNCTION spend_export(p_account bytea, p_limit integer)
RETURNS TABLE (allowed boolean, used integer, period_end timestamptz)
LANGUAGE plpgsql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
DECLARE
  v_period date := date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC')::date;
BEGIN
  period_end := (v_period + interval '1 month')::timestamp AT TIME ZONE 'UTC';
  INSERT INTO export_usage (account_key, period_start, used) VALUES (p_account, v_period, 0)
  ON CONFLICT (account_key, period_start) DO NOTHING;
  UPDATE export_usage u SET used = u.used + 1
  WHERE u.account_key = p_account AND u.period_start = v_period AND u.used < p_limit
  RETURNING u.used INTO used;
  allowed := FOUND;
  IF NOT allowed THEN
    SELECT u.used INTO used FROM export_usage u
    WHERE u.account_key = p_account AND u.period_start = v_period;
  END IF;
  RETURN NEXT;
END
$$;

-- Account deletion (decisions §3): the customer mapping and usage go; the provider keeps its own
-- records. Inbox items keep only the customer ID they arrived with, until purged.
CREATE OR REPLACE FUNCTION forget_account(p_account bytea)
RETURNS void
LANGUAGE sql VOLATILE
SET search_path = m_billing_api_customer_billing, pg_temp
AS $$
  DELETE FROM export_usage WHERE account_key = p_account;
  DELETE FROM accounts WHERE account_key = p_account;
$$;
