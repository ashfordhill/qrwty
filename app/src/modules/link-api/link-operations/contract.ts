// The product error contract (http-contract §2): {"error": {code, message, retryable}}, with an
// optional `reason`. The status is authoritative; every 503 says when to retry.
import type { ModuleResponse } from "../../entry.ts";

export type ProblemOptions = {
	reason?: string;
	retryAfterSeconds?: number;
	headers?: Record<string, string>;
};

export function problem(
	status: number,
	code: string,
	message: string,
	retryable: boolean,
	options: ProblemOptions = {},
): ModuleResponse {
	const headers: Record<string, string> = { ...options.headers };
	if (options.retryAfterSeconds !== undefined)
		headers["Retry-After"] = String(options.retryAfterSeconds);
	return {
		status,
		headers,
		body: {
			error: {
				code,
				message,
				retryable,
				...(options.reason === undefined ? {} : { reason: options.reason }),
			},
		},
	};
}

/** A transient failure: retry after `seconds`. */
export const unavailable = (code: string, message: string, seconds = 1): ModuleResponse =>
	problem(503, code, message, true, { retryAfterSeconds: seconds });

export const notFound = (): ModuleResponse => problem(404, "not_found", "Not found.", false);

/** A header's single value, or undefined when it is absent or sent more than once. */
export function singleHeader(headers: Record<string, string | string[] | undefined>, name: string) {
	const value = headers[name];
	return typeof value === "string" ? value : undefined;
}
