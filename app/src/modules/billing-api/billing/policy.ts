// QRWTY's tier policy (decisions §4, billing contract): TEST FIXTURES, NOT APPROVED PRICING. The
// server maps the one allowlisted price (STRIPE_PRICE_PAID_MONTHLY, configuration) to
// `paid-test-v1`; every other account is on `free-test-v1`. A browser never names a price, tier,
// customer or account. Pure functions only, so every transition is unit-tested.

export type PolicyName = "free-test-v1" | "paid-test-v1";
export type Limits = {
	ownedLinkCreatesPerMonth: number;
	lookbackDays: number;
	breakdowns: boolean;
	csvExportsPerMonth: number;
};

export const POLICIES: Readonly<Record<PolicyName, Readonly<Limits>>> = Object.freeze({
	"free-test-v1": Object.freeze({
		ownedLinkCreatesPerMonth: 5,
		lookbackDays: 7,
		breakdowns: false,
		csvExportsPerMonth: 1,
	}),
	"paid-test-v1": Object.freeze({
		ownedLinkCreatesPerMonth: 50,
		lookbackDays: 90,
		breakdowns: true,
		csvExportsPerMonth: 20,
	}),
});

/** The one paid plan's logical key (decisions §4); its price ID is configuration. */
export const PAID_PLAN = "paid-monthly";
/** The offline fixture price, which production configuration refuses (decisions §4). */
export const FIXTURE_PRICE = "price_TEST_qrwty_paid_monthly_v1";
/** Payment grace: 7 days from the first unresolved failure (decisions §3). */
export const GRACE_MS = 7 * 86_400_000;
/** An active subscription whose period ended stays paid this long while reconciliation catches up
 * with the renewal (finite: a provider outage never extends Paid indefinitely). */
export const RENEWAL_SLACK_MS = 2 * 86_400_000;
/** Grants are valid for at most 60 seconds (decisions §3). */
export const GRANT_VALID_MS = 60_000;

/** The product contract's subscription statuses (http-contract §9). */
export type Status = "none" | "incomplete" | "active" | "past_due" | "canceled" | "expired";

/** Stripe's subscription status as the product's. */
export function productStatus(stripe: string | null | undefined): Status {
	switch (stripe) {
		case "active":
		case "trialing":
			return "active";
		case "past_due":
		case "unpaid":
			return "past_due";
		case "incomplete":
			return "incomplete";
		case "incomplete_expired":
		case "paused":
			return "expired";
		case "canceled":
			return "canceled";
		default:
			return "none";
	}
}

/** What the Billing database knows of an account's subscription. */
export type SubscriptionState = {
	status: Status;
	/** The end of the paid period (Stripe's current period end), or null. */
	paidThrough: Date | null;
	cancelAtPeriodEnd: boolean;
	/** When the first unresolved payment failure was seen, or null. */
	firstFailureAt: Date | null;
	/** True only when the subscription's price is the allowlisted paid price. */
	allowlistedPrice: boolean;
};

export const graceUntil = (state: Pick<SubscriptionState, "status" | "firstFailureAt">) =>
	state.status === "past_due" && state.firstFailureAt
		? new Date(state.firstFailureAt.getTime() + GRACE_MS)
		: null;

/** The policy an account is on at `now`. Paid only from the allowlisted price, and only while the
 * subscription is active (to its paid-through date plus a finite renewal slack, so a cancel at
 * period end ends Paid there) or past due within its 7-day grace. Anything else is Free. */
export function policyFor(state: SubscriptionState, now: Date): PolicyName {
	if (!state.allowlistedPrice) return "free-test-v1";
	const at = now.getTime();
	if (state.status === "active") {
		if (!state.paidThrough) return "free-test-v1";
		const end = state.paidThrough.getTime() + (state.cancelAtPeriodEnd ? 0 : RENEWAL_SLACK_MS);
		return at < end ? "paid-test-v1" : "free-test-v1";
	}
	if (state.status === "past_due") {
		const grace = graceUntil(state);
		return grace && at < grace.getTime() ? "paid-test-v1" : "free-test-v1";
	}
	return "free-test-v1";
}

/** The first failure time after a status change: kept while past due (duplicate events never
 * extend the grace), set on the first past-due state, cleared once the subscription is paid. */
export function nextFirstFailure(
	previous: Date | null,
	status: Status,
	now: Date,
	failedAt: Date | null = null,
): Date | null {
	if (status !== "past_due") return null;
	if (previous) return previous;
	return failedAt && failedAt.getTime() <= now.getTime() ? failedAt : now;
}

/** The UTC calendar month of `at`: [start, end). */
export function monthPeriod(at: Date): { start: Date; end: Date } {
	const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
	const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
	return { start, end };
}

export type Grant = {
	accountId: string;
	policy: PolicyName;
	revision: number;
	limits: Limits;
	effectiveFrom: string;
	effectiveUntil: string | null;
	validUntil: string;
};

/** A versioned, bounded entitlement grant (billing contract: valid for at most 60 seconds). */
export function grantFor(
	accountId: string,
	state: SubscriptionState,
	revision: number,
	now: Date,
): Grant {
	const policy = policyFor(state, now);
	let until: Date | null = null;
	if (policy === "paid-test-v1")
		until =
			state.status === "past_due"
				? graceUntil(state)
				: state.paidThrough
					? new Date(state.paidThrough.getTime() + (state.cancelAtPeriodEnd ? 0 : RENEWAL_SLACK_MS))
					: null;
	return {
		accountId,
		policy,
		revision,
		limits: { ...POLICIES[policy] },
		effectiveFrom: now.toISOString(),
		effectiveUntil: until ? until.toISOString() : null,
		validUntil: new Date(now.getTime() + GRANT_VALID_MS).toISOString(),
	};
}

/** True when a grant from Billing API is well formed and still valid at `now`. */
export function validGrant(value: unknown, now: number): value is Grant {
	if (!value || typeof value !== "object") return false;
	const grant = value as Partial<Grant>;
	if (grant.policy !== "free-test-v1" && grant.policy !== "paid-test-v1") return false;
	const until = typeof grant.validUntil === "string" ? Date.parse(grant.validUntil) : Number.NaN;
	if (!(until > now) || until - now > GRANT_VALID_MS + 5_000) return false;
	const limits = grant.limits as Partial<Limits> | undefined;
	return (
		!!limits &&
		Number.isInteger(limits.ownedLinkCreatesPerMonth) &&
		Number.isInteger(limits.lookbackDays) &&
		Number.isInteger(limits.csvExportsPerMonth) &&
		typeof limits.breakdowns === "boolean"
	);
}
