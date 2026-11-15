// The Click aggregator (Q10, A4) on its own subscription,
// click-events--analytics-worker--analytics-worker-click-aggregator. Each message:
//   - a valid v1 event within the replay horizon (31 days back, 5 minutes ahead) is recorded by
//     record_click: the receipt and the daily aggregate in one transaction, so a redelivered or
//     replayed event ID counts once; the message is acknowledged only after that commit (the
//     generated loop acks once this resolves);
//   - anything else is quarantined (click_quarantine, with its bytes and the reason) and then
//     acknowledged: never counted, never dropped;
//   - a database failure throws: the generated loop keeps the message (an unreachable store waits
//     5 s; another error is nacked and redelivered, and after 5 retries copied to `.failed`).
// Once a minute per process it also runs the bounded retention purge.

import { createHash } from "node:crypto";
import type { DatabaseReadWriter } from "../../dependencies.ts";
import type { ModuleMessage } from "../../entry.ts";
import { parseClick } from "../../redirect-service/redirect/click-event.ts";

export const SCHEMA = "m_analytics_worker_click_aggregator";
export const REPLAY_HORIZON_MS = 31 * 24 * 3600 * 1000;
export const FUTURE_SKEW_MS = 5 * 60 * 1000;
export const QUARANTINE_MAX_BYTES = 65536;
export const PURGE_EVERY_MS = 60_000;
export const PURGE_LIMIT = 1000;

export type Outcome = "recorded" | "duplicate" | `quarantined:${string}`;

export function clickAggregator(options: {
	db: DatabaseReadWriter;
	now?: () => number;
	onFailure?: (what: string, error: unknown) => void;
}) {
	const now = options.now ?? Date.now;
	const failed = options.onFailure ?? (() => {});
	let lastPurge = 0;

	async function quarantine(
		message: ModuleMessage,
		messageId: string,
		linkId: string | null,
		reason: string,
	): Promise<Outcome> {
		const bytes = Buffer.from(message.body);
		const kept = bytes.length > QUARANTINE_MAX_BYTES;
		await options.db.query(`SELECT ${SCHEMA}.quarantine_click($1, $2::uuid, $3, $4)`, [
			messageId,
			linkId,
			kept ? `${reason}_truncated`.slice(0, 40) : reason,
			kept ? bytes.subarray(0, QUARANTINE_MAX_BYTES) : bytes,
		]);
		return `quarantined:${reason}`;
	}

	async function purge(at: number) {
		if (at - lastPurge < PURGE_EVERY_MS) return;
		lastPurge = at;
		try {
			await options.db.query(`SELECT ${SCHEMA}.purge_expired($1)`, [PURGE_LIMIT]);
		} catch (error) {
			failed("click retention purge", error);
		}
	}

	return async function aggregate(message: ModuleMessage): Promise<Outcome> {
		const at = now();
		// The generated loop gives the `messageId` attribute (the event ID the publisher set), else
		// Pub/Sub's own ID; with neither, the body's hash names it.
		const messageId =
			message.messageId ??
			`sha256:${createHash("sha256").update(message.body).digest("hex").slice(0, 32)}`;
		const parsed = parseClick(message.body);
		if (!parsed.ok) return quarantine(message, messageId, parsed.linkId, parsed.reason);
		const event = parsed.event;
		if (messageId !== event.eventId)
			return quarantine(message, messageId, event.linkId, "message_id_mismatch");
		const time = Date.parse(event.eventTime);
		if (time < at - REPLAY_HORIZON_MS)
			return quarantine(message, messageId, event.linkId, "beyond_replay_horizon");
		if (time > at + FUTURE_SKEW_MS)
			return quarantine(message, messageId, event.linkId, "future_event_time");
		const [row] = await options.db.query<{ first: boolean }>(
			`SELECT ${SCHEMA}.record_click($1::uuid, $2::uuid, $3::timestamptz, $4, $5) AS first`,
			[event.eventId, event.linkId, event.eventTime, event.synthetic, event.deviceClass === "bot"],
		);
		await purge(at);
		return row?.first ? "recorded" : "duplicate";
	};
}
