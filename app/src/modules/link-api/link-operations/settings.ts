// Link API's own settings (Jeeves QL05): the kinds its stub's `settings` export declares. The
// generated configuration pass reads them before any client is built or probed, and each kind
// checks its value there, so a missing or invalid one fails startup as `Invalid setting <NAME>`,
// never its value. The generated kinds have no enumeration or custom check, so `checked` adds the
// application's own check to one (A1 gap AG-19).
import { type Setting, secret, text } from "../../../runtime/settings.ts";
import { reputationCredentials } from "./google-credentials.ts";
import { parseKeyRing } from "./replay-seal.ts";

/** `kind`, whose value `check` then checks or converts (throwing when it is invalid). */
function checked<A, B>(kind: Setting<A>, check: (value: A) => B): Setting<B> {
	return Object.freeze({ ...kind, parse: (raw: string | Buffer) => check(kind.parse(raw)) });
}

/** `QRWTY_PUBLIC_ORIGIN_URL`: the public origin itself (`https://qrwty.io`), no path. */
export function publicOrigin(value: string | undefined): URL {
	let origin: URL | undefined;
	try {
		origin = value === undefined ? undefined : new URL(value);
	} catch {
		origin = undefined;
	}
	if (
		!origin ||
		(origin.protocol !== "https:" && origin.protocol !== "http:") ||
		origin.origin !== value
	)
		throw new Error("Invalid QRWTY_PUBLIC_ORIGIN_URL: the public origin, such as https://qrwty.io");
	return origin;
}

/** The public origin: short URLs are `<origin>/<slug>`, and a destination on its host loops. */
export const publicOriginSetting = checked(text(), publicOrigin);
/** The claim-proof seal ring, the credential file `link-replay-keys` (format in replay-seal.ts). */
export const replayKeyRingSetting = checked(secret(), (bytes) =>
	parseKeyRing(Buffer.from(bytes).toString("utf8")),
);
/** Web Risk's credential: `metadata` on Cloud Run (google-credentials.ts); optional. */
export const reputationCredentialsSetting = checked(text(), reputationCredentials);
/** TEST PROFILE ONLY: `on` opens the oracle's hooks (test-hooks.ts); optional. */
export const testHooksSetting = checked(text(), (value) => {
	if (value !== "on")
		throw new Error("Invalid QRWTY_TEST_HOOKS: absent, or on in the test profile");
	return value;
});
