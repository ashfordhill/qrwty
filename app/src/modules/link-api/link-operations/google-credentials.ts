// Link API's own Google identity for Web Risk (Q13). On Cloud Run the process's service account
// has an OAuth access token at the metadata server; `QRWTY_REPUTATION_CREDENTIALS=metadata` makes
// the Web Risk adapter send it. The generated External API client reads no credential and has no
// workload-identity option (A-found gap AG-13), so the adapter adds the header itself. Locally the
// variable is unset and the neutral pack's Web Risk fixture gets no credential.

/** Returns a bearer access token, or throws (the caller then fails closed). */
export type TokenSource = (signal: AbortSignal) => Promise<string>;

/** The metadata server by address, so a DNS failure can't stand in front of it. */
export const METADATA_TOKEN_URL =
	"http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token";
/** A token is replaced this long before Google says it expires. */
const REFRESH_MARGIN_MS = 60_000;

/** `QRWTY_REPUTATION_CREDENTIALS`: unset (no credential) or `metadata`. */
export function reputationCredentials(value: string | undefined): "none" | "metadata" {
	if (value === undefined || value === "") return "none";
	if (value === "metadata") return "metadata";
	throw new Error("Invalid QRWTY_REPUTATION_CREDENTIALS: unset, or metadata");
}

/** The metadata server's token for the default service account, cached until shortly before it
 * expires (on a monotonic clock). A failure is never cached. */
export function metadataTokenSource(
	options: { fetch?: typeof fetch; now?: () => number; url?: string } = {},
): TokenSource {
	const get = options.fetch ?? fetch;
	const now = options.now ?? (() => performance.now());
	const url = options.url ?? METADATA_TOKEN_URL;
	let cached: { token: string; refreshAt: number } | undefined;
	return async (signal) => {
		if (cached && now() < cached.refreshAt) return cached.token;
		const response = await get(url, { headers: { "Metadata-Flavor": "Google" }, signal });
		if (response.status !== 200) throw new Error(`metadata token: HTTP ${response.status}`);
		const body = (await response.json()) as {
			access_token?: unknown;
			expires_in?: unknown;
			token_type?: unknown;
		};
		if (
			typeof body.access_token !== "string" ||
			body.access_token === "" ||
			typeof body.expires_in !== "number" ||
			!(body.expires_in > 0) ||
			typeof body.token_type !== "string" ||
			body.token_type.toLowerCase() !== "bearer"
		)
			throw new Error("metadata token: unexpected answer");
		cached = {
			token: body.access_token,
			refreshAt: now() + Math.max(0, body.expires_in * 1000 - REFRESH_MARGIN_MS),
		};
		return cached.token;
	};
}
