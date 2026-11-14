import { randomUUID } from "node:crypto";
import { clickEvent } from "../fixtures/clicks.ts";
import { destination } from "../fixtures/destinations.ts";
import { poisonMessages } from "../fixtures/poison.ts";
import { asLink, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

interface QuarantineItem {
	eventId?: string;
	messageId?: string;
	reason?: string;
	attempts?: number;
}

export default defineRow({
	id: "A12",
	title: "Poison messages, quarantine replay and an event beyond the replay horizon",
	scope: "Local",
	expected:
		"Valid events counted; each poison item quarantined with its reason, with bounded retries; repaired replay passes dedup; the 32-day event is quarantined for rebuild, not added to live totals",
	requires: ["publicEntry", "identity", "pubsub", "command:inspect", "command:replayQuarantine"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's analytics worker, quarantine store and replay tool",
	params: { valid: 5, waitMs: 120_000, maxAttempts: 25 },
	async run(ctx) {
		const alice = await ctx.signedIn("alice");
		const capture = await ctx.pubsub();
		const link = asLink(await alice.createLink(destination("A12", randomUUID())));
		if (!link) throw new Error("owned create failed");
		const before = (await ctx.inspect<{ items?: QuarantineItem[] }>("quarantine")).items ?? [];
		const poison = poisonMessages(link.id);
		const poisonIds: string[] = [];
		for (const p of poison) poisonIds.push(await capture.publish(p.data, p.attributes));
		const valid: string[] = [];
		for (let i = 0; i < ctx.params.valid; i++) {
			const event = clickEvent(link.id);
			valid.push(String(event.eventId));
			await capture.publish(Buffer.from(JSON.stringify(event)), { schemaVersion: "1" });
		}
		const totals = () =>
			alice
				.analytics(link.id)
				.then(
					(r) =>
						(r.json as { totals?: { recordedAttempts?: number } } | undefined)?.totals
							?.recordedAttempts ?? -1,
				);
		const counted = await poll(totals, (n) => n === ctx.params.valid, ctx.params.waitMs, 1_000);
		ctx.check(
			"valid events counted",
			counted.ok,
			`${ctx.params.valid} recorded after poison messages`,
			counted.value,
		);
		const quarantined = await poll(
			() =>
				ctx
					.inspect<{ items?: QuarantineItem[] }>("quarantine")
					.then((q) => (q.items ?? []).slice(before.length)),
			(items) => items.length >= poison.length,
			ctx.params.waitMs,
			2_000,
		);
		const items = quarantined.value;
		await ctx.artifact("quarantine.json", items);
		ctx.check(
			"poison quarantined",
			items.length >= poison.length,
			`${poison.length} new quarantine items`,
			items.length,
		);
		ctx.check(
			"each with a reason",
			items.every((i) => typeof i.reason === "string" && i.reason.length > 0),
			"non-empty reason per item",
			items.map((i) => i.reason ?? null),
		);
		ctx.check(
			"bounded retries",
			items.every((i) => typeof i.attempts === "number" && i.attempts <= ctx.params.maxAttempts),
			`attempts recorded and ≤ ${ctx.params.maxAttempts}`,
			items.map((i) => i.attempts ?? null),
		);
		ctx.note(`published poison message IDs: ${poisonIds.join(", ")}`);

		await ctx.commands.run("replayQuarantine", {});
		await ctx.sleep(15_000);
		const afterReplay = await totals();
		ctx.check(
			"replay passes dedup",
			afterReplay === ctx.params.valid,
			`still ${ctx.params.valid} after replaying the quarantine`,
			afterReplay,
		);
		const stillThere = ((await ctx.inspect<{ items?: QuarantineItem[] }>("quarantine")).items ?? [])
			.length;
		ctx.check(
			"unrepairable items kept",
			stillThere >= before.length + poison.length,
			"poison items stay quarantined after replay",
			stillThere,
		);

		const old = clickEvent(link.id, {
			eventTime: new Date(ctx.clock.now() - 32 * 86_400_000).toISOString(),
		});
		await capture.publish(Buffer.from(JSON.stringify(old)), { schemaVersion: "1" });
		const oldQuarantined = await poll(
			() => ctx.inspect<{ items?: QuarantineItem[] }>("quarantine").then((q) => q.items ?? []),
			(list) => list.some((i) => i.eventId === old.eventId),
			ctx.params.waitMs,
			2_000,
		);
		ctx.check(
			"32-day event quarantined for rebuild",
			oldQuarantined.ok,
			`quarantine item with eventId ${String(old.eventId)}`,
			oldQuarantined.value.find((i) => i.eventId === old.eventId) ?? null,
		);
		const final = await totals();
		ctx.check(
			"32-day event not in live totals",
			final === ctx.params.valid,
			`still ${ctx.params.valid}`,
			final,
		);
		ctx.note(
			"the 32-day event is published with an eventTime 32 days before the arm's clock (equivalent to replaying it 32 days later); the free tier's 7-day lookback cannot show a 32-day-old increment, so the quarantine item is the main evidence",
		);
	},
});
