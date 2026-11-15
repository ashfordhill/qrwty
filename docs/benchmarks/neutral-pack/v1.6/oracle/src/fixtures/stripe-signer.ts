// Stripe webhook signer: `Stripe-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, "t.payload")>`.
// https://docs.stripe.com/webhooks#verify-manually
import { createHmac } from "node:crypto";

export function signatureHeader(
	payload: Buffer | string,
	secret: string,
	timestamp?: number,
): string {
	const t = timestamp ?? Math.floor(Date.now() / 1000);
	const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
	const mac = createHmac("sha256", secret)
		.update(Buffer.concat([Buffer.from(`${t}.`, "utf8"), body]))
		.digest("hex");
	return `t=${t},v1=${mac}`;
}

export interface SignedDelivery {
	body: Buffer;
	header: string;
}

export function sign(payload: Buffer | string, secret: string, timestamp?: number): SignedDelivery {
	const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
	return { body, header: signatureHeader(body, secret, timestamp) };
}

/** Signed with a different secret: a forgery that still looks well formed. */
export function signWrong(payload: Buffer | string, timestamp?: number): SignedDelivery {
	return sign(payload, "whsec_" + "oracleWrongSecretNotTheArms000000", timestamp);
}

/**
 * Changes exactly one byte: a digit or letter inside the first string value after `"id"`, so the
 * body stays valid JSON and only the signature can tell.
 */
export function alterOneByte(payload: Buffer): { body: Buffer; index: number } {
	const body = Buffer.from(payload);
	const text = body.toString("latin1");
	const idAt = text.indexOf('"id"');
	let index = text.indexOf('"', text.indexOf(":", idAt) + 1) + 1;
	while (index < body.length && !/[0-9A-Za-z]/.test(String.fromCharCode(body[index]))) index++;
	const ch = String.fromCharCode(body[index]);
	body[index] = (
		ch === "z" ? "y" : ch === "Z" ? "Y" : ch === "9" ? "8" : String.fromCharCode(body[index] + 1)
	).charCodeAt(0);
	return { body, index };
}

/** Signs with the real secret, then alters one byte of the body (the header stays valid for the original). */
export function signThenAlterOneByte(
	payload: Buffer | string,
	secret: string,
): SignedDelivery & { alteredIndex: number } {
	const signed = sign(payload, secret);
	const { body, index } = alterOneByte(signed.body);
	return { body, header: signed.header, alteredIndex: index };
}
