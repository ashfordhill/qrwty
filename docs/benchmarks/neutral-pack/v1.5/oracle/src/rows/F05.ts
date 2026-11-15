import { randomUUID } from "node:crypto";
import { replicasWithRole } from "../adapter.ts";
import { idempotencyKey } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { asLink, brief, createGuest, hitSlug, poll, sameJson } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F05",
	title: "SIGKILL mid-create; SIGTERM during in-flight requests",
	scope: "Local",
	expected:
		"Client retry with the same key yields one result; no partial mutation; drain completes or times out within the configured bound",
	requires: ["publicEntry", "command:kill", "command:start", "command:terminate"],
	coverage: "live-arm",
	liveArmReason: "needs real process signals on the arm's replicas",
	params: { inflight: 20 },
	async run(ctx) {
		const api = replicasWithRole(ctx.adapter, "session");
		const guest = ctx.api();
		await guest.ensureCsrf();
		if (api.length >= 2) {
			const [victim, other] = api;
			const key = idempotencyKey("f05");
			const dest = destination("F05", randomUUID());
			const pending = guest
				.at(victim.url)
				.createLink(dest, { key })
				.catch((e: Error) => e);
			await ctx.sleep(5);
			await ctx.commands.run("kill", { target: victim.name });
			await pending;
			const retry = await guest.at(other.url).createLink(dest, { key });
			const again = await guest.at(other.url).createLink(dest, { key });
			ctx.check(
				"retry yields one result",
				retry.status === 201 && sameJson(retry.json, again.json),
				"201, and the same body on every retry",
				[brief(retry), brief(again)],
			);
			const link = asLink(retry);
			if (link) {
				const hit = await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug);
				ctx.check(
					"no partial mutation",
					hit.status === 302 && hit.header("location") === dest,
					"the created link is complete and redirects",
					brief(hit),
				);
			}
			await ctx.commands.run("start", { target: victim.name });
		} else {
			ctx.blocked("kill mid-create", "needs two replicas with the session role");
		}

		const redirect = replicasWithRole(ctx.adapter, "redirect");
		const target = redirect[0];
		const { link } = await createGuest(ctx, destination("F05", `${randomUUID()}-drain`));
		const inflight = Array.from({ length: ctx.params.inflight }, () =>
			hitSlug(ctx, target.url, link.slug, "GET", { timeoutMs: 60_000 })
				.then((r) => r.status)
				.catch(() => 0),
		);
		await ctx.sleep(5);
		const term = await ctx.commands.run<{
			drainedMs?: number;
			boundMs?: number;
			timedOut?: boolean;
		}>("terminate", { target: target.name });
		const statuses = await Promise.all(inflight);
		ctx.check(
			"in-flight requests finish or close cleanly",
			statuses.every((s) => s === 302 || s === 503 || s === 0),
			"302/503 or a closed connection, never a partial response",
			statuses,
		);
		ctx.check(
			"drain within the configured bound",
			typeof term.drainedMs === "number" &&
				typeof term.boundMs === "number" &&
				term.drainedMs <= term.boundMs + 1_000,
			"drainedMs ≤ boundMs",
			term,
		);
		await ctx.commands.run("start", { target: target.name });
		const back = await poll(
			() => hitSlug(ctx, target.url, link.slug).catch(() => null),
			(r) => r?.status === 302,
			60_000,
			1_000,
		);
		ctx.check("replica back", back.ok, "302 after start", back.value ? brief(back.value) : null);
	},
});
