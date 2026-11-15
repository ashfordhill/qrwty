// Link operations' routes below /modules/link-api-link-operations, built from its settings
// (settings.ts).
//
// Internal contract (Session API forwards the public `/api/v1/links…` here; Link API is internal).
// A signed-in caller is the subject Link API's own guard verified from the forwarded bearer; a
// guest sends no bearer and carries `QRWTY-Guest-Scope` (an opaque handle from the guest session).
//   POST   /links                {destination, expiresAt?}  Idempotency-Key; guest or owned create
//   GET    /links/:id            the caller's link, with ETag
//   PATCH  /links/:id            {destination?, state?, expiresAt?}  If-Match
//   DELETE /links/:id            204, repeat-safe tombstone
//   POST   /links/:id/claim      {claimToken}  Idempotency-Key; signed in only
//   POST   /account/erase        the Links part of the caller's account deletion
// Answers follow http-contract §4; another account's link is 404. Guest admission (Q09) and paid
// entitlements (A7) are not here yet.

import { createFailureLog } from "../../../runtime/tile-process.ts";
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import { defineRoutes } from "../../entry.ts";
import type { Dependencies } from "../link-api-link-operations.slots.ts";
import { notFound, problem } from "./contract.ts";
import { type CreateContext, createLink } from "./create.ts";
import { metadataTokenSource } from "./google-credentials.ts";
import { ownedRoutes } from "./owned.ts";
import { webRiskReputation } from "./reputation.ts";
import { testHooks } from "./test-hooks.ts";

export type LinkOperations = (
	dependencies: Dependencies,
	request: ModuleRequest,
) => Promise<ModuleResponse>;

export function linkOperations(context: CreateContext): LinkOperations {
	const owned = ownedRoutes(context);
	const routes = defineRoutes<Dependencies>({
		"POST /links": (request, dependencies) => createLink(context, dependencies, request),
		"GET /links/:id": owned.getLink,
		"PATCH /links/:id": owned.patchLink,
		"DELETE /links/:id": owned.deleteLink,
		"POST /links/:id/claim": owned.claimLink,
		"POST /account/erase": owned.eraseAccount,
	});
	return async (dependencies, request) => {
		if (request.path.startsWith("/__test/")) return context.hooks.handle(request);
		return productShape(await routes(request, dependencies));
	};
}

/** The route table's own 404, 405 and 400 answers in the product's error shape. */
function productShape(response: ModuleResponse): ModuleResponse {
	const body = response.body as { error?: unknown } | undefined;
	if (typeof body?.error !== "string") return response;
	if (response.status === 404) return notFound();
	if (response.status === 405)
		return problem(405, "method_not_allowed", "Method not allowed.", false, {
			headers: { Allow: String(response.headers?.Allow ?? "") },
		});
	return problem(response.status ?? 400, "invalid_request", "Invalid request.", false);
}

/** Link operations for one process's settings (`dependencies.settings`, which the generated
 * configuration pass has already read and checked), built on its first request and kept, so the
 * process keeps one test-hook state and one token cache. */
const built = new WeakMap<Dependencies["settings"], LinkOperations>();
export function linkOperationsFor(settings: Dependencies["settings"]): LinkOperations {
	let operations = built.get(settings);
	if (!operations) {
		operations = linkOperationsFromSettings(settings);
		built.set(settings, operations);
	}
	return operations;
}

function linkOperationsFromSettings(settings: Dependencies["settings"]): LinkOperations {
	const token =
		settings.QRWTY_REPUTATION_CREDENTIALS === "metadata" ? metadataTokenSource() : undefined;
	const failure = createFailureLog("link-api");
	return linkOperations({
		origin: settings.QRWTY_PUBLIC_ORIGIN_URL,
		keyRing: settings.LINK_REPLAY_KEYS,
		hooks: testHooks(settings.QRWTY_TEST_HOOKS),
		reputation: (dependencies) =>
			webRiskReputation(dependencies.reputationApi, {
				onFailure: (error) => failure("reputation check", error),
				token,
			}),
		onFailure: failure,
	});
}
