// Abuse and moderation, a Custom in Link API: Bounded public abuse reports (202, no disposition shown) and block or unblock under a separate operator permission. A report alone never disables a link.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./link-api-abuse-and-moderation.slots.ts";
import { declareSettings, optional, secret, text } from "../../runtime/settings.ts";
import { createFailureLog } from "../../runtime/tile-process.ts";
import { sharedAdmission } from "./abuse-and-moderation/admission.ts";
import { operatorSubjects } from "./abuse-and-moderation/operator.ts";
import { moderationRoutes } from "./abuse-and-moderation/routes.ts";
import { notFound, problem } from "./link-operations/contract.ts";
import { publicOriginSetting } from "./link-operations/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  // The public origin: a report names a short link on it.
  QRWTY_PUBLIC_ORIGIN_URL: publicOriginSetting,
  // Verified subjects that are operators (comma- or space-separated); absent is nobody (Q09).
  OPERATOR_SUBJECTS: optional(text({ max: 4096 })),
  // The operator CLI's signing key, the file `operator-key` (operator.ts); absent: no CLI.
  OPERATOR_KEY: optional(secret()),
});

type Routes = ReturnType<typeof moderationRoutes>;
const built = new WeakMap<Dependencies["settings"], Routes>();
function routesFor(values: Dependencies["settings"]): Routes {
  let routes = built.get(values);
  if (!routes) {
    const failure = createFailureLog("link-api");
    routes = moderationRoutes({
      origin: values.QRWTY_PUBLIC_ORIGIN_URL,
      subjects: operatorSubjects(values.OPERATOR_SUBJECTS),
      operatorKey: values.OPERATOR_KEY,
      admission: sharedAdmission((error) => failure("admission cache", error)),
      onFailure: failure,
    });
    built.set(values, routes);
  }
  return routes;
}

/** Answers any method on /modules/link-api-abuse-and-moderation and every path below it. */
export async function linkApiAbuseAndModeration(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  const response = await routesFor(dependencies.settings)(request, dependencies);
  // The route table's own 404, 405 and 400 in the product's error shape.
  const body = response.body as { error?: unknown } | undefined;
  if (typeof body?.error !== "string") return response;
  if (response.status === 404) return notFound();
  if (response.status === 405)
    return problem(405, "method_not_allowed", "Method not allowed.", false, {
      headers: { Allow: String(response.headers?.Allow ?? "") },
    });
  return problem(response.status ?? 400, "invalid_request", "Invalid request.", false);
}
