// Account deletion's issuer part (A3b): the account's user at Auth0 is deleted too, so signing in
// again starts a new account rather than an empty one with the same subject. Session API calls
// Auth0's Management API as the machine-to-machine application `qrwtya-account-erasure`, whose only
// permission is `delete:users` (infra/gcp/scripts/auth0.py). Its {client_id, client_secret} is the
// file `account-erasure-client` (Secret Manager `qrwtya-account-erasure-client`). The Management API
// token is cached in memory until a minute before it expires.
import type { HttpTarget } from "../../dependencies.ts";

export type ErasureClient = { clientId: string; clientSecret: string };
export type UserEraser = {
	/** Fetches the Management API token now, unless one is cached (a failure is left to `erase`). */
	warm(signal: AbortSignal): Promise<void>;
	erase(subject: string, signal: AbortSignal): Promise<"deleted" | "absent">;
};

/** The setting's file: JSON {"client_id", "client_secret"}. */
export function parseErasureClient(raw: string | Buffer): ErasureClient {
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
}

/** Deletes a user at the issuer (`issuer` is https://<tenant>/), through Session API's Identity
 * client. A user already gone is `absent`; any other answer throws. */
export function auth0UserEraser(
	identity: HttpTarget,
	issuer: URL,
	client: ErasureClient,
	now: () => number = Date.now,
): UserEraser {
	const audience = new URL("api/v2/", issuer).href;
	let cached: { token: string; until: number } | undefined;

	async function token(signal: AbortSignal): Promise<string> {
		if (cached && cached.until > now()) return cached.token;
		const response = await identity.request("/oauth/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
			body: new URLSearchParams({
				grant_type: "client_credentials",
				client_id: client.clientId,
				client_secret: client.clientSecret,
				audience,
			}).toString(),
			signal,
		});
		const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
		const access = body.access_token;
		const lifetime = body.expires_in;
		if (!response.ok || typeof access !== "string" || typeof lifetime !== "number")
			throw new Error(`Management token endpoint answered ${response.status}`);
		cached = { token: access, until: now() + Math.max(0, lifetime - 60) * 1000 };
		return access;
	}

	let pending: Promise<string> | undefined;
	/** One token request at a time: a warm-up and the deletion that follows share it. */
	const shared = (signal: AbortSignal) => {
		if (cached && cached.until > now()) return Promise.resolve(cached.token);
		pending ??= token(signal).finally(() => {
			pending = undefined;
		});
		return pending;
	};

	return {
		warm: async (signal) => {
			await shared(signal).catch(() => {});
		},
		erase: async (subject, signal) => {
			const bearer = await shared(signal);
			const response = await identity.request(`/api/v2/users/${encodeURIComponent(subject)}`, {
				method: "DELETE",
				headers: { authorization: `Bearer ${bearer}` },
				signal,
			});
			await response.body?.cancel().catch(() => {});
			if (response.status === 204 || response.status === 200) return "deleted";
			if (response.status === 404) return "absent";
			if (response.status === 401) cached = undefined;
			throw new Error(`Management API user deletion answered ${response.status}`);
		},
	};
}
