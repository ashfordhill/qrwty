import { randomUUID } from "node:crypto";
import { allReplicas } from "../adapter.ts";
import { idempotencyKey } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { apiReplicaUrls, brief, isError, poll, sameJson } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A02",
	title: "Same idempotency key twice concurrently, after restart, and with a changed body",
	scope: "Local",
	expected:
		"One link (one slug, same body each time, including the claim proof); the changed body is 409 idempotency_conflict",
	requires: ["publicEntry", "command:restart"],
	coverage: "double",
	async run(ctx) {
		const guest = ctx.api();
		await guest.session();
		const key = idempotencyKey("a02");
		const dest = destination("A02", randomUUID());
		const urls = apiReplicaUrls(ctx);
		await guest.ensureCsrf();
		const [r1, r2] = await Promise.all(
			[0, 1].map((i) =>
				guest
					.at(urls[i % urls.length])
					.mutate("POST", "/api/v1/links", { destination: dest }, { idempotencyKey: key }),
			),
		);
		const bodies = [r1, r2].map((r) => r.json);
		ctx.check(
			"concurrent creates succeed",
			r1.status === 201 && r2.status === 201,
			"both 201 (one original, one replay)",
			[brief(r1), brief(r2)],
		);
		ctx.check(
			"concurrent bodies identical",
			sameJson(bodies[0], bodies[1]),
			"same body, same slug and claim proof",
			{
				sameSlug:
					(bodies[0] as { shortUrl?: string })?.shortUrl ===
					(bodies[1] as { shortUrl?: string })?.shortUrl,
			},
		);
		const claimPresent = !!(bodies[0] as { claim?: { token?: string } } | undefined)?.claim?.token;
		ctx.check(
			"guest claim proof returned",
			claimPresent,
			"guest create returns claim.token",
			claimPresent,
		);

		for (const replica of allReplicas(ctx.adapter))
			await ctx.commands.run("restart", { target: replica.name });
		const ready = await poll(
			() => guest.session().then((s) => s.response.status),
			(s) => s === 200,
			60_000,
		);
		ctx.check(
			"replicas back after restart",
			ready.ok,
			"GET /api/v1/session 200 within 60 s",
			ready.value,
		);
		const r3 = await guest.mutate(
			"POST",
			"/api/v1/links",
			{ destination: dest },
			{ idempotencyKey: key },
		);
		ctx.check(
			"replay after restart",
			r3.status === 201 && sameJson(r3.json, bodies[0]),
			"same status and body after restarting every replica",
			brief(r3),
		);

		const r4 = await guest.mutate(
			"POST",
			"/api/v1/links",
			{ destination: `${dest}/changed` },
			{ idempotencyKey: key },
		);
		ctx.check(
			"changed body with same key",
			isError(r4, 409, "idempotency_conflict"),
			"409 idempotency_conflict",
			brief(r4),
		);

		const r5 = await guest.mutate(
			"POST",
			"/api/v1/links",
			{ destination: dest },
			{ idempotencyKey: false },
		);
		ctx.check(
			"missing key",
			isError(r5, 400, "idempotency_key_required"),
			"400 idempotency_key_required",
			brief(r5),
		);
	},
});
