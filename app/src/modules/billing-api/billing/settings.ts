// Billing API's own settings. Each kind checks its value in the generated configuration pass, so a
// missing or invalid one fails startup as `Invalid setting <NAME>`, never its value. This run is
// Stripe test mode only (owner decisions of 2026-11-13): a live key is refused at startup.
import { type Setting, secret, text } from "../../../runtime/settings.ts";
import { publicOriginSetting } from "../../link-api/link-operations/settings.ts";

function checked<A, B>(kind: Setting<A>, check: (value: A) => B): Setting<B> {
	return Object.freeze({ ...kind, parse: (raw: string | Buffer) => check(kind.parse(raw)) });
}
const utf8 = (bytes: Uint8Array) => Buffer.from(bytes).toString("utf8").trim();

/** `stripe-secret-key`: a test-mode secret or restricted key only. */
export const stripeKeySetting = checked(secret(), (bytes) => {
	const key = utf8(bytes);
	if (!/^(sk|rk)_test_[A-Za-z0-9]{10,}$/.test(key))
		throw new Error("Invalid STRIPE_SECRET_KEY: a Stripe test-mode key");
	return key;
});
/** `stripe-webhook-secret`: the endpoint's signing secret. */
export const webhookSecretSetting = checked(secret(), (bytes) => {
	const value = utf8(bytes);
	if (!/^whsec_[A-Za-z0-9+/=]{16,}$/.test(value))
		throw new Error("Invalid STRIPE_WEBHOOK_SECRET: a Stripe endpoint secret");
	return value;
});
/** The allowlisted paid price (decisions §4: configuration, never source or a diagram). */
export const priceSetting = checked(text(), (value) => {
	if (!/^price_[A-Za-z0-9_]{1,250}$/.test(value))
		throw new Error("Invalid STRIPE_PRICE_PAID_MONTHLY: a Stripe price ID");
	return value;
});
/** The customer-portal configuration Manage payment opens. */
export const portalSetting = checked(text(), (value) => {
	if (!/^bpc_[A-Za-z0-9]{1,250}$/.test(value))
		throw new Error("Invalid STRIPE_PORTAL_CONFIGURATION: a portal configuration ID");
	return value;
});
export { publicOriginSetting };
