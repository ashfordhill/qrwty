import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import {
	brief,
	createGuest,
	isError,
	missingNames,
	moveClockKeepingSessions,
} from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

const DAY_MS = 86_400_000;

export default defineRow({
	id: "A04",
	title: "Claim after sign-in; cancelled sign-in; proof expiry at 24 h",
	scope: "Local",
	expected:
		"Claim succeeds for the proof holder; another account without the proof gets 403; the cancelled sign-in keeps the proof (browser); 24 h − 1 s succeeds, 24 h + 1 s is 410 claim_expired",
	requires: ["publicEntry", "identity", "command:clock"],
	coverage: "double",
	async run(ctx) {
		const run = randomUUID().slice(0, 8);
		const bob = await ctx.signedIn("bob");
		const alice = await ctx.signedIn("alice");

		// Proof holder claims; another account without the proof is refused.
		const first = await createGuest(ctx, destination("A04", `${run}-1`));
		const proof = first.link.claim?.token ?? "";
		ctx.check("guest proof issued", proof.length > 0, "claim.token on the guest create", !!proof);
		const expiresAt = Date.parse(first.link.claim?.expiresAt ?? "");
		const createdAt = Date.parse((first.response.json as { createdAt?: string }).createdAt ?? "");
		ctx.check(
			"proof lifetime 24 h",
			Math.abs(expiresAt - createdAt - DAY_MS) <= 2000,
			"claim.expiresAt = createdAt + 24 h",
			{
				createdAt: first.link.claim ? new Date(createdAt).toISOString() : null,
				expiresAt: first.link.claim?.expiresAt,
			},
		);
		const forged = await bob.claim(first.link.id, `${proof.slice(0, -4)}AAAA`);
		ctx.check(
			"other account without proof",
			forged.status === 403,
			"403 (claim_invalid)",
			brief(forged),
		);
		const claimed = await alice.claim(first.link.id, proof);
		const owned = (claimed.json as { owned?: boolean; id?: string } | undefined) ?? {};
		ctx.check(
			"proof holder claims",
			claimed.status === 200 && owned.id === first.link.id,
			"200 with the owned link",
			brief(claimed),
		);

		// Cancelled sign-in (HTTP level): the arm returns to returnTo with signin=cancelled, and the
		// proof is still claimable after a later successful sign-in.
		const second = await createGuest(ctx, destination("A04", `${run}-2`));
		const cancel = await second.api.cancelSignIn("/oracle-a04-return");
		ctx.check(
			"cancelled sign-in returns",
			cancel.status === 302 &&
				/signin=cancelled/.test(cancel.location ?? "") &&
				(cancel.location ?? "").includes("/oracle-a04-return"),
			"302 to returnTo with signin=cancelled",
			cancel,
		);
		const retry = await ctx.signIn(second.api, "alice", { returnTo: "/oracle-a04-return" });
		ctx.check(
			"retried sign-in returns to returnTo",
			retry.ok && (retry.finalLocation ?? "").includes("/oracle-a04-return"),
			"302 to /oracle-a04-return",
			retry.finalLocation ?? { reason: retry.reason, steps: retry.steps },
		);
		const afterCancel = await second.api.claim(second.link.id, second.link.claim?.token ?? "");
		ctx.check(
			"proof survives a cancelled sign-in",
			afterCancel.status === 200,
			"200 claim after cancel then sign-in",
			brief(afterCancel),
		);
		if (missingNames(ctx, ["result.save"]).length > 0) {
			ctx.blocked(
				"browser keeps the proof through a cancelled sign-in",
				"accessible-name list not frozen (pending the Q11 pack amendment)",
			);
		} else {
			ctx.blocked(
				"browser keeps the proof through a cancelled sign-in",
				"browser step is defined with the UI name amendment; HTTP-level checks above ran",
			);
		}

		// Expiry boundary with the test clock, relative to the arm's own claim.expiresAt. Sessions
		// are kept alive by stepping the clock (the 24-hour idle timeout also follows the clock).
		const early = await createGuest(ctx, destination("A04", `${run}-3`));
		const late = await createGuest(ctx, destination("A04", `${run}-4`));
		const earlyExpiry = Date.parse(early.link.claim?.expiresAt ?? "");
		const lateExpiry = Date.parse(late.link.claim?.expiresAt ?? "");
		await moveClockKeepingSessions(ctx, earlyExpiry - 1000 - Date.now(), [alice]);
		const justBefore = await alice.claim(early.link.id, early.link.claim?.token ?? "");
		ctx.check("claim at 24 h − 1 s", justBefore.status === 200, "200", brief(justBefore));
		await moveClockKeepingSessions(ctx, lateExpiry + 1000 - Date.now(), [alice]);
		const justAfter = await alice.claim(late.link.id, late.link.claim?.token ?? "");
		ctx.check(
			"claim at 24 h + 1 s",
			isError(justAfter, 410, "claim_expired"),
			"410 claim_expired",
			brief(justAfter),
		);
		await ctx.clock.set(0);
	},
});
