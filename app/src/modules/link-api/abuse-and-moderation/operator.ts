// Who may moderate (http-contract §8): an operator is a verified account whose subject is in
// OPERATOR_SUBJECTS (empty in this run: no account is one), or the operator CLI
// (infra/gcp/scripts/operator.mjs), whose every request is signed with the operator key: a secret
// only the project's owners (through Secret Manager) and Link API hold. Anyone else is not an
// operator, and the routes answer them 404.
//
// The CLI's request carries four headers, which Session API passes on unchanged:
//   QRWTY-Operator-Actor      who runs it (the gcloud account), 1–200 visible ASCII characters
//   QRWTY-Operator-Time       unix seconds; accepted within 120 seconds of Link API's clock
//   QRWTY-Operator-Nonce      16–64 base64url characters; a block or unblock records it, once
//   QRWTY-Operator-Signature  base64url HMAC-SHA-256, with the key, of the lines
//                             "qrwty-operator-v1", method, path, time, nonce, actor, reason
// where path is the route below /api/v1/operator (`/links/<id>/block`) and reason the body's
// reason ("" for a read). A replayed block or unblock is refused by its nonce.
import { createHmac, timingSafeEqual } from "node:crypto";

export const OPERATOR_HEADERS = {
	actor: "qrwty-operator-actor",
	time: "qrwty-operator-time",
	nonce: "qrwty-operator-nonce",
	signature: "qrwty-operator-signature",
} as const;
export const OPERATOR_WINDOW_SECONDS = 120;

export type Operator = { actor: string; requestId: string | null };

/** The text the CLI signs. */
export const operatorPayload = (parts: {
	method: string;
	path: string;
	time: string;
	nonce: string;
	actor: string;
	reason: string;
}) =>
	[
		"qrwty-operator-v1",
		parts.method,
		parts.path,
		parts.time,
		parts.nonce,
		parts.actor,
		parts.reason,
	].join("\n");

export const operatorSignature = (key: Uint8Array, payload: string) =>
	createHmac("sha256", operatorKeyBytes(key)).update(payload).digest("base64url");

/** The key file's text, trimmed (a newline at its end is not part of the key). */
export const operatorKeyBytes = (key: Uint8Array) =>
	Buffer.from(Buffer.from(key).toString("utf8").trim(), "utf8");

/** OPERATOR_SUBJECTS: comma- or space-separated subjects; absent or empty is nobody. */
export function operatorSubjects(value: string | undefined): ReadonlySet<string> {
	return new Set((value ?? "").split(/[\s,]+/).filter((subject) => subject.length > 0));
}

const one = (headers: Record<string, string | string[] | undefined>, name: string) => {
	const value = headers[name];
	return typeof value === "string" ? value : undefined;
};

/** The request's operator, or undefined when it is not one. */
export function operatorOf(
	request: {
		method: string;
		headers: Record<string, string | string[] | undefined>;
		caller: { signedIn: true; principal: { subject: string } } | { signedIn: false };
	},
	path: string,
	reason: string,
	settings: { subjects: ReadonlySet<string>; key: Uint8Array | undefined },
	nowSeconds = Math.floor(Date.now() / 1000),
): Operator | undefined {
	if (request.caller.signedIn)
		return settings.subjects.has(request.caller.principal.subject)
			? { actor: `account:${request.caller.principal.subject}`.slice(0, 255), requestId: null }
			: undefined;
	const signature = one(request.headers, OPERATOR_HEADERS.signature);
	if (signature === undefined || settings.key === undefined) return undefined;
	const actor = one(request.headers, OPERATOR_HEADERS.actor);
	const time = one(request.headers, OPERATOR_HEADERS.time);
	const nonce = one(request.headers, OPERATOR_HEADERS.nonce);
	if (
		actor === undefined ||
		!/^[!-~]{1,200}$/.test(actor) ||
		time === undefined ||
		!/^[1-9][0-9]{0,11}$/.test(time) ||
		Math.abs(Number(time) - nowSeconds) > OPERATOR_WINDOW_SECONDS ||
		nonce === undefined ||
		!/^[A-Za-z0-9_-]{16,64}$/.test(nonce) ||
		!/^[A-Za-z0-9_-]{43}$/.test(signature)
	)
		return undefined;
	const expected = Buffer.from(
		operatorSignature(
			settings.key,
			operatorPayload({ method: request.method, path, time, nonce, actor, reason }),
		),
	);
	const given = Buffer.from(signature);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined;
	return { actor: `cli:${actor}`, requestId: nonce };
}
