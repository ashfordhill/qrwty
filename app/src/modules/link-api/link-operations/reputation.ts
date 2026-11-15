// The destination reputation check: Google Cloud Web Risk's Lookup API, `uris.search`, behind a
// bounded adapter (decisions §5). It never fetches the destination itself. Locally its base URL
// (`JEEVES_EXTERNAL_REPUTATION_API_URL`) is the neutral pack's Web Risk fixture; production's is
// https://webrisk.googleapis.com, whose credentials arrive with the live provider (Q12a). Until
// then a production call is refused by the provider and creation answers 503: it fails closed.
import type { HttpTarget } from "../../dependencies.ts";

export type Verdict = "clean" | "threat" | "unavailable";
export type ReputationCheck = (destination: string) => Promise<Verdict>;

export const THREAT_TYPES = ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"] as const;
/** The adapter's deadline: Link API answers within its 1000 ms request timeout. */
export const REPUTATION_DEADLINE_MS = 500;
const MAX_RESPONSE_BYTES = 64 * 1024;

async function boundedText(response: Response): Promise<string | undefined> {
	if (!response.body) return "";
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.length;
		if (size > MAX_RESPONSE_BYTES) {
			await reader.cancel().catch(() => {});
			return undefined;
		}
		chunks.push(value);
	}
	return Buffer.concat(chunks).toString("utf8");
}

/** `uris.search` answers `{}` for a clean URI and `{threat: {threatTypes, expireTime}}` otherwise;
 * anything else, a timeout or a network error is `unavailable`. */
export function webRiskReputation(
	target: HttpTarget,
	options: { deadlineMs?: number; onFailure?: (error: unknown) => void } = {},
): ReputationCheck {
	const deadlineMs = options.deadlineMs ?? REPUTATION_DEADLINE_MS;
	return async (destination) => {
		const query = new URLSearchParams();
		for (const type of THREAT_TYPES) query.append("threatTypes", type);
		query.set("uri", destination);
		const signal = AbortSignal.timeout(deadlineMs);
		try {
			const response = await target.request(`/v1/uris:search?${query}`, {
				method: "GET",
				headers: { Accept: "application/json" },
				signal,
			});
			const text = await boundedText(response);
			if (response.status !== 200 || text === undefined) {
				options.onFailure?.(new Error(`Web Risk answered ${response.status}`));
				return "unavailable";
			}
			const body = JSON.parse(text) as { threat?: { threatTypes?: unknown } } | null;
			if (body === null || typeof body !== "object") return "unavailable";
			return body.threat === undefined ? "clean" : "threat";
		} catch (error) {
			options.onFailure?.(error);
			return "unavailable";
		}
	};
}
