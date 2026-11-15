// An account's own links (Q07, A3): read, edit, disable, delete, claim, owned create and account
// erasure. Every query is scoped by the owner key of the subject Link API's guard verified, never
// by a request field; another account's link and an unknown ID are both 404 (http-contract §2).

import { IdempotencyConflict, requestHash } from "../../../runtime/idempotency.ts";
import type { Tx } from "../../dependencies.ts";
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import type { Dependencies } from "../link-api-link-operations.slots.ts";
import { notFound, problem, singleHeader, unavailable } from "./contract.ts";
import type { CreateContext } from "./create.ts";
import { parseTimestamp } from "./create.ts";
import { normalizeDestination } from "./destination.ts";
import { sha256, validKey } from "./idempotency.ts";
import { slugCandidates } from "./slug.ts";
import { LINK_COLUMNS, type LinkRow, linkResponse, ownerKey } from "./view.ts";

const SCHEMA = "m_link_api_link_operations";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** TEST FIXTURE, NOT APPROVED PRICING (decisions §4): every account is on `free-test-v1` until the
 * billing unit (A7) grants paid entitlements. A claim and an owned create each spend one. */
export const ACCOUNT_POLICY = { name: "free-test-v1", ownedLinkCreatesPerMonth: 5 } as const;

type Owner = { subject: string; key: Buffer };
type Routed = ModuleRequest & { params: Record<string, string> };

const signInRequired = () =>
	problem(401, "unauthenticated", "Sign in to manage your links.", false);

/** The verified owner, or undefined for an anonymous caller. */
function owner(request: ModuleRequest): Owner | undefined {
	if (!request.caller.signedIn) return undefined;
	const subject = request.caller.principal.subject;
	return { subject, key: ownerKey(subject) };
}

const linkId = (request: Routed) => {
	const id = request.params.id?.toLowerCase();
	return id !== undefined && UUID.test(id) ? id : undefined;
};

/** 403 quota_exceeded with the frozen fields: limit, used and periodEnd. */
function quota(used: number, periodEnd: Date): { status: number; body: unknown } {
	return {
		status: 403,
		body: {
			error: {
				code: "quota_exceeded",
				message: "This account has no owned-link creations left this month.",
				retryable: false,
				limit: ACCOUNT_POLICY.ownedLinkCreatesPerMonth,
				used,
				periodEnd: periodEnd.toISOString(),
				policy: ACCOUNT_POLICY.name,
			},
		},
	};
}

async function setChange(tx: Tx, change: string, actor: string) {
	await tx.query(
		"SELECT set_config('qrwty.link_change', $1, true), set_config('qrwty.link_actor', $2, true)",
		[change, actor],
	);
}

/** `ETag` form of a version: `"<n>"`, or a weak `W/"<n>"`. */
function ifMatch(request: ModuleRequest): number | undefined {
	const value = singleHeader(request.headers, "if-match");
	const match = value === undefined ? null : /^(?:W\/)?"([1-9][0-9]{0,9})"$/.exec(value.trim());
	return match?.[1] === undefined ? undefined : Number(match[1]);
}

export function ownedRoutes(context: CreateContext) {
	const storage = (what: string, error: unknown) => {
		context.onFailure(what, error);
		return unavailable("storage_unavailable", "Links are unavailable; try again shortly.");
	};

	async function getLink(request: Routed, dependencies: Dependencies) {
		const me = owner(request);
		if (!me) return signInRequired();
		const id = linkId(request);
		if (!id) return notFound();
		try {
			const [row] = await dependencies.links.query<LinkRow>(
				`SELECT ${LINK_COLUMNS} FROM ${SCHEMA}.links WHERE id = $1 AND owner_key = $2 AND state <> 'deleted'`,
				[id, me.key],
			);
			return row ? linkResponse(row, context.origin) : notFound();
		} catch (error) {
			return storage("get-link", error);
		}
	}

	async function patchLink(request: Routed, dependencies: Dependencies) {
		const me = owner(request);
		if (!me) return signInRequired();
		const id = linkId(request);
		if (!id) return notFound();
		const expected = ifMatch(request);
		const fields = request.body;
		if (fields === null || typeof fields !== "object" || Array.isArray(fields))
			return problem(400, "invalid_request", "The body must be a JSON object.", false);
		const changes = fields as Record<string, unknown>;
		if (Object.keys(changes).some((name) => !["destination", "state", "expiresAt"].includes(name)))
			return problem(
				400,
				"invalid_request",
				"Only destination, state and expiresAt may change.",
				false,
				{
					reason: "unknown_field",
				},
			);
		let destination: string | undefined;
		if (changes.destination !== undefined) {
			const checked = normalizeDestination(changes.destination, context.origin.hostname);
			if (!checked.ok)
				return problem(
					400,
					"invalid_destination",
					`The destination is not allowed: ${checked.reason}.`,
					false,
					{
						reason: checked.reason,
					},
				);
			destination = checked.destination;
		}
		const state = changes.state;
		if (state !== undefined && state !== "active" && state !== "disabled")
			return problem(400, "invalid_request", "state may be active or disabled.", false, {
				reason: "state",
			});
		let expiresAt: string | null | undefined;
		if (changes.expiresAt === null) expiresAt = null;
		else if (changes.expiresAt !== undefined) {
			expiresAt =
				typeof changes.expiresAt === "string" ? parseTimestamp(changes.expiresAt) : undefined;
			if (expiresAt === undefined)
				return problem(400, "invalid_request", "expiresAt must be an RFC 3339 time.", false, {
					reason: "expires_at",
				});
		}
		if (expected === undefined)
			return problem(428, "precondition_required", 'Send If-Match: "<version>".', false);
		if (destination !== undefined) {
			const verdict = await context.reputation(dependencies)(destination);
			if (verdict === "threat")
				return problem(422, "reputation_rejected", "The destination is reported as unsafe.", false);
			if (verdict === "unavailable")
				return unavailable(
					"reputation_unavailable",
					"The safety check is unavailable; try again shortly.",
					5,
				);
		}
		const offset = context.hooks.clockOffsetMs();
		try {
			return await dependencies.links.transaction(async (tx): Promise<ModuleResponse> => {
				const [row] = await tx.query<LinkRow & { now: Date }>(
					`SELECT ${LINK_COLUMNS}, ${SCHEMA}.clock_now($3) AS now FROM ${SCHEMA}.links WHERE id = $1 AND owner_key = $2 AND state <> 'deleted' FOR UPDATE`,
					[id, me.key, offset],
				);
				if (!row) return notFound();
				if (row.version !== expected)
					return problem(412, "version_conflict", "The link changed; read it again.", false);
				if (row.state === "blocked")
					return problem(409, "blocked_by_operator", "An operator blocked this link.", false);
				if (typeof expiresAt === "string" && Date.parse(expiresAt) <= row.now.getTime())
					return problem(400, "invalid_request", "expiresAt must be in the future.", false, {
						reason: "expires_at",
					});
				const next = {
					destination: destination ?? row.destination,
					state: (state as string | undefined) ?? row.state,
					expiresAt: expiresAt === undefined ? row.expires_at : expiresAt,
				};
				const unchanged =
					next.destination === row.destination &&
					next.state === row.state &&
					(next.expiresAt === null ? null : new Date(next.expiresAt).getTime()) ===
						(row.expires_at === null ? null : row.expires_at.getTime());
				if (unchanged) return linkResponse(row, context.origin);
				const change =
					next.state !== row.state ? (next.state === "disabled" ? "disable" : "enable") : "update";
				await setChange(tx, change, "owner");
				const [updated] = await tx.query<LinkRow>(
					`UPDATE ${SCHEMA}.links SET destination = $2, state = $3, expires_at = $4::timestamptz, version = version + 1, updated_at = greatest($5::timestamptz, created_at) WHERE id = $1 RETURNING ${LINK_COLUMNS}`,
					[id, next.destination, next.state, next.expiresAt, row.now],
				);
				if (!updated) throw new Error("patch-link updated no row");
				return linkResponse(updated, context.origin);
			});
		} catch (error) {
			return storage("patch-link", error);
		}
	}

	async function deleteLink(request: Routed, dependencies: Dependencies) {
		const me = owner(request);
		if (!me) return signInRequired();
		const id = linkId(request);
		if (!id) return notFound();
		const offset = context.hooks.clockOffsetMs();
		try {
			return await dependencies.links.transaction(async (tx): Promise<ModuleResponse> => {
				const [row] = await tx.query<{ state: string; now: Date }>(
					`SELECT state, ${SCHEMA}.clock_now($3) AS now FROM ${SCHEMA}.links WHERE id = $1 AND owner_key = $2 FOR UPDATE`,
					[id, me.key, offset],
				);
				if (!row) return notFound();
				if (row.state !== "deleted") {
					await setChange(tx, "delete", "owner");
					await tx.execute(
						`UPDATE ${SCHEMA}.links SET state = 'deleted', deleted_at = $2::timestamptz, version = version + 1, updated_at = greatest($2::timestamptz, updated_at) WHERE id = $1`,
						[id, row.now],
					);
				}
				return { status: 204 };
			});
		} catch (error) {
			return storage("delete-link", error);
		}
	}

	async function claimLink(request: Routed, dependencies: Dependencies) {
		const me = owner(request);
		if (!me) return signInRequired();
		const key = singleHeader(request.headers, "idempotency-key");
		if (!validKey(key))
			return problem(
				400,
				"idempotency_key_required",
				"Send an Idempotency-Key header of 1 to 255 visible ASCII characters.",
				false,
			);
		const body = request.body as { claimToken?: unknown } | undefined;
		const token = body && typeof body === "object" ? body.claimToken : undefined;
		if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
			return problem(403, "claim_invalid", "This claim proof is not valid for the link.", false);
		const id = linkId(request);
		if (!id)
			return problem(403, "claim_invalid", "This claim proof is not valid for the link.", false);
		const offset = context.hooks.clockOffsetMs();
		try {
			const result = await dependencies.links.idempotent(
				{
					scope: { kind: "account", id: me.key.toString("hex") },
					key,
					hash: requestHash({
						method: "POST",
						route: "POST /links/:id/claim",
						params: { id },
						body: { claimToken: token },
					}),
				},
				async (tx) => {
					const [row] = await tx.query<
						LinkRow & { outcome: string; used: number | null; period_end: Date | null }
					>(`SELECT * FROM ${SCHEMA}.claim_link($1::uuid, $2, $3, $4, $5, $6)`, [
						id,
						sha256(token),
						me.subject,
						me.key,
						ACCOUNT_POLICY.ownedLinkCreatesPerMonth,
						offset,
					]);
					switch (row?.outcome) {
						case "claimed":
						case "owned": {
							const answer = linkResponse(row, context.origin);
							return { status: 200, body: { ...answer.body, owned: true } };
						}
						case "consumed":
							return problem(409, "claim_consumed", "This link was already claimed.", false) as {
								status: number;
								body: unknown;
							};
						case "expired":
							return problem(
								410,
								"claim_expired",
								"This claim proof has expired; the link still works.",
								false,
							) as {
								status: number;
								body: unknown;
							};
						case "quota":
							return quota(row.used ?? 0, row.period_end ?? new Date());
						default:
							return problem(
								403,
								"claim_invalid",
								"This claim proof is not valid for the link.",
								false,
							) as {
								status: number;
								body: unknown;
							};
					}
				},
			);
			const answer = result.body as { version?: number };
			return {
				status: result.status,
				headers: {
					...(result.status === 200 ? { ETag: `"${answer.version}"` } : {}),
					...(result.replayed ? { "Idempotent-Replayed": "true" } : {}),
				},
				body: result.body,
			};
		} catch (error) {
			if (error instanceof IdempotencyConflict)
				return problem(
					409,
					"idempotency_conflict",
					"This Idempotency-Key was used for another request.",
					false,
				);
			return storage("claim-link", error);
		}
	}

	/** POST /account/erase: the caller's account deletion, the Links part (decisions §3). */
	async function eraseAccount(request: Routed, dependencies: Dependencies) {
		const me = owner(request);
		if (!me) return signInRequired();
		try {
			const [row] = await dependencies.links.query<{ erased: number }>(
				`SELECT ${SCHEMA}.erase_account($1, $2) AS erased`,
				[me.key, context.hooks.clockOffsetMs()],
			);
			return { status: 200, body: { linksDisabled: row?.erased ?? 0 } };
		} catch (error) {
			return storage("erase-account", error);
		}
	}

	return { getLink, patchLink, deleteLink, claimLink, eraseAccount };
}

/** Owned create (POST /links by a signed-in caller): the link, owned at once, with no claim proof,
 * spending one of the account's creations, under the generated client's `idempotent` (the answer
 * holds no secret, so its plaintext replay is fine; guest replays stay sealed, Q06). */
export async function createOwnedLink(
	context: CreateContext,
	dependencies: Dependencies,
	me: Owner,
	key: string,
	input: { destination: string; expiresAt: string | null },
	random: (size: number) => Uint8Array,
): Promise<ModuleResponse> {
	const offset = context.hooks.clockOffsetMs();
	try {
		const result = await dependencies.links.idempotent(
			{
				scope: { kind: "account", id: me.key.toString("hex") },
				key,
				hash: requestHash({ method: "POST", route: "POST /links", body: input }),
			},
			async (tx) => {
				const [now] = await tx.query<{ now: Date }>(`SELECT ${SCHEMA}.clock_now($1) AS now`, [
					offset,
				]);
				const at = now?.now ?? new Date();
				if (input.expiresAt !== null && Date.parse(input.expiresAt) <= at.getTime())
					return problem(400, "invalid_request", "expiresAt must be in the future.", false, {
						reason: "expires_at",
					}) as { status: number; body: unknown };
				const [spent] = await tx.query<{ allowed: boolean; used: number; period_end: Date }>(
					`SELECT * FROM ${SCHEMA}.spend_owned_create($1, $2, $3)`,
					[me.key, ACCOUNT_POLICY.ownedLinkCreatesPerMonth, at],
				);
				if (!spent?.allowed) return quota(spent?.used ?? 0, spent?.period_end ?? at);
				await setChange(tx, "create", "owner");
				for (const slug of slugCandidates(context.hooks.forcedSlugs(), random)) {
					const [row] = await tx.query<LinkRow>(
						`INSERT INTO ${SCHEMA}.links (id, domain_id, slug, destination, owner_subject, owner_key, state, version, created_at, updated_at, expires_at) VALUES (gen_random_uuid(), 1, $1, $2, $3, $4, 'active', 1, $5, $5, $6::timestamptz) ON CONFLICT ON CONSTRAINT links_slug_unique DO NOTHING RETURNING ${LINK_COLUMNS}`,
						[slug, input.destination, me.subject, me.key, at, input.expiresAt],
					);
					if (row) {
						const answer = linkResponse(row, context.origin, 201);
						return { status: 201, body: { ...answer.body, owned: true } };
					}
				}
				context.onFailure(
					"create-link slug allocation",
					new Error("every slug candidate was taken"),
				);
				return unavailable(
					"slug_allocation_failed",
					"No free short link could be allocated; try again.",
				) as {
					status: number;
					body: unknown;
				};
			},
		);
		const answer = result.body as { version?: number; error?: unknown };
		return {
			status: result.status,
			headers: {
				...(result.status === 201 ? { ETag: `"${answer.version}"` } : {}),
				...(result.status === 503 ? { "Retry-After": "1" } : {}),
				...(result.replayed ? { "Idempotent-Replayed": "true" } : {}),
			},
			body: result.body,
		};
	} catch (error) {
		if (error instanceof IdempotencyConflict)
			return problem(
				409,
				"idempotency_conflict",
				"This Idempotency-Key was used for another request.",
				false,
			);
		context.onFailure("create-owned-link", error);
		return unavailable(
			"storage_unavailable",
			"Links are unavailable; retry with the same Idempotency-Key.",
		);
	}
}
