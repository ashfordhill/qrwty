// Session API's per-process state, built once from a stub's dependencies (its clients and the
// settings the generated configuration pass read): the key ring, the Sessions calls and the
// issuer client. Both stubs share it through the same settings values.

import type { KeyRing } from "../../../runtime/settings.ts";
import type { DatabaseReadWriter, HttpTarget } from "../../dependencies.ts";
import { type OidcClient, oidcClient } from "./oidc.ts";
import { type SessionStore, sessionStore } from "./store.ts";

export type SessionSettings = {
	SIGNIN_ISSUER_URL: URL;
	SIGNIN_CLIENT: { clientId: string; clientSecret: string };
	SIGNIN_AUDIENCE: string;
	QRWTY_PUBLIC_ORIGIN_URL: URL;
	SESSION_KEYS: KeyRing;
};
export type SessionContext = {
	ring: KeyRing;
	origin: URL;
	store: SessionStore;
	oidc: OidcClient;
};

const built = new WeakMap<object, SessionContext>();
export function sessionContext(dependencies: {
	sessions: DatabaseReadWriter;
	identity: HttpTarget;
	settings: SessionSettings;
}): SessionContext {
	const { settings } = dependencies;
	let context = built.get(settings);
	if (!context) {
		const origin = settings.QRWTY_PUBLIC_ORIGIN_URL;
		context = {
			ring: settings.SESSION_KEYS,
			origin,
			store: sessionStore(dependencies.sessions),
			oidc: oidcClient(dependencies.identity, {
				issuer: settings.SIGNIN_ISSUER_URL,
				clientId: settings.SIGNIN_CLIENT.clientId,
				clientSecret: settings.SIGNIN_CLIENT.clientSecret,
				audience: settings.SIGNIN_AUDIENCE,
				callback: new URL("/auth/callback", origin).href,
			}),
		};
		built.set(settings, context);
	}
	return context;
}
