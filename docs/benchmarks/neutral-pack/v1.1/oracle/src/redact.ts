// Secrets never appear in results or captures (oracle-tooling-plan.md, "Results").

const secretValues = new Set<string>();

/** Registers a secret value (from an environment variable) so every output redacts it. */
export function registerSecret(value: string | undefined): void {
	if (value && value.length >= 4) secretValues.add(value);
}

export const DROPPED_HEADERS = new Set([
	"cookie",
	"set-cookie",
	"authorization",
	"proxy-authorization",
	"x-oracle-edge-token",
	"x-csrf-token",
	"stripe-signature",
]);

const PATTERNS: RegExp[] = [
	/\b[sr]k_(?:test|live)_[A-Za-z0-9]{6,}\b/g,
	/\bwhsec_[A-Za-z0-9]{6,}\b/g,
	/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
	/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]*/g,
	/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
	/\bAIza[0-9A-Za-z_-]{20,}\b/g,
];

export function redactText(text: string): string {
	let out = text;
	for (const value of secretValues) out = out.split(value).join("[redacted]");
	for (const pattern of PATTERNS) out = out.replace(pattern, "[redacted]");
	return out;
}

export function redactHeaders(
	headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) continue;
		const lower = key.toLowerCase();
		if (DROPPED_HEADERS.has(lower)) continue;
		out[lower] = redactText(Array.isArray(value) ? value.join(", ") : value);
	}
	return out;
}

/** Deep-redacts any JSON-like value; keys named like credentials are dropped. */
export function redactValue(value: unknown): unknown {
	if (typeof value === "string") return redactText(value);
	if (Array.isArray(value)) return value.map(redactValue);
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			if (DROPPED_HEADERS.has(key.toLowerCase())) continue;
			if (/^(password|secret|token|claimToken|csrfToken|privateJwk|cookie)$/i.test(key)) {
				out[key] = child === null || child === undefined ? child : "[redacted]";
				continue;
			}
			out[key] = redactValue(child);
		}
		return out;
	}
	return value;
}
