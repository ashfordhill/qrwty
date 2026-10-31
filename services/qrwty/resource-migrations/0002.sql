-- Immutable Jeeves resource migration 0002
CREATE TABLE "r_8cba47752a4044d7c0846eb8" (
  id uuid PRIMARY KEY,
  "f_6a3dfaa4b393986a3b241369" varchar(40) NOT NULL,
  "f_ee74ed004fa24e3b68acd157" text NOT NULL,
  "f_3c2d70b4e948e76350ee18da" varchar(7) NOT NULL,
  "f_86b56bd77bfd0f3add2d097c" varchar(7) NOT NULL,
  "f_d6e69193ab6c39b70e5c64ee" text NOT NULL CHECK ("f_d6e69193ab6c39b70e5c64ee" IN ('square', 'rounded')),
  "f_1a70c9b2bff3516883df1053" text NOT NULL CHECK ("f_1a70c9b2bff3516883df1053" IN ('square', 'rounded')),
  "f_eb1e91e44529a8ca2e8fe75c" integer NOT NULL CHECK ("f_eb1e91e44529a8ca2e8fe75c" >= 256 AND "f_eb1e91e44529a8ca2e8fe75c" <= 1024),
  "f_d564eb0e750e83790b6eb627" integer NOT NULL CHECK ("f_d564eb0e750e83790b6eb627" >= 4 AND "f_d564eb0e750e83790b6eb627" <= 8),
  "f_2ad10c64ad3ca208665a9e1e" text NOT NULL CHECK ("f_2ad10c64ad3ca208665a9e1e" IN ('M', 'Q', 'H')),
  "f_490169e3365a537aced2c98e" varchar(64) NOT NULL,
  "f_4750858da67983be7bf31122" varchar(64) NOT NULL,
  "f_60441330f6ed4fc6a9ad2eee" timestamptz NOT NULL DEFAULT now(),
  "b_d448d4fb18d6b55aa6a9091b" uuid NOT NULL
);
ALTER TABLE "r_8cba47752a4044d7c0846eb8" ADD FOREIGN KEY ("b_d448d4fb18d6b55aa6a9091b") REFERENCES "r_c347743008abaf90f6046e0f"(id);
CREATE INDEX "idx_7ce9581c77b7d45d77f0425d" ON "r_8cba47752a4044d7c0846eb8" ("b_d448d4fb18d6b55aa6a9091b", "f_60441330f6ed4fc6a9ad2eee");
