// Session API's settings (Jeeves QL05): both stubs declare the same ones, read by the generated
// configuration pass before any client is built, so a missing or invalid one fails startup as
// `Invalid setting <NAME>`, never its value.
//   SIGNIN_ISSUER_URL     the issuer, https://<tenant>/ (the browser's /authorize, the ID token's iss)
//   SIGNIN_CLIENT         the web application's credentials, the file `signin-client`: JSON
//                         {"client_id", "client_secret"} (the client ID is the ID token's audience)
//   SIGNIN_AUDIENCE       the API audience the access token is for (Link, Account and Billing API)
//   QRWTY_PUBLIC_ORIGIN_URL  the public origin (the callback, cookies and the return location)
//   SESSION_KEYS          the key ring `session-keys` (JSON, generated keyRing kind): the first
//                         key seals tokens and signs cookies and CSRF tokens; every key verifies
import { keyRing, secret, text, url } from "../../../runtime/settings.ts";
import { publicOriginSetting } from "../../link-api/link-operations/settings.ts";

const issuer = url({ protocols: ["https:"] });

export const sessionSettings = {
	SIGNIN_ISSUER_URL: Object.freeze({
		...issuer,
		parse: (raw: string | Buffer) => {
			const value = issuer.parse(raw);
			if (value.pathname !== "/" || value.search || value.hash) throw new Error("Invalid value");
			return value;
		},
	}),
	SIGNIN_CLIENT: Object.freeze({
		...secret(),
		parse: (raw: string | Buffer) => {
			const value = JSON.parse(Buffer.from(raw).toString("utf8")) as Record<string, unknown>;
			const id = value.client_id;
			const key = value.client_secret;
			if (
				typeof id !== "string" ||
				!/^[A-Za-z0-9_-]{8,128}$/.test(id) ||
				typeof key !== "string" ||
				key.length < 16 ||
				key.length > 512
			)
				throw new Error("Invalid value");
			return Object.freeze({ clientId: id, clientSecret: key });
		},
	}),
	SIGNIN_AUDIENCE: text({ max: 256 }),
	QRWTY_PUBLIC_ORIGIN_URL: publicOriginSetting,
	SESSION_KEYS: keyRing(),
} as const;
