// Link operations' routes below /modules/link-api-link-operations, and its configuration.
//
// Internal contract (Session API forwards the public `/api/v1/links` here; Link API is internal):
//   POST /links  {destination, expiresAt?}  Idempotency-Key; a verified bearer for an account,
//                none for a guest, who then carries `QRWTY-Guest-Scope` (an opaque handle from the
//                guest session). Answers as `POST /api/v1/links` in http-contract §4.
// Claim, edit, disable and delete (Q07), owned creation (Q10b) and guest admission (Q09) are not
// here yet: their requests answer 404, 405 or 503, never a false success.
import { readSecret } from "../../../runtime/local.ts";
import { createFailureLog } from "../../../runtime/tile-process.ts";
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import type { Dependencies } from "../link-api-link-operations.slots.ts";
import { notFound, problem } from "./contract.ts";
import { type CreateContext, createLink } from "./create.ts";
import { parseKeyRing } from "./replay-seal.ts";
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

/** `QRWTY_PUBLIC_ORIGIN_URL`: the public origin itself (`https://qrwty.io`), no path. */
export function publicOrigin(value: string | undefined): URL {
	let origin: URL | undefined;
	try {
		origin = value === undefined ? undefined : new URL(value);
	} catch {
		origin = undefined;
	}
	if (
		!origin ||
		(origin.protocol !== "https:" && origin.protocol !== "http:") ||
		origin.origin !== value
	)
		throw new Error("Invalid QRWTY_PUBLIC_ORIGIN_URL: the public origin, such as https://qrwty.io");
	return origin;
}

/** Built once, when Link API's process loads this module: a missing or invalid setting fails
 * startup naming it, never its value. */
export function linkOperationsFromEnvironment(
	env: NodeJS.ProcessEnv = process.env,
): LinkOperations {
	const origin = publicOrigin(env.QRWTY_PUBLIC_ORIGIN_URL);
	let keyRing: ReturnType<typeof parseKeyRing>;
	try {
		keyRing = parseKeyRing(readSecret("link-replay-keys"));
	} catch (error) {
		const message =
			error instanceof Error && error.message.startsWith("Invalid") ? `: ${error.message}` : "";
		throw new Error(`Unreadable credential link-replay-keys${message}`);
	}
	const failure = createFailureLog("link-api");
	return linkOperations({
		origin,
		keyRing,
		hooks: testHooks(env.QRWTY_TEST_HOOKS),
		reputation: (dependencies) =>
			webRiskReputation(dependencies.reputationApi, {
				onFailure: (error) => failure("reputation check", error),
			}),
		onFailure: failure,
	});
}
