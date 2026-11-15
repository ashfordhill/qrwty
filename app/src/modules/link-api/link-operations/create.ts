// POST /links: durable link creation (product contract, "Anonymous creation and claiming").
// Order: the request is validated; an existing idempotency record is replayed before any other
// work; the destination's reputation is checked; then one database call per slug candidate
// persists the idempotency record, the link and the claim proof's hash together, or nothing.
// A database error is never a success: it answers 503, and a retry with the same key replays
// whatever did commit.
import { randomBytes, randomUUID } from "node:crypto";
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import type { Dependencies } from "../link-api-link-operations.slots.ts";
import { problem, singleHeader, unavailable } from "./contract.ts";
import { normalizeDestination } from "./destination.ts";
import {
	keyHash,
	requestHash,
	type Scope,
	scopeHash,
	sha256,
	validGuestHandle,
	validKey,
} from "./idempotency.ts";
import { createOwnedLink } from "./owned.ts";
import { type KeyRing, seal, unseal } from "./replay-seal.ts";
import type { ReputationCheck } from "./reputation.ts";
import { slugCandidates } from "./slug.ts";
import { createGuestLink, findIdempotent, type StoredResponse } from "./store.ts";
import type { TestHooks } from "./test-hooks.ts";

export type CreateContext = {
	/** The public origin: short URLs are `<origin>/<slug>`, and a destination on its host loops. */
	origin: URL;
	keyRing: KeyRing;
	hooks: TestHooks;
	reputation: (dependencies: Dependencies) => ReputationCheck;
	onFailure: (what: string, error: unknown) => void;
	random?: (size: number) => Uint8Array;
};

/** The guest scope header Session API sets on a guest's create (an opaque handle). */
export const GUEST_SCOPE_HEADER = "qrwty-guest-scope";
const FIELDS = new Set(["destination", "expiresAt"]);
const RFC3339 =
	/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?([Zz]|[+-]\d{2}:\d{2})$/;

/** An RFC 3339 timestamp as ISO 8601 UTC with milliseconds, or undefined when it is not one. */
export function parseTimestamp(value: string): string | undefined {
	const m = RFC3339.exec(value);
	if (!m) return undefined;
	const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number) as number[];
	const days = new Date(Date.UTC(year ?? 0, month ?? 0, 0)).getUTCDate();
	if (
		!month ||
		month > 12 ||
		!day ||
		day > days ||
		(hour ?? 0) > 23 ||
		(minute ?? 0) > 59 ||
		(second ?? 0) > 59
	)
		return undefined;
	const at = Date.parse(value.toUpperCase());
	return Number.isNaN(at) ? undefined : new Date(at).toISOString();
}

const invalid = (message: string, reason?: string) =>
	problem(400, "invalid_request", message, false, reason === undefined ? {} : { reason });

const claimAad = (linkId: string) => `qrwty:create-link:claim-proof:v1:${linkId}`;

/** The stored response, with the claim proof unsealed into it. */
function respond(
	context: CreateContext,
	response: StoredResponse,
	replayed: boolean,
): ModuleResponse {
	const body = structuredClone(response.body) as Record<string, unknown> & {
		id?: unknown;
		version?: unknown;
		claim?: Record<string, unknown>;
	};
	if (response.sealed && body.claim && typeof body.id === "string") {
		const token = unseal(context.keyRing, response.sealed, claimAad(body.id));
		if (token === undefined)
			return unavailable(
				"replay_unavailable",
				"The stored result can't be read now; try again later.",
				5,
			);
		body.claim = { token, ...body.claim };
	}
	return {
		status: response.status,
		headers: {
			ETag: `"${String(body.version)}"`,
			...(replayed ? { "Idempotent-Replayed": "true" } : {}),
		},
		body,
	};
}

export async function createLink(
	context: CreateContext,
	dependencies: Dependencies,
	request: ModuleRequest,
): Promise<ModuleResponse> {
	const key = singleHeader(request.headers, "idempotency-key");
	if (!validKey(key))
		return problem(
			400,
			"idempotency_key_required",
			"Send an Idempotency-Key header of 1 to 255 visible ASCII characters.",
			false,
		);

	let scope: Scope;
	if (request.caller.signedIn)
		scope = { kind: "account", subject: request.caller.principal.subject };
	else {
		const handle = singleHeader(request.headers, GUEST_SCOPE_HEADER);
		if (!validGuestHandle(handle))
			return invalid("A guest create needs its guest session.", "guest_session");
		scope = { kind: "guest", handle };
	}

	const body = request.body;
	if (body === null || typeof body !== "object" || Array.isArray(body))
		return invalid("The body must be a JSON object with a destination.");
	const fields = body as Record<string, unknown>;
	const unknown = Object.keys(fields).filter((name) => !FIELDS.has(name));
	if (unknown.length > 0)
		return invalid("Only destination and expiresAt may be sent.", "unknown_field");
	const destination = normalizeDestination(fields.destination, context.origin.hostname);
	if (!destination.ok)
		return problem(
			400,
			"invalid_destination",
			`The destination is not allowed: ${destination.reason}.`,
			false,
			{
				reason: destination.reason,
			},
		);
	let expiresAt: string | null = null;
	if (fields.expiresAt !== undefined && fields.expiresAt !== null) {
		const parsed =
			typeof fields.expiresAt === "string" ? parseTimestamp(fields.expiresAt) : undefined;
		if (parsed === undefined) return invalid("expiresAt must be an RFC 3339 time.", "expires_at");
		expiresAt = parsed;
	}

	// Owned creation (A3) spends one of the account's creations under the test policy
	// (owned.ts); its replay is the generated client's `idempotent`, inside createOwnedLink.
	if (scope.kind === "account") {
		const verdict = await context.reputation(dependencies)(destination.destination);
		if (verdict === "threat")
			return problem(422, "reputation_rejected", "The destination is reported as unsafe.", false);
		if (verdict === "unavailable")
			return unavailable(
				"reputation_unavailable",
				"The safety check is unavailable; try again shortly.",
				5,
			);
		return createOwnedLink(
			context,
			dependencies,
			{ subject: scope.subject, key: scopeHash(scope) },
			key,
			{ destination: destination.destination, expiresAt },
			context.random ?? randomBytes,
		);
	}

	const scopeKey = scopeHash(scope);
	const idempotencyKey = keyHash(key);
	const requestKey = requestHash("create-link", {
		destination: destination.destination,
		expiresAt,
	});
	const clockOffsetMs = context.hooks.clockOffsetMs();
	try {
		const existing = await findIdempotent(
			dependencies.links,
			scopeKey,
			idempotencyKey,
			clockOffsetMs,
		);
		if (existing) {
			if (!existing.requestSha256.equals(requestKey))
				return problem(
					409,
					"idempotency_conflict",
					"This Idempotency-Key was used for another request.",
					false,
				);
			return respond(context, existing, true);
		}
	} catch (error) {
		context.onFailure("create-link idempotency lookup", error);
		return unavailable(
			"storage_unavailable",
			"Links are unavailable; retry with the same Idempotency-Key.",
		);
	}

	// Guest admission (Q09) goes here, before the reputation call and any durable state.
	const verdict = await context.reputation(dependencies)(destination.destination);
	if (verdict === "threat")
		return problem(422, "reputation_rejected", "The destination is reported as unsafe.", false);
	if (verdict === "unavailable")
		return unavailable(
			"reputation_unavailable",
			"The safety check is unavailable; try again shortly.",
			5,
		);

	const random = context.random ?? randomBytes;
	const linkId = randomUUID();
	const proof = Buffer.from(random(32)).toString("base64url");
	const sealed = seal(context.keyRing, proof, claimAad(linkId));
	const base = context.origin.origin;
	try {
		for (const slug of slugCandidates(context.hooks.forcedSlugs(), random)) {
			const result = await createGuestLink(dependencies.links, {
				scope: scopeKey,
				key: idempotencyKey,
				request: requestKey,
				linkId,
				slug,
				destination: destination.destination,
				expiresAt,
				shortUrl: `${base}/${slug}`,
				proofSha256: sha256(proof),
				sealed,
				clockOffsetMs,
			});
			switch (result.outcome) {
				case "created":
					return respond(context, result, false);
				case "replay":
					return respond(context, result, true);
				case "conflict":
					return problem(
						409,
						"idempotency_conflict",
						"This Idempotency-Key was used for another request.",
						false,
					);
				case "invalid-expiry":
					return invalid("expiresAt must be in the future.", "expires_at");
				case "collision":
				case "retry":
					continue;
			}
		}
	} catch (error) {
		context.onFailure("create-link", error);
		return unavailable(
			"storage_unavailable",
			"Links are unavailable; retry with the same Idempotency-Key.",
		);
	}
	context.onFailure("create-link slug allocation", new Error("every slug candidate was taken"));
	return unavailable("slug_allocation_failed", "No free short link could be allocated; try again.");
}
