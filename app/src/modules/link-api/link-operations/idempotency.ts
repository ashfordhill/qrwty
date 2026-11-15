// Scoped idempotency (http-contract §2): a key of 1–255 visible ASCII characters, scoped to the
// verified account or the server-issued guest session, with a hash of the request it named.
import { createHash } from "node:crypto";

const KEY = /^[!-~]{1,255}$/;
/** The guest scope Session API forwards: an opaque handle derived from the guest session, never
 * the session's cookie value and never an identity. */
const GUEST_HANDLE = /^[A-Za-z0-9_-]{22,128}$/;

export type Scope = { kind: "guest"; handle: string } | { kind: "account"; subject: string };

export const sha256 = (value: string | Uint8Array): Buffer =>
	createHash("sha256").update(value).digest();

export function validKey(value: string | undefined): value is string {
	return value !== undefined && KEY.test(value);
}

export function validGuestHandle(value: string | undefined): value is string {
	return value !== undefined && GUEST_HANDLE.test(value);
}

/** The stored scope: a hash with a kind prefix, so a guest handle can never equal an account. */
export function scopeHash(scope: Scope): Buffer {
	return sha256(
		scope.kind === "guest" ? `guest\u0000${scope.handle}` : `account\u0000${scope.subject}`,
	);
}

export const keyHash = (key: string): Buffer => sha256(`key\u0000${key}`);

/** The request a key names: its operation and its normalized fields, in a fixed order. */
export function requestHash(operation: string, fields: Record<string, string | null>): Buffer {
	const ordered = Object.keys(fields)
		.sort()
		.map((name) => [name, fields[name] ?? null]);
	return sha256(JSON.stringify([operation, ordered]));
}
