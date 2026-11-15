// Entitlements' routes, below /modules/billing-api-entitlements, for Link API and Account API only
// (Billing API's ingress is internal, and Session API forwards no path here). The account is the
// subject of the caller's forwarded bearer, which Billing API's guard verifies, so a grant or an
// export is always the caller's own (AG-14: tile calls carry no workload ID token).
//   GET  /grant     a versioned grant, valid for at most 60 seconds (policy.ts)
//   POST /exports   spends one CSV export of this UTC month: 200, or 403 quota_exceeded

import type { DatabaseReadWriter } from "../../dependencies.ts";
import { defineRoutes, type ModuleRequest } from "../../entry.ts";
import { problem, unavailable } from "../../link-api/link-operations/contract.ts";
import { ownerKey } from "../../link-api/link-operations/view.ts";
import { readAccount, stateOf } from "./customer.ts";
import { grantFor, POLICIES, policyFor } from "./policy.ts";
import { SCHEMA } from "./reconcile.ts";

export type EntitlementsContext = {
	billing: DatabaseReadWriter;
	price: string;
	onFailure: (what: string, error: unknown) => void;
	now?: () => Date;
};

export function entitlementRoutes(context: EntitlementsContext) {
	const now = context.now ?? (() => new Date());
	const key = (request: ModuleRequest) =>
		request.caller.signedIn ? ownerKey(request.caller.principal.subject) : undefined;
	const refused = () => problem(401, "unauthenticated", "A verified account is required.", false);
	const down = () => unavailable("billing_unavailable", "Billing is unavailable.", 1);

	return defineRoutes<void>({
		"GET /grant": async (request) => {
			const account = key(request);
			if (!account) return refused();
			try {
				const row = await readAccount(context.billing, account);
				return {
					body: grantFor(
						account.toString("hex"),
						stateOf(row, context.price),
						Number(row?.revision ?? 0),
						now(),
					),
				};
			} catch (error) {
				context.onFailure("grant", error);
				return down();
			}
		},
		"POST /exports": async (request) => {
			const account = key(request);
			if (!account) return refused();
			try {
				const row = await readAccount(context.billing, account);
				const policy = policyFor(stateOf(row, context.price), now());
				const limit = POLICIES[policy].csvExportsPerMonth;
				const [spent] = await context.billing.query<{
					allowed: boolean;
					used: number | null;
					period_end: Date;
				}>(`SELECT * FROM ${SCHEMA}.spend_export($1, $2)`, [account, limit]);
				if (!spent?.allowed)
					return {
						status: 403,
						body: {
							error: {
								code: "quota_exceeded",
								message: "This account has no CSV exports left this month.",
								retryable: false,
								limit,
								used: spent?.used ?? limit,
								periodEnd: spent?.period_end?.toISOString() ?? null,
								policy,
							},
						},
					};
				return {
					body: {
						used: spent.used,
						limit,
						periodEnd: spent.period_end.toISOString(),
						policy,
					},
				};
			} catch (error) {
				context.onFailure("export allowance", error);
				return down();
			}
		},
	});
}
