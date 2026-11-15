// TEST PROFILE ONLY. The oracle's test control interface for Link API (acceptance-oracle §2):
// the `force-slug-collision` fault point and the test clock offset. They exist only when
// QRWTY_TEST_HOOKS=on, which the production preflight refuses (`^QRWTY_TEST_`, R01); otherwise
// every hook route is 404 and nothing here changes behaviour. State is per process: the
// oracle's command sets it on every Link API replica.
import type { ModuleRequest, ModuleResponse } from "../../entry.ts";
import { notFound, problem } from "./contract.ts";
import { SLUG_PATTERN } from "./slug.ts";

/** At most about 400 days either way. */
const MAX_CLOCK_OFFSET_MS = 400 * 24 * 3_600_000;

export interface TestHooks {
	readonly enabled: boolean;
	forcedSlugs(): readonly string[];
	clockOffsetMs(): number;
	/** Answers `/__test/...` while enabled; otherwise 404. */
	handle(request: ModuleRequest): ModuleResponse;
}

export function testHooks(setting: string | undefined): TestHooks {
	if (setting !== undefined && setting !== "on")
		throw new Error("Invalid QRWTY_TEST_HOOKS: absent, or on in the test profile");
	const enabled = setting === "on";
	let forced: string[] = [];
	let offsetMs = 0;
	const state = () => ({
		status: 200,
		body: { ok: true, faultPoints: { "force-slug-collision": forced }, clockOffsetMs: offsetMs },
	});
	return {
		enabled,
		forcedSlugs: () => forced,
		clockOffsetMs: () => offsetMs,
		handle(request) {
			if (!enabled) return notFound();
			const body = (request.body ?? {}) as Record<string, unknown>;
			if (request.path === "/__test/state" && request.method === "GET") return state();
			if (request.path === "/__test/fault-points" && request.method === "POST") {
				if (body.name !== "force-slug-collision")
					return problem(
						400,
						"unknown_fault_point",
						"Link API has only force-slug-collision.",
						false,
					);
				if (body.state === "off") forced = [];
				else if (body.state === "on" && typeof body.arg === "string" && SLUG_PATTERN.test(body.arg))
					forced = [body.arg];
				else
					return problem(400, "invalid_request", "state on with an existing slug, or off.", false);
				return state();
			}
			if (request.path === "/__test/clock" && request.method === "POST") {
				const value = body.offsetMs;
				if (
					typeof value !== "number" ||
					!Number.isSafeInteger(value) ||
					Math.abs(value) > MAX_CLOCK_OFFSET_MS
				)
					return problem(
						400,
						"invalid_request",
						"offsetMs must be an integer within 400 days.",
						false,
					);
				offsetMs = value;
				return state();
			}
			return notFound();
		},
	};
}
