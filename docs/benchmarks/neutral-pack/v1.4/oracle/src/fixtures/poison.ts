// Poison messages for A12 (acceptance-oracle.md §3). Each carries the attribute schemaVersion "1"
// except where the fault is the version itself.
import { clickEvent } from "./clicks.ts";

export interface PoisonMessage {
	name: string;
	data: Buffer;
	attributes: Record<string, string>;
	/** Substring a quarantine reason is expected to mention (case-insensitive), when stable. */
	reasonHint: string;
}

export function poisonMessages(linkId: string): PoisonMessage[] {
	const missing = clickEvent(linkId);
	delete missing.linkId;
	return [
		{
			name: "invalid-json",
			data: Buffer.from('{"schemaVersion":1,"eventId":', "utf8"),
			attributes: { schemaVersion: "1" },
			reasonHint: "json",
		},
		{
			name: "schema-version-999",
			data: Buffer.from(JSON.stringify(clickEvent(linkId, { schemaVersion: 999 })), "utf8"),
			attributes: { schemaVersion: "999" },
			reasonHint: "version",
		},
		{
			name: "missing-link-id",
			data: Buffer.from(JSON.stringify(missing), "utf8"),
			attributes: { schemaVersion: "1" },
			reasonHint: "linkid",
		},
	];
}
