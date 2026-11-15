// Account API's My links (Q07, A3), below /modules/account-api-my-links. Account API's guard is
// Required, so every caller here is a verified subject; each query is scoped by that subject's
// owner key against Links' account view (published.owned_links), never by a request field.
//   GET /links?cursor&limit   {items, nextCursor}: newest first by (createdAt, id); limit 1-50,
//                             default 20; a malformed cursor or another account's is 400
//                             invalid_cursor (http-contract §4)
//   GET /me                   {ownedLinks, ownedLinkCreates}: how many links the account owns, and
//                             (A7) its owned-link creations this UTC month (Link API's count)

import { createFailureLog } from "../../../runtime/tile-process.ts";
import { defineRoutes, type ModuleRequest, type ModuleResponse } from "../../entry.ts";
import { notFound, problem, unavailable } from "../../link-api/link-operations/contract.ts";
import { type LinkRow, linkView, ownerKey } from "../../link-api/link-operations/view.ts";
import type { Dependencies } from "../account-api-my-links.slots.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const failure = createFailureLog("account-api");

/** A cursor names the last row of a page, (created_at in microseconds, id), and carries a tag of
 * its owner's key, so a cursor from another account is refused rather than read. */
export function encodeCursor(owner: Buffer, createdUs: string, id: string): string {
	return Buffer.from(
		`1.${createdUs}.${id}.${owner.subarray(0, 12).toString("base64url")}`,
	).toString("base64url");
}

export function decodeCursor(
	owner: Buffer,
	cursor: string,
): { createdUs: string; id: string } | undefined {
	if (!/^[A-Za-z0-9_-]{1,200}$/.test(cursor)) return undefined;
	const parts = Buffer.from(cursor, "base64url").toString("utf8").split(".");
	const [version, createdUs, id, tag] = parts;
	if (
		parts.length !== 4 ||
		version !== "1" ||
		!createdUs ||
		!/^[1-9][0-9]{0,17}$/.test(createdUs) ||
		!id ||
		!UUID.test(id) ||
		tag !== owner.subarray(0, 12).toString("base64url")
	)
		return undefined;
	return { createdUs, id };
}

const one = (value: string | string[] | undefined) =>
	typeof value === "string" ? value : undefined;
const signedIn = (request: ModuleRequest) =>
	request.caller.signedIn ? ownerKey(request.caller.principal.subject) : undefined;
const unauthenticated = () => problem(401, "unauthenticated", "Sign in to see your links.", false);

const routes = defineRoutes<Dependencies>({
	"GET /links": async (request, dependencies) => {
		const owner = signedIn(request);
		if (!owner) return unauthenticated();
		const limitText = request.query.limit;
		let limit = DEFAULT_LIMIT;
		if (limitText !== undefined) {
			const text = one(limitText);
			if (text === undefined || !/^[1-9][0-9]{0,3}$/.test(text) || Number(text) > MAX_LIMIT)
				return problem(400, "invalid_request", `limit is 1 to ${MAX_LIMIT}.`, false, {
					reason: "limit",
				});
			limit = Number(text);
		}
		let after: { createdUs: string; id: string } | undefined;
		if (request.query.cursor !== undefined) {
			const text = one(request.query.cursor);
			after = text === undefined ? undefined : decodeCursor(owner, text);
			if (!after) return problem(400, "invalid_cursor", "This cursor is not valid here.", false);
		}
		try {
			const rows = await dependencies.links.query<LinkRow & { created_us: string }>(
				`SELECT id, slug, destination, version, state, created_at, updated_at, expires_at,
				        (extract(epoch FROM created_at) * 1000000)::bigint::text AS created_us
				 FROM published.owned_links
				 WHERE owner_key = $1
				   AND ($2::bigint IS NULL OR (created_at, id) <
				        (timestamptz 'epoch' + $2::bigint * interval '1 microsecond', $3::uuid))
				 ORDER BY created_at DESC, id DESC
				 LIMIT $4`,
				[owner, after?.createdUs ?? null, after?.id ?? null, limit + 1],
			);
			const page = rows.slice(0, limit);
			const last = page.at(-1);
			return {
				body: {
					items: page.map((row) => linkView(row, dependencies.settings.QRWTY_PUBLIC_ORIGIN_URL)),
					nextCursor:
						rows.length > limit && last ? encodeCursor(owner, last.created_us, last.id) : null,
				},
			};
		} catch (error) {
			failure("my-links list", error);
			return unavailable("storage_unavailable", "Your links are unavailable; try again shortly.");
		}
	},
	"GET /me": async (request, dependencies) => {
		const owner = signedIn(request);
		if (!owner) return unauthenticated();
		try {
			const [row] = await dependencies.links.query<{
				owned: string;
				used: number | null;
				start: string;
			}>(
				`SELECT (SELECT count(*) FROM published.owned_links WHERE owner_key = $1)::text AS owned,
				        (SELECT owned_link_creates FROM published.account_usage
				         WHERE owner_key = $1 AND period_start = date_trunc('month', now() AT TIME ZONE 'UTC')::date) AS used,
				        to_char(date_trunc('month', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS start`,
				[owner],
			);
			return {
				body: {
					ownedLinks: Number(row?.owned ?? 0),
					ownedLinkCreates: { used: row?.used ?? 0, periodStart: row?.start ?? null },
				},
			};
		} catch (error) {
			failure("my-links me", error);
			return unavailable("storage_unavailable", "Your account is unavailable; try again shortly.");
		}
	},
});

export async function myLinks(
	request: ModuleRequest,
	dependencies: Dependencies,
): Promise<ModuleResponse> {
	const response = await routes(request, dependencies);
	const body = response.body as { error?: unknown } | undefined;
	if (typeof body?.error !== "string") return response;
	return response.status === 404
		? notFound()
		: problem(response.status ?? 400, "invalid_request", "Invalid request.", false, {
				headers: response.headers?.Allow ? { Allow: String(response.headers.Allow) } : {},
			});
}
