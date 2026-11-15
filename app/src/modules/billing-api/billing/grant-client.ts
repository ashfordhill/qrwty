// What Link API and Account API ask Billing API's Entitlements (entitlements.ts), with the caller's
// own bearer. A grant is used only while it is valid (at most 60 seconds); with none (Billing API
// down, slow or answering something else) the caller falls back to Free, so paid-gated operations
// fail closed while free creation, ungated reads and redirects go on (billing contract).

import type { HttpTarget } from "../../dependencies.ts";
import { type Grant, POLICIES, validGrant } from "./policy.ts";

export const ENTITLEMENTS = "/modules/billing-api-entitlements";
/** A grant lookup's own bound: well inside the caller's 1-second request deadline. */
export const GRANT_TIMEOUT_MS = 600;

const bound = (signal: AbortSignal | undefined, ms: number) =>
	signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);

/** The caller's grant, or undefined when Billing API gave no valid one. */
export async function fetchGrant(
	billingApi: HttpTarget,
	authorization: string | undefined,
	signal?: AbortSignal,
	now: () => number = Date.now,
): Promise<Grant | undefined> {
	if (!authorization) return undefined;
	try {
		const response = await billingApi.request(`${ENTITLEMENTS}/grant`, {
			headers: { authorization, accept: "application/json" },
			signal: bound(signal, GRANT_TIMEOUT_MS),
		});
		if (response.status !== 200) {
			await response.body?.cancel();
			return undefined;
		}
		const grant = (await response.json()) as unknown;
		return validGrant(grant, now()) ? grant : undefined;
	} catch {
		return undefined;
	}
}

/** Free's limits, for a caller with no valid grant. */
export const FREE_LIMITS = POLICIES["free-test-v1"];

export type ExportSpend =
	| { kind: "spent"; used: number; limit: number }
	| { kind: "refused"; status: number; body: unknown }
	| { kind: "unavailable" };

/** Spends one CSV export of the caller's month with Billing API. */
export async function spendExport(
	billingApi: HttpTarget,
	authorization: string | undefined,
	signal?: AbortSignal,
): Promise<ExportSpend> {
	if (!authorization) return { kind: "unavailable" };
	try {
		const response = await billingApi.request(`${ENTITLEMENTS}/exports`, {
			method: "POST",
			headers: { authorization, accept: "application/json" },
			signal: bound(signal, GRANT_TIMEOUT_MS),
		});
		const body = (await response.json().catch(() => undefined)) as
			| { used?: number; limit?: number; error?: { code?: string } }
			| undefined;
		if (response.status === 200 && typeof body?.used === "number")
			return { kind: "spent", used: body.used, limit: body.limit ?? 0 };
		if (response.status === 403 && body?.error?.code === "quota_exceeded")
			return { kind: "refused", status: 403, body };
		return { kind: "unavailable" };
	} catch {
		return { kind: "unavailable" };
	}
}
