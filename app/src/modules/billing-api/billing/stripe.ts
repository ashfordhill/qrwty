// Stripe over the generated External API target (JEEVES_EXTERNAL_STRIPE_API_URL): form-encoded
// requests with the secret key, a pinned API version and an idempotency key on every create, and
// the webhook signature check Stripe documents (HMAC-SHA-256 over `<t>.<raw body>` with the
// endpoint secret, compared in constant time, within a 300-second tolerance), done over the exact
// bytes received, before anything parses them. No Stripe SDK: `node:crypto` and `fetch` only.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { HttpTarget } from "../../dependencies.ts";

/** The API version every request and the webhook endpoint use (pinned, not the account's). */
export const STRIPE_VERSION = "2025-09-30.clover";
export const SIGNATURE_TOLERANCE_SECONDS = 300;
/** A Stripe call's own bound, apart from the request's deadline (so a create that Stripe has done
 * is recorded even when the browser's request has already been answered). */
export const STRIPE_TIMEOUT_MS = 8_000;

export class StripeError extends Error {
	constructor(
		readonly status: number,
		readonly code: string | undefined,
		message: string,
	) {
		super(message);
	}
	/** 429, 409 (an idempotent request still running) and 5xx are worth retrying. */
	get retryable() {
		return this.status === 0 || this.status === 409 || this.status === 429 || this.status >= 500;
	}
}

type Form = Record<string, string | number | boolean | undefined>;

/** Stripe's form encoding of a flat map (nested keys are already `a[b][c]`). */
export function formBody(fields: Form): string {
	const body = new URLSearchParams();
	for (const [name, value] of Object.entries(fields))
		if (value !== undefined) body.append(name, String(value));
	return body.toString();
}

export type Stripe = {
	get<T>(path: string, query?: Form): Promise<T>;
	post<T>(path: string, fields: Form, idempotencyKey?: string): Promise<T>;
	delete<T>(path: string, idempotencyKey?: string): Promise<T>;
};

export function stripeClient(target: HttpTarget, secretKey: string): Stripe {
	const key = secretKey.trim();
	const call = async <T>(method: string, path: string, body?: string, idempotencyKey?: string) => {
		let response: Response;
		try {
			response = await target.request(path, {
				method,
				headers: {
					authorization: `Bearer ${key}`,
					"stripe-version": STRIPE_VERSION,
					accept: "application/json",
					...(body === undefined ? {} : { "content-type": "application/x-www-form-urlencoded" }),
					...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
				},
				...(body === undefined ? {} : { body }),
				signal: AbortSignal.timeout(STRIPE_TIMEOUT_MS),
			});
		} catch (error) {
			throw new StripeError(0, "network", `Stripe unreachable: ${(error as Error).name}`);
		}
		const text = await response.text();
		let data: unknown;
		try {
			data = JSON.parse(text);
		} catch {
			data = undefined;
		}
		if (!response.ok) {
			const error = (data as { error?: { code?: string; type?: string } } | undefined)?.error;
			// Never the message: it can quote request fields.
			throw new StripeError(
				response.status,
				error?.code ?? error?.type,
				`Stripe ${method} ${path.split("?")[0]} answered ${response.status}${error?.code ? ` ${error.code}` : ""}`,
			);
		}
		return data as T;
	};
	return {
		get: (path, query) => call("GET", query ? `${path}?${formBody(query)}` : path),
		post: (path, fields, idempotencyKey) => call("POST", path, formBody(fields), idempotencyKey),
		delete: (path, idempotencyKey) => call("DELETE", path, undefined, idempotencyKey),
	};
}

/** The `Stripe-Signature` header's verdict over the raw body bytes. */
export function verifyStripeSignature(
	raw: Uint8Array | undefined,
	header: string | undefined,
	secret: string,
	nowSeconds: number,
	toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS,
): "ok" | "missing" | "malformed" | "stale" | "mismatch" {
	if (!raw || !header) return "missing";
	let timestamp: number | undefined;
	const signatures: Buffer[] = [];
	for (const part of header.split(",")) {
		const at = part.indexOf("=");
		if (at < 1) continue;
		const name = part.slice(0, at).trim();
		const value = part.slice(at + 1).trim();
		if (name === "t" && /^\d{1,12}$/.test(value)) timestamp = Number(value);
		if (name === "v1" && /^[0-9a-f]{64}$/.test(value)) signatures.push(Buffer.from(value, "hex"));
	}
	if (timestamp === undefined || signatures.length === 0) return "malformed";
	if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return "stale";
	const expected = createHmac("sha256", secret.trim()).update(`${timestamp}.`).update(raw).digest();
	return signatures.some((signature) => timingSafeEqual(signature, expected)) ? "ok" : "mismatch";
}

/** A test helper's counterpart: the header Stripe would send for `raw` at `t` (tests only). */
export function signStripePayload(raw: Uint8Array, secret: string, t: number): string {
	const mac = createHmac("sha256", secret).update(`${t}.`).update(raw).digest("hex");
	return `t=${t},v1=${mac}`;
}

// The parts of Stripe's objects QRWTY reads (API version STRIPE_VERSION).
export type StripeCustomer = { id: string; deleted?: boolean };
export type StripeCheckoutSession = {
	id: string;
	url: string | null;
	status: "open" | "complete" | "expired" | null;
	customer: string | null;
	subscription: string | null;
	expires_at: number;
	metadata?: Record<string, string>;
};
export type StripeSubscription = {
	id: string;
	customer: string;
	status: string;
	cancel_at_period_end: boolean;
	cancel_at?: number | null;
	created: number;
	current_period_end?: number;
	items: { data: { price: { id: string }; current_period_end?: number }[] };
	latest_invoice?: string | { id: string } | null;
	metadata?: Record<string, string>;
};
export type StripeList<T> = { data: T[]; has_more: boolean };
export type StripePortalSession = { id: string; url: string };

/** A subscription's paid-through time: the item's current period end (since 2025-03-31.basil),
 * or the subscription's own on older versions. */
export function periodEnd(subscription: StripeSubscription): Date | null {
	const seconds =
		subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
	return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

const RANK: Record<string, number> = {
	active: 6,
	trialing: 6,
	past_due: 5,
	unpaid: 4,
	incomplete: 3,
	paused: 2,
	canceled: 1,
	incomplete_expired: 0,
};

/** The subscription that decides an account's state: the live one (active, past due, ...) before
 * an ended one, the newest among equals. */
export function currentSubscription(
	list: readonly StripeSubscription[],
): StripeSubscription | undefined {
	return [...list].sort(
		(a, b) => (RANK[b.status] ?? -1) - (RANK[a.status] ?? -1) || b.created - a.created,
	)[0];
}
