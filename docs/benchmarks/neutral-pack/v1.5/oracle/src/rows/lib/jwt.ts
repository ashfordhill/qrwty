// Forged bearer tokens for A14 (node:crypto only).
import { createPrivateKey, sign as cryptoSign, type JsonWebKey, randomUUID } from "node:crypto";

const b64url = (data: Buffer | string) => Buffer.from(data).toString("base64url");

export interface Claims {
	iss: string;
	aud: string;
	sub?: string;
	exp?: number;
	iat?: number;
	[key: string]: unknown;
}

function standard(claims: Claims): Claims {
	const now = Math.floor(Date.now() / 1000);
	return { sub: `oracle-forged-${randomUUID()}`, iat: now, exp: now + 300, ...claims };
}

export function unsignedToken(claims: Claims): string {
	return `${b64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${b64url(JSON.stringify(standard(claims)))}.`;
}

/** Signs with a JWK private key (RSA → RS256, EC P-256 → ES256). */
export function signedToken(claims: Claims, privateJwk: JsonWebKey, kid?: string): string {
	const key = createPrivateKey({ key: privateJwk, format: "jwk" });
	const alg = privateJwk.kty === "EC" ? "ES256" : "RS256";
	const header = { alg, typ: "JWT", ...(kid ? { kid } : {}) };
	const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(standard(claims)))}`;
	const signature =
		alg === "ES256"
			? cryptoSign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" })
			: cryptoSign("sha256", Buffer.from(input), key);
	return `${input}.${b64url(signature)}`;
}
