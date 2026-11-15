import { randomBytes } from "node:crypto";
import type { RowContext } from "../context.ts";
import { alterOneByte, signWrong } from "../fixtures/stripe-signer.ts";
import { brief, withFault } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

function fixtureEvent(
	extra: Record<string, unknown> = {},
): Record<string, unknown> & { id: string } {
	const id = `evt_oracle_${randomBytes(10).toString("hex")}`;
	return {
		id,
		object: "event",
		api_version: "2026-10-29.oracle",
		created: Math.floor(Date.now() / 1000),
		type: "customer.created",
		livemode: false,
		pending_webhooks: 1,
		request: { id: null, idempotency_key: null },
		data: {
			object: {
				id: `cus_oracle_${randomBytes(6).toString("hex")}`,
				object: "customer",
				metadata: {},
			},
		},
		...extra,
	};
}

async function inboxCount(ctx: RowContext, eventId: string): Promise<number | null> {
	if (!ctx.commands.has("inspect")) return null;
	const inbox = await ctx.inspect<{ items?: { eventId?: string }[] }>("webhookInbox");
	return (inbox.items ?? []).filter((i) => i.eventId === eventId).length;
}

const is2xx = (status: number) => status >= 200 && status < 300;

export default defineRow({
	id: "A20",
	title: "Webhook signature, modified bytes, duplicate event and inbox failure",
	scope: "Local; staging subset",
	expected:
		"2xx only after the inbox write; 400 for both forgeries; duplicate 2xx without a second effect; refused inbox 5xx, then the redelivery succeeds",
	requires: ["publicEntry", "stripe"],
	coverage: "double",
	async run(ctx) {
		const stripe = ctx.stripe();
		const good = fixtureEvent();
		const accepted = await stripe.deliver(good);
		ctx.check("signed event", is2xx(accepted.status), "2xx", brief(accepted));
		const stored = await inboxCount(ctx, good.id);
		if (stored === null)
			ctx.blocked("event in the inbox", "adapter inspect webhookInbox is not available");
		else ctx.check("event in the inbox", stored === 1, "one inbox row for the event ID", stored);

		const wrong = await stripe.deliver(fixtureEvent(), (body) => signWrong(body));
		ctx.check("wrong signature", wrong.status === 400, "400", brief(wrong));
		const altered = fixtureEvent();
		const modified = await stripe.deliver(altered, (body, header) => ({
			body: alterOneByte(body).body,
			header,
		}));
		ctx.check("one byte changed after signing", modified.status === 400, "400", brief(modified));
		const forgedStored = await inboxCount(ctx, altered.id);
		if (forgedStored !== null)
			ctx.check(
				"forgeries not stored",
				forgedStored === 0,
				"no inbox row for a forged event",
				forgedStored,
			);

		const duplicate = await stripe.deliver(good);
		ctx.check("duplicate event ID", is2xx(duplicate.status), "2xx", brief(duplicate));
		const afterDuplicate = await inboxCount(ctx, good.id);
		if (afterDuplicate !== null)
			ctx.check("no second effect", afterDuplicate === 1, "still one inbox row", afterDuplicate);

		const big = fixtureEvent({
			data: {
				object: {
					id: "cus_oracle_big",
					object: "customer",
					metadata: { pad: "x".repeat(270 * 1024) },
				},
			},
		});
		const tooBig = await stripe.deliver(big);
		ctx.check("body over 256 KiB", tooBig.status === 413, "413", brief(tooBig));

		if (!ctx.adapter.toxiproxy || ctx.proxies("postgres.billing").length === 0) {
			ctx.blocked(
				"inbox database refused",
				"no Toxiproxy proxy for postgres.billing (or postgres)",
			);
			return;
		}
		const later = fixtureEvent();
		const refused = await withFault(ctx, "refuse", "postgres.billing", () => stripe.deliver(later));
		ctx.check(
			"refused inbox",
			refused.status >= 500 && refused.status < 600,
			"5xx (retryable)",
			brief(refused),
		);
		const redelivered = await stripe.deliver(later);
		ctx.check(
			"redelivery succeeds",
			is2xx(redelivered.status),
			"2xx after the database is back",
			brief(redelivered),
		);
		const laterStored = await inboxCount(ctx, later.id);
		if (laterStored !== null)
			ctx.check("redelivered event stored once", laterStored === 1, "one inbox row", laterStored);
	},
});
