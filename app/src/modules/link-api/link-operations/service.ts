// Link operations' routes below /modules/link-api-link-operations, built from its settings
// (settings.ts).
//
// Internal contract (Session API forwards the public `/api/v1/links` here; Link API is internal):
//   POST /links  {destination, expiresAt?}  Idempotency-Key; a verified bearer for an account,
//                none for a guest, who then carries `QRWTY-Guest-Scope` (an opaque handle from the
//                guest session). Answers as `POST /api/v1/links` in http-contract §4.
// Claim, edit, disable and delete (Q07), owned creation (Q10b) and guest admission (Q09) are not
// here yet: their requests answer 404, 405 or 503, never a false success.
import { createFailureLog } from "../../../runtime/tile-process.ts";
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import type { Dependencies } from "../link-api-link-operations.slots.ts";
import { notFound, problem } from "./contract.ts";
import { type CreateContext, createLink } from "./create.ts";
import { metadataTokenSource } from "./google-credentials.ts";
import { webRiskReputation } from "./reputation.ts";
import { testHooks } from "./test-hooks.ts";

export type LinkOperations = (
	dependencies: Dependencies,
	request: ModuleRequest,
) => Promise<ModuleResponse>;

export function linkOperations(context: CreateContext): LinkOperations {
	return async (dependencies, request) => {
		if (request.path === "/links" || request.path === "/links/") {
			if (request.method !== "POST")
				return problem(405, "method_not_allowed", "Use POST to create a link.", false, {
					headers: { Allow: "POST" },
				});
			return createLink(context, dependencies, request);
		}
		if (request.path.startsWith("/__test/")) return context.hooks.handle(request);
		return notFound();
	};
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
