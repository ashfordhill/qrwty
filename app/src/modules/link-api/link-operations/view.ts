// The link object of http-contract §4, from a links row (Link API) or a published.owned_links row
// (Account API), and the owner key both scope their queries with.
import { scopeHash } from "./idempotency.ts";

/** A link's columns as the product SQL and the owner view return them. */
export type LinkRow = {
	id: string;
	slug: string;
	destination: string;
	version: number;
	state: string;
	created_at: Date;
	updated_at: Date;
	expires_at: Date | null;
};

export type LinkView = {
	id: string;
	shortUrl: string;
	destination: string;
	version: number;
	state: "active" | "disabled" | "blocked";
	createdAt: string;
	updatedAt: string;
	expiresAt: string | null;
};

/** The SQL columns of a LinkRow, for a SELECT or RETURNING list (unqualified). */
export const LINK_COLUMNS =
	"id, slug, destination, version, state, created_at, updated_at, expires_at";

/** The owner's key: the account idempotency scope's hash, SHA-256 of "account" NUL subject. */
export const ownerKey = (subject: string): Buffer => scopeHash({ kind: "account", subject });

export function linkView(row: LinkRow, origin: URL): LinkView {
	return {
		id: row.id,
		shortUrl: `${origin.origin}/${row.slug}`,
		destination: row.destination,
		version: row.version,
		state: row.state as LinkView["state"],
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
		expiresAt: row.expires_at === null ? null : row.expires_at.toISOString(),
	};
}

/** A single-link answer: the link and its ETag. */
export const linkResponse = (row: LinkRow, origin: URL, status = 200) => ({
	status,
	headers: { ETag: `"${row.version}"` },
	body: linkView(row, origin),
});
