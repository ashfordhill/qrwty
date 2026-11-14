// Known click streams and the frozen filter-v1 bot rule (decisions §3, "Click filter").
import { randomUUID } from "node:crypto";

export const FILTER_V1 =
	/bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python-requests|httpclient/i;

export function isBotV1(userAgent: string): boolean {
	return userAgent.trim() === "" || FILTER_V1.test(userAgent);
}

export const HUMAN_AGENTS = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
];

export const BOT_AGENTS = [
	"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
	"curl/8.9.1",
	"python-requests/2.32.3",
	"facebookexternalhit/1.1",
	"Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
	"",
];

export type ClickKind = "human" | "bot" | "head" | "synthetic" | "probe";

export interface PlannedClick {
	kind: ClickKind;
	userAgent: string;
	/** For synthetic GETs through the trusted edge. */
	probeId?: string;
	referer?: string;
}

/**
 * A deterministic stream for one link: humans, bots, HEADs, synthetic GETs and health probes.
 * Probes target the readiness/health path, not the slug, so they never count.
 */
export function knownStream(perKind: {
	human: number;
	bot: number;
	head: number;
	synthetic: number;
	probe: number;
}): PlannedClick[] {
	const out: PlannedClick[] = [];
	for (let i = 0; i < perKind.human; i++) {
		out.push({
			kind: "human",
			userAgent: HUMAN_AGENTS[i % HUMAN_AGENTS.length],
			referer: i % 2 === 0 ? "https://Referrer.Example.org/some/path?q=secret" : undefined,
		});
	}
	for (let i = 0; i < perKind.bot; i++)
		out.push({ kind: "bot", userAgent: BOT_AGENTS[i % BOT_AGENTS.length] });
	for (let i = 0; i < perKind.head; i++) out.push({ kind: "head", userAgent: HUMAN_AGENTS[0] });
	for (let i = 0; i < perKind.synthetic; i++) {
		out.push({
			kind: "synthetic",
			userAgent: HUMAN_AGENTS[0],
			probeId: `oracle-probe-${randomUUID()}`,
		});
	}
	for (let i = 0; i < perKind.probe; i++) out.push({ kind: "probe", userAgent: "kube-probe/1.33" });
	return interleave(out);
}

function interleave<T>(items: T[]): T[] {
	// Deterministic shuffle so kinds alternate rather than arrive in blocks.
	const out = [...items];
	let seed = 7;
	for (let i = out.length - 1; i > 0; i--) {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		const j = seed % (i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** A click event v1 body (http-contract.md §6) for direct publication by the oracle. */
export function clickEvent(
	linkId: string,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		schemaVersion: 1,
		eventId: randomUUID(),
		linkId,
		eventTime: new Date().toISOString(),
		synthetic: false,
		deviceClass: "desktop",
		country: null,
		referrerHost: null,
		...overrides,
	};
}

/** Fields that must never appear in an event (http-contract.md §6). */
export const FORBIDDEN_EVENT_FIELDS = [
	"ip",
	"ipAddress",
	"clientIp",
	"userAgent",
	"user_agent",
	"destination",
	"cookie",
	"authorization",
	"referrer",
	"referer",
	"query",
];

export const EVENT_FIELDS = [
	"schemaVersion",
	"eventId",
	"linkId",
	"eventTime",
	"synthetic",
	"deviceClass",
	"country",
	"referrerHost",
];
