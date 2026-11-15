import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import {
	asLink,
	brief,
	hitSlug,
	isError,
	operatorBlock,
	redirectReplicaUrls,
	watchSlug,
} from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A08",
	title: "Absolute expiry with a warmed cache; owner cannot enable a blocked link",
	scope: "Local",
	expected:
		"No 302 later than expiresAt + the recorded clock bound (≤ 1 s); 410 afterwards; enabling a blocked link is 409 blocked_by_operator",
	requires: ["publicEntry", "identity"],
	coverage: "double",
	params: { expiresInMs: 20_000, afterMs: 5_000, maxClockBoundMs: 1_000 },
	async run(ctx) {
		const run = randomUUID().slice(0, 8);
		const alice = await ctx.signedIn("alice");
		const expiresAt = new Date(Date.now() + ctx.params.expiresInMs).toISOString();
		const dest = destination("A08", run);
		const created = await alice.createLink(dest, { expiresAt });
		const link = asLink(created);
		if (created.status !== 201 || !link)
			throw new Error(`create with expiresAt returned ${created.status}`);
		ctx.check(
			"expiresAt saved",
			link.expiresAt !== null && Date.parse(link.expiresAt) === Date.parse(expiresAt),
			expiresAt,
			link.expiresAt,
		);
		for (const replica of redirectReplicaUrls(ctx)) {
			for (let i = 0; i < 3; i++) await hitSlug(ctx, replica.url, link.slug);
		}
		// The arm's recorded clock bound, when its clock command reports one; else the frozen maximum.
		let boundMs = ctx.params.maxClockBoundMs;
		if (ctx.commands.has("clock")) {
			const record = await ctx.clock.set(0);
			if (record.boundMs !== null) boundMs = record.boundMs;
		}
		ctx.check(
			"recorded clock bound",
			boundMs <= ctx.params.maxClockBoundMs,
			`≤ ${ctx.params.maxClockBoundMs} ms`,
			boundMs,
		);
		const remaining = Date.parse(expiresAt) - Date.now();
		const observations = await watchSlug(ctx, link.slug, remaining + ctx.params.afterMs, 100);
		const deadline = Date.parse(expiresAt) + boundMs;
		const late = observations.filter((o) => o.status === 302 && o.sentWallMs > deadline);
		ctx.check(
			"no 302 after expiry",
			late.length === 0,
			`no 302 for a request sent after expiresAt + ${boundMs} ms`,
			{ late: late.slice(0, 5), observed: observations.length },
		);
		const before = observations.filter((o) => o.sentWallMs < Date.parse(expiresAt) - 500);
		ctx.check(
			"302 before expiry",
			before.length > 0 && before.every((o) => o.status === 302),
			"302 before expiresAt",
			before.slice(-3),
		);
		const after = observations.filter((o) => o.sentWallMs > deadline);
		ctx.check(
			"410 after expiry",
			after.length > 0 && after.every((o) => o.status === 410),
			"410 after expiresAt + bound",
			after.slice(0, 3),
		);
		await ctx.artifact("expiry-observations.json", { expiresAt, boundMs, observations });

		const blockedDest = destination("A08", `${run}-blocked`);
		const second = asLink(await alice.createLink(blockedDest));
		if (!second) throw new Error("second owned create failed");
		const blocked = await operatorBlock(ctx, second.id, "oracle A08 block");
		ctx.check("operator block", blocked.status === 200, "200", brief(blocked));
		const read = await alice.getLink(second.id);
		const version = (read.json as { version?: number } | undefined)?.version ?? second.version;
		const enable = await alice.patchLink(second.id, { state: "active" }, `"${version}"`);
		ctx.check(
			"owner cannot enable a blocked link",
			isError(enable, 409, "blocked_by_operator"),
			"409 blocked_by_operator",
			brief(enable),
		);
	},
});
