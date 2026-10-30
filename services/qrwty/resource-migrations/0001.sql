-- Immutable Jeeves resource migration 0001
CREATE TABLE app_user (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE app_session (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_user(id), csrf_token text NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX app_session_expiry ON app_session(expires_at);
CREATE TABLE "r_c347743008abaf90f6046e0f" (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  "f_8ca02f1b3648d719e7217737" text NOT NULL,
  "f_87dfbbd263f118137d036701" varchar(120)
);
CREATE INDEX "idx_c347743008abaf90f6046e0f" ON "r_c347743008abaf90f6046e0f" (owner_id, created_at DESC, id DESC);
CREATE TABLE "r_dfa11b56dbf9f8b925c86282" (
  id uuid PRIMARY KEY,
  "f_c6d5092d30ae064c691b0c9c" timestamptz NOT NULL DEFAULT now(),
  "b_6ee5fb0cb4584d871bca4c87" uuid NOT NULL
);
ALTER TABLE "r_dfa11b56dbf9f8b925c86282" ADD FOREIGN KEY ("b_6ee5fb0cb4584d871bca4c87") REFERENCES "r_c347743008abaf90f6046e0f"(id);
CREATE INDEX "idx_6eb022739869f5b2fb06d32a" ON "r_dfa11b56dbf9f8b925c86282" ("b_6ee5fb0cb4584d871bca4c87", "f_c6d5092d30ae064c691b0c9c");
