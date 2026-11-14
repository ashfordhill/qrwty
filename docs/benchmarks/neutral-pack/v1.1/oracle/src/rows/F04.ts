import { randomUUID } from "node:crypto";
import { Client } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest, hitSlug, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F04",
	title: "Issuer unavailable at startup and mid-session",
	scope: "Local",
	expected:
		"Redirect starts and serves; account operations keep their authentication rules (no guest downgrade)",
	requires: ["publicEntry", "identity", "toxiproxy", "command:restart"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's issuer behind Toxiproxy and replica restarts",
	async run(ctx) {
		const { link } = await createGuest(ctx, destination("F04", randomUUID()));
		const alice = await ctx.signedIn("alice");
		const issuer = ctx.proxies("issuer");
		const toxi = ctx.toxiproxy();
		const redirect = Object.values(ctx.adapter.services).find((s) => s.roles.includes("redirect"));
		if (!redirect) return;
		await toxi.fault("refuse", issuer);
		try {
			for (const replica of redirect.replicas)
				await ctx.commands.run("restart", { target: replica.name });
			const ready = await poll(
				async () =>
					Promise.all(
						redirect.replicas.map(
							async (r) =>
								(
									await new Client(r.url, ctx.origin)
										.request("GET", redirect.readiness)
										.catch(() => null)
								)?.status ?? 0,
						),
					),
				(s) => s.every((x) => x === 200),
				60_000,
				1_000,
			);
			ctx.check(
				"redirect starts without the issuer",
				ready.ok,
				"readiness 200 on every redirect replica",
				ready.value,
			);
			const served = await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug);
			ctx.check("redirect serves without the issuer", served.status === 302, "302", brief(served));
			const list = await alice.listLinks();
			ctx.check(
				"account read keeps its rules",
				list.status === 200 || list.status === 401 || list.status === 503,
				"200 with the session, or 401/503; never anonymous data",
				brief(list),
			);
			const create = await alice.createLink(destination("F04", `${randomUUID()}-owned`));
			const body = (create.json ?? {}) as { owned?: boolean; claim?: unknown };
			const downgraded = create.status === 201 && (body.owned === false || !!body.claim);
			ctx.check(
				"no guest downgrade",
				!downgraded && (create.status === 201 || create.status === 401 || create.status === 503),
				"an owned 201, or 401/503; never a guest link",
				{ ...brief(create), owned: body.owned ?? null, claim: !!body.claim },
			);
			const signIn = await ctx
				.api()
				.signIn("oracle-bob", ctx.password())
				.catch((e: Error) => ({ ok: false, steps: [e.message] }));
			ctx.check(
				"sign-in fails cleanly",
				!signIn.ok,
				"sign-in cannot complete while the issuer is down",
				signIn.steps.slice(-2),
			);
		} finally {
			await toxi.restore(issuer);
		}
		const back = await poll(
			() => alice.listLinks(),
			(r) => r.status === 200 || r.status === 401,
			60_000,
			2_000,
		);
		ctx.check(
			"account operations after recovery",
			back.ok,
			"200 (or 401 then a fresh sign-in) once the issuer is back",
			brief(back.value),
		);
	},
});
