// Click event v1 (http-contract §6): what the Redirect service publishes before each 302 and the
// Analytics worker counts. Only coarse dimensions: never an IP address, the user agent, a
// referrer's path or query, the destination, the short URL's query, cookies or authorization.

export const SCHEMA_VERSION = 1;
export const DEVICE_CLASSES = ["desktop", "mobile", "tablet", "bot", "unknown"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

export type ClickEvent = {
	schemaVersion: 1;
	eventId: string;
	linkId: string;
	eventTime: string;
	synthetic: boolean;
	deviceClass: DeviceClass;
	country: string | null;
	referrerHost: string | null;
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EVENT_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const HOST =
	/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)*$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** filter-v1 (decisions §3): a bot is an empty user agent, or one matching this, any case. */
export const FILTER_V1_BOT =
	/bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python-requests|httpclient/i;

/** The device class of a user agent; the agent itself is never kept. */
export function deviceClass(userAgent: string | undefined): DeviceClass {
	const agent = userAgent?.trim() ?? "";
	if (agent === "" || FILTER_V1_BOT.test(agent)) return "bot";
	if (/ipad|tablet|kindle|silk|playbook/i.test(agent)) return "tablet";
	if (/android/i.test(agent) && !/mobile/i.test(agent)) return "tablet";
	if (/mobi|iphone|ipod|windows phone|blackberry/i.test(agent)) return "mobile";
	if (/windows|macintosh|mac os x|x11|linux|cros/i.test(agent)) return "desktop";
	return "unknown";
}

/** The lowercase host of an http(s) Referer, or null: never its path or query, nor an IP. */
export function referrerHost(referer: string | undefined): string | null {
	if (referer === undefined || referer.length > 8192) return null;
	let url: URL;
	try {
		url = new URL(referer);
	} catch {
		return null;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	const host = url.hostname.toLowerCase().replace(/\.$/, "");
	if (IPV4.test(host) || !HOST.test(host)) return null;
	return host;
}

/** The event's bytes, as published. */
export function encodeClick(event: ClickEvent): Uint8Array {
	return Buffer.from(JSON.stringify(event), "utf8");
}

export type Parsed =
	| { ok: true; event: ClickEvent }
	| { ok: false; reason: string; linkId: string | null };

/** A published message as a v1 event, or why it isn't one. Unknown fields of v1 are accepted. */
export function parseClick(body: Uint8Array): Parsed {
	let value: unknown;
	try {
		value = JSON.parse(Buffer.from(body).toString("utf8"));
	} catch {
		return { ok: false, reason: "malformed_json", linkId: null };
	}
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return { ok: false, reason: "not_an_object", linkId: null };
	const v = value as Record<string, unknown>;
	const linkId = typeof v.linkId === "string" && UUID.test(v.linkId) ? v.linkId : null;
	const refuse = (reason: string): Parsed => ({ ok: false, reason, linkId });
	if (v.schemaVersion !== SCHEMA_VERSION) return refuse("unsupported_schema_version");
	if (typeof v.eventId !== "string" || !UUID.test(v.eventId)) return refuse("invalid_event_id");
	if (linkId === null) return refuse("invalid_link_id");
	if (
		typeof v.eventTime !== "string" ||
		!EVENT_TIME.test(v.eventTime) ||
		Number.isNaN(Date.parse(v.eventTime)) ||
		new Date(v.eventTime).toISOString() !== v.eventTime
	)
		return refuse("invalid_event_time");
	if (typeof v.synthetic !== "boolean") return refuse("invalid_synthetic");
	if (!DEVICE_CLASSES.includes(v.deviceClass as DeviceClass)) return refuse("invalid_device_class");
	if (v.country !== null && (typeof v.country !== "string" || !/^[A-Z]{2}$/.test(v.country)))
		return refuse("invalid_country");
	if (v.referrerHost !== null && (typeof v.referrerHost !== "string" || !HOST.test(v.referrerHost)))
		return refuse("invalid_referrer_host");
	return {
		ok: true,
		event: {
			schemaVersion: SCHEMA_VERSION,
			eventId: v.eventId,
			linkId,
			eventTime: v.eventTime,
			synthetic: v.synthetic,
			deviceClass: v.deviceClass as DeviceClass,
			country: v.country as string | null,
			referrerHost: v.referrerHost as string | null,
		},
	};
}
