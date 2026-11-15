// The Links database calls: each operation is one statement calling a product SQL function
// (infra/postgres/links/modules/link-api-link-operations.sql), so it is one transaction.
import type { DatabaseReader, DatabaseReadWriter } from "../../dependencies.ts";

const SCHEMA = "m_link_api_link_operations";

export type StoredResponse = {
	status: number;
	body: Record<string, unknown>;
	sealed: Buffer | null;
};
export type Idempotent = StoredResponse & { requestSha256: Buffer };

export type CreateOutcome =
	| ({ outcome: "created" | "replay" } & StoredResponse)
	| { outcome: "conflict" | "collision" | "invalid-expiry" | "retry" };

export type GuestCreate = {
	scope: Buffer;
	key: Buffer;
	request: Buffer;
	linkId: string;
	slug: string;
	destination: string;
	expiresAt: string | null;
	shortUrl: string;
	proofSha256: Buffer;
	sealed: Buffer;
	clockOffsetMs: number;
};

type Row = {
	request_sha256?: Buffer;
	outcome?: string;
	status: number | null;
	body: Record<string, unknown> | null;
	sealed: Buffer | null;
};

const stored = (row: Row): StoredResponse => {
	if (row.status === null || row.body === null)
		throw new Error("Idempotency record without a response");
	return { status: row.status, body: row.body, sealed: row.sealed };
};

export async function findIdempotent(
	db: DatabaseReader,
	scope: Buffer,
	key: Buffer,
	clockOffsetMs: number,
): Promise<Idempotent | undefined> {
	const rows = await db.query<Row>(
		`SELECT request_sha256, status, body, sealed FROM ${SCHEMA}.find_idempotent($1, $2, $3)`,
		[scope, key, clockOffsetMs],
	);
	const row = rows[0];
	if (!row?.request_sha256) return undefined;
	return { ...stored(row), requestSha256: row.request_sha256 };
}

export async function createGuestLink(
	db: DatabaseReadWriter,
	input: GuestCreate,
): Promise<CreateOutcome> {
	const rows = await db.query<Row>(
		`SELECT outcome, status, body, sealed FROM ${SCHEMA}.create_guest_link($1, $2, $3, $4::uuid, $5, $6, $7::timestamptz, $8, $9, $10, $11)`,
		[
			input.scope,
			input.key,
			input.request,
			input.linkId,
			input.slug,
			input.destination,
			input.expiresAt,
			input.shortUrl,
			input.proofSha256,
			input.sealed,
			input.clockOffsetMs,
		],
	);
	const row = rows[0];
	switch (row?.outcome) {
		case "created":
		case "replay":
			return { outcome: row.outcome, ...stored(row) };
		case "conflict":
		case "collision":
		case "invalid-expiry":
		case "retry":
			return { outcome: row.outcome };
		default:
			throw new Error("create_guest_link returned no outcome");
	}
}
