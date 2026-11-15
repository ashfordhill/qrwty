// A fresh database on the disposable test PostgreSQL (infra/local/test-postgres.sh), migrated
// through the export's own supported path: the template foundation, then `applyProductSql` and
// `grantProductSql` from scripts/products.mjs, in one owner transaction as migrate.mjs runs them.
// Roles and passwords are made per run and kept in memory only.
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import type { DatabaseReadWriter } from "../../src/modules/dependencies.ts";
import { createPostgres } from "../../src/runtime/postgres.ts";

const MODULES = [
	{
		file: "infra/postgres/links/modules/link-api-abuse-and-moderation.sql",
		host: "link-api",
		module: "link-api-abuse-and-moderation",
		schema: "m_link_api_abuse_and_moderation",
	},
	{
		file: "infra/postgres/links/modules/link-api-link-operations.sql",
		host: "link-api",
		module: "link-api-link-operations",
		schema: "m_link_api_link_operations",
	},
];
const quote = (name: string) => {
	if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new Error("bad identifier");
	return `"${name}"`;
};

type Products = {
	applyProductSql(owner: pg.Client, db: unknown, q: typeof quote): Promise<void>;
	grantProductSql(owner: pg.Client, db: unknown, runtime: unknown, q: typeof quote): Promise<void>;
};

export function testServer() {
	const port = Number(process.env.QRWTY_TEST_PG_PORT);
	const file = process.env.QRWTY_TEST_PG_PASSWORD_FILE;
	if (!port || !file)
		throw new Error(
			"Set QRWTY_TEST_PG_PORT and QRWTY_TEST_PG_PASSWORD_FILE (infra/local/test-postgres.sh)",
		);
	return { host: "127.0.0.1", port, password: readFileSync(file, "utf8").trim() };
}

export type TestDatabase = {
	database: string;
	logins: Record<"owner" | "link" | "redirect" | "account", { user: string; password: string }>;
	/** A pool as a Link API replica has it: the generated client's settings, the link login. */
	replica(): { db: DatabaseReadWriter; end(): Promise<void> };
	client(login: "owner" | "link" | "redirect" | "account"): Promise<pg.Client>;
	migrate(): Promise<void>;
	drop(): Promise<void>;
};

export async function createTestDatabase(): Promise<TestDatabase> {
	const server = testServer();
	const suffix = randomBytes(4).toString("hex");
	const database = `d_links_q06_${suffix}`;
	const login = (role: string) => ({
		user: `${role}_${suffix}`,
		password: randomBytes(18).toString("hex"),
	});
	const logins = {
		owner: login("o_links"),
		link: login("r_links__link_api"),
		redirect: login("r_links__redirect_service"),
		account: login("r_links__account_api"),
	};
	const admin = new pg.Client({ ...server, user: "postgres", database: "postgres" });
	await admin.connect();
	try {
		for (const { user, password } of Object.values(logins))
			await admin.query(`CREATE ROLE ${quote(user)} LOGIN PASSWORD '${password}'`);
		await admin.query(`CREATE DATABASE ${quote(database)} OWNER ${quote(logins.owner.user)}`);
		await admin.query(`REVOKE ALL ON DATABASE ${quote(database)} FROM PUBLIC`);
		for (const role of ["link", "redirect", "account"] as const)
			await admin.query(
				`GRANT CONNECT ON DATABASE ${quote(database)} TO ${quote(logins[role].user)}`,
			);
	} finally {
		await admin.end();
	}
	const client = async (role: keyof typeof logins) => {
		const c = new pg.Client({ ...server, database, ...logins[role] });
		await c.connect();
		return c;
	};
	const products = (await import(pathToFileURL(resolve("scripts/products.mjs")).href)) as Products;
	const plan = { database, resource: "links", modules: MODULES };
	const runtime = [
		{ user: logins.link.user, host: "link-api" },
		{ user: logins.redirect.user, host: "redirect-service" },
		{ user: logins.account.user, host: "account-api" },
	];
	return {
		database,
		logins,
		client,
		async migrate() {
			const owner = await client("owner");
			try {
				await owner.query("BEGIN");
				await owner.query(readFileSync("infra/postgres/links/000-foundation.sql", "utf8"));
				await products.applyProductSql(owner, plan, quote);
				await products.grantProductSql(owner, plan, runtime, quote);
				await owner.query("COMMIT");
			} catch (error) {
				await owner.query("ROLLBACK");
				throw error;
			} finally {
				await owner.end();
			}
		},
		replica() {
			const pool = createPostgres({
				hostname: server.host,
				port: server.port,
				tls: { mode: "disable" },
				login: { database, user: logins.link.user, secret: "unused" },
				credential: () => logins.link.password,
				poolSize: 10,
				statementTimeoutMs: 2000,
				connectionTimeoutMs: 2000,
			});
			pool.on("error", () => {});
			const run = (sql: string, values?: readonly unknown[]) =>
				pool.query(sql, values ? [...values] : undefined);
			return {
				db: {
					async query<Row>(sql: string, values?: readonly unknown[]) {
						return (await run(sql, values)).rows as Row[];
					},
					async execute(sql: string, values?: readonly unknown[]) {
						return { rowCount: (await run(sql, values)).rowCount ?? 0 };
					},
				},
				end: () => pool.end(),
			};
		},
		async drop() {
			const admin = new pg.Client({ ...server, user: "postgres", database: "postgres" });
			await admin.connect();
			try {
				await admin.query(`DROP DATABASE IF EXISTS ${quote(database)} WITH (FORCE)`);
				for (const { user } of Object.values(logins))
					await admin.query(`DROP ROLE IF EXISTS ${quote(user)}`);
			} finally {
				await admin.end();
			}
		},
	};
}
