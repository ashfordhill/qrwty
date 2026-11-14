import { randomUUID } from "node:crypto";
import { idempotencyKey } from "../client/client.ts";
import { ACCOUNTS } from "../fixtures/accounts.ts";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest, isError, leaks, sameJson } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A05",
	title: "Two accounts race to claim one proof; each repeats",
	scope: "Local",
	expected:
		"Exactly one 200; the other 409 claim_consumed with no owner or private field; the winner's repeat is 200 with the same link; only the winner lists it",
	requires: ["publicEntry", "identity"],
	coverage: "double",
	async run(ctx) {
		const alice = await ctx.signedIn("alice");
		const bob = await ctx.signedIn("bob");
		const dest = destination("A05", randomUUID());
		const guest = await createGuest(ctx, dest);
		const token = guest.link.claim?.token ?? "";
		const keys = { alice: idempotencyKey("a05"), bob: idempotencyKey("a05") };
		const [ra, rb] = await Promise.all([
			alice.claim(guest.link.id, token, keys.alice),
			bob.claim(guest.link.id, token, keys.bob),
		]);
		const winners = [ra, rb].filter((r) => r.status === 200).length;
		ctx.check("exactly one winner", winners === 1, "one 200 and one 409", [brief(ra), brief(rb)]);
		const [winner, loser, winnerName, loserResponse, winnerKey, loserKey] =
			ra.status === 200
				? ([alice, bob, "alice", rb, keys.alice, keys.bob] as const)
				: ([bob, alice, "bob", ra, keys.bob, keys.alice] as const);
		const winnerResponse = ra.status === 200 ? ra : rb;
		ctx.check(
			"loser gets claim_consumed",
			isError(loserResponse, 409, "claim_consumed"),
			"409 claim_consumed",
			brief(loserResponse),
		);
		const loserKeys = Object.keys((loserResponse.json as Record<string, unknown>) ?? {});
		const leaked = leaks(loserResponse, [dest, guest.link.shortUrl, ACCOUNTS.alice, ACCOUNTS.bob]);
		ctx.check(
			"loser body has no private field",
			loserKeys.every((k) => k === "error") && leaked.length === 0,
			"only the error object; no destination, short URL or account",
			{ keys: loserKeys, leaked },
		);

		const repeat = await winner.claim(guest.link.id, token, winnerKey);
		ctx.check(
			"winner repeat (same key)",
			repeat.status === 200 && sameJson(repeat.json, winnerResponse.json),
			"200 with the same body",
			brief(repeat),
		);
		const repeatNewKey = await winner.claim(guest.link.id, token);
		const sameLink = (repeatNewKey.json as { id?: string } | undefined)?.id === guest.link.id;
		ctx.check(
			"winner repeat (new key)",
			repeatNewKey.status === 200 && sameLink,
			"200 with the same link",
			brief(repeatNewKey),
		);
		const loserRepeat = await loser.claim(guest.link.id, token, loserKey);
		ctx.check(
			"loser repeat",
			isError(loserRepeat, 409, "claim_consumed"),
			"409 claim_consumed again",
			brief(loserRepeat),
		);

		const listed = async (api: typeof alice) => {
			const r = await api.listLinks("?limit=50");
			return ((r.json as { items?: { id: string }[] } | undefined)?.items ?? []).some(
				(i) => i.id === guest.link.id,
			);
		};
		const [winnerLists, loserLists] = [await listed(winner), await listed(loser)];
		ctx.check(
			"only the winner lists it",
			winnerLists && !loserLists,
			`listed for ${winnerName} only`,
			{ winnerLists, loserLists },
		);
	},
});
