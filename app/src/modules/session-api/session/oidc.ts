// The issuer (Auth0, owner decisions §12), behind Session API's Identity client: authorization code
// with PKCE S256, state and nonce; the token exchange, refresh and revocation at the issuer with
// the web application's credentials; ID and access tokens verified by the generated
// `createPrincipalVerifier` (issuer, audience, expiry, signature, RS256, the issuer's key set).

import { createRemoteJWKSet } from "jose";
import { createPrincipalVerifier } from "../../../runtime/identity.ts";
import type { HttpTarget } from "../../dependencies.ts";
import { randomToken, sha256 } from "./crypto.ts";

export type OidcSettings = {
	issuer: URL;
	clientId: string;
	clientSecret: string;
	audience: string;
	callback: string;
};
export type TokenSet = {
	access: string;
	refresh: string | null;
	accessExpiresAt: Date;
	idToken?: string;
};
/** The issuer refused the grant (the refresh token or code is no longer valid). */
export class GrantRefused extends Error {
	constructor(readonly code: string) {
		super(`Grant refused: ${code}`);
		this.name = "GrantRefused";
	}
}

export const pkce = () => {
	const verifier = randomToken(32);
	return { verifier, challenge: sha256(verifier).toString("base64url") };
};

export function oidcClient(identity: HttpTarget, settings: OidcSettings) {
	const jwksUrl = new URL(".well-known/jwks.json", settings.issuer).href;
	const issuer = settings.issuer.href;
	// One key set for both verifiers, so a sign-in fetches it once (and on a key rotation).
	const keys = createRemoteJWKSet(new URL(jwksUrl), { timeoutDuration: 800 });
	const verifier = (audience: string) =>
		createPrincipalVerifier(
			{ issuer, audience, jwksUrl, algorithms: ["RS256"], jwksTimeoutMs: 800 },
			keys,
		);
	const verifyId = verifier(settings.clientId);
	const verifyAccess = verifier(settings.audience);

	async function token(form: Record<string, string>, signal: AbortSignal): Promise<TokenSet> {
		const response = await identity.request("/oauth/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
			body: new URLSearchParams({
				...form,
				client_id: settings.clientId,
				client_secret: settings.clientSecret,
			}).toString(),
			signal,
		});
		const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
		if (response.status === 400 || response.status === 401 || response.status === 403)
			throw new GrantRefused(
				typeof body.error === "string" ? body.error : `http_${response.status}`,
			);
		if (!response.ok) throw new Error(`Issuer token endpoint answered ${response.status}`);
		const access = body.access_token;
		const lifetime = body.expires_in;
		if (typeof access !== "string" || typeof lifetime !== "number" || lifetime <= 0)
			throw new Error("Issuer token response without an access token");
		return {
			access,
			refresh: typeof body.refresh_token === "string" ? body.refresh_token : null,
			accessExpiresAt: new Date(Date.now() + lifetime * 1000),
			...(typeof body.id_token === "string" ? { idToken: body.id_token } : {}),
		};
	}

	return {
		authorizeUrl(input: { state: string; nonce: string; challenge: string }) {
			const url = new URL("authorize", settings.issuer);
			url.search = new URLSearchParams({
				response_type: "code",
				client_id: settings.clientId,
				redirect_uri: settings.callback,
				scope: "openid profile email offline_access",
				audience: settings.audience,
				state: input.state,
				nonce: input.nonce,
				code_challenge: input.challenge,
				code_challenge_method: "S256",
			}).toString();
			return url.href;
		},
		logoutUrl(returnTo: string) {
			const url = new URL("v2/logout", settings.issuer);
			url.search = new URLSearchParams({ client_id: settings.clientId, returnTo }).toString();
			return url.href;
		},
		exchange: (code: string, verifier: string, signal: AbortSignal) =>
			token(
				{
					grant_type: "authorization_code",
					code,
					redirect_uri: settings.callback,
					code_verifier: verifier,
				},
				signal,
			),
		refresh: (refreshToken: string, signal: AbortSignal) =>
			token({ grant_type: "refresh_token", refresh_token: refreshToken }, signal),
		/** Revokes a refresh token at the issuer; a failure is the caller's to log. */
		async revoke(refreshToken: string, signal: AbortSignal) {
			const response = await identity.request("/oauth/revoke", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					client_id: settings.clientId,
					client_secret: settings.clientSecret,
					token: refreshToken,
				}),
				signal,
			});
			if (!response.ok) throw new Error(`Issuer revocation answered ${response.status}`);
		},
		/** The ID token's subject and profile, after its signature, issuer, audience, expiry and
		 * nonce (by hash) check out; and the access token is for the same subject. */
		async verify(tokens: TokenSet, nonceSha256: Buffer) {
			if (!tokens.idToken) throw new Error("No ID token");
			const id = await verifyId(tokens.idToken);
			const nonce = id.claims.nonce;
			if (typeof nonce !== "string" || !sha256(nonce).equals(nonceSha256))
				throw new Error("ID token nonce mismatch");
			const access = await verifyAccess(tokens.access);
			if (access.subject !== id.subject) throw new Error("Token subjects differ");
			const text = (name: string) => {
				const value = id.claims[name];
				return typeof value === "string" ? value.slice(0, 320) : null;
			};
			return { subject: id.subject, email: text("email"), name: text("name") };
		},
	};
}
export type OidcClient = ReturnType<typeof oidcClient>;
