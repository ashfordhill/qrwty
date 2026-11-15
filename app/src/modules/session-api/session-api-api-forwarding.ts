// API forwarding, a Custom in Session API: Checks the session cookie and CSRF on mutations, then forwards the bearer token (none on guest create) to Link, Account and Billing APIs. Refreshes tokens with Identity.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./session-api-api-forwarding.slots.ts";
import { declareSettings, optional, secret } from "../../runtime/settings.ts";
import { sessionContext } from "./session/context.ts";
import { auth0UserEraser, parseErasureClient, type UserEraser } from "./session/erasure.ts";
import { forwardRoutes, productShape } from "./session/forward.ts";
import { sessionSettings } from "./session/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  ...sessionSettings,
  // Q09: the Worker's client-address key, the file `client-address-key` (session/client-address.ts);
  // absent: no address is verified and every guest shares one admission key.
  CLIENT_ADDRESS_KEY: optional(secret()),
  // A3b: the `qrwtya-account-erasure` application's {client_id, client_secret}, the file
  // `account-erasure-client` (session/erasure.ts); absent: account deletion leaves the issuer's user.
  ACCOUNT_ERASURE_CLIENT: optional(Object.freeze({ ...secret(), parse: parseErasureClient })),
});

const routes = forwardRoutes();
const erasers = new WeakMap<object, UserEraser>();

/** Answers any method on /modules/session-api-api-forwarding and every path below it. */
export async function sessionApiApiForwarding(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  const { settings: values } = dependencies;
  let eraseUser = erasers.get(values);
  if (!eraseUser && values.ACCOUNT_ERASURE_CLIENT) {
    eraseUser = auth0UserEraser(dependencies.identity, values.SIGNIN_ISSUER_URL, values.ACCOUNT_ERASURE_CLIENT);
    erasers.set(values, eraseUser);
  }
  const context = {
    ...sessionContext(dependencies),
    linkApi: dependencies.linkApi,
    accountApi: dependencies.accountApi,
    billingApi: dependencies.billingApi,
    clientKey: values.CLIENT_ADDRESS_KEY,
    eraseUser,
  };
  return productShape(await routes(request, context));
}
