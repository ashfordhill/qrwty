import { type JsonWebKey, randomUUID } from "node:crypto";
import { Client } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest } from "./lib/flows.ts";
import { signedToken, unsignedToken } from "./lib/jwt.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A14",
	title: "Issuer key rotation, expired session, cancelled sign-in and forged tokens",
	scope: "Local; staging subset",
	expected:
		"Rotation handled by refresh or a clean sign-in; the expired session is 401 and the return location and claim proof survive; every forged token is 401",
	requires: [
		"publicEntry",
		"identity",
		"command:rotateIdentityKey",
		"command:rogueKey",
		"command:clock",
	],
	coverage: "double",
	params: { idleTimeoutMs: 86_400_000 },
	async run(ctx) {
		const identity = ctx.adapter.identity;
		if (!identity) return;
		// Key rotation: the existing session keeps working (refresh), or a clean sign-in works.
		const alice = await ctx.signedIn("alice");
		await ctx.commands.run("rotateIdentityKey");
		const afterRotation = await alice.listLinks();
		let rotationOk = afterRotation.status === 200;
		let how = "existing session";
		if (afterRotation.status === 401) {
			const again = ctx.api();
			const result = await ctx.signIn(again, "alice");
			rotationOk = result.ok && (await again.listLinks()).status === 200;
			how = result.ok ? "clean sign-in" : `clean sign-in failed: ${result.reason}`;
		}
		ctx.check(
			"key rotation",
			rotationOk,
			"200 with the existing session, or 401 then a clean sign-in that works",
			{ how, first: brief(afterRotation) },
		);

		// Expired session: 401; then sign-in returns to returnTo and the claim proof still claims.
		const holder = await createGuest(ctx, destination("A14", randomUUID()));
		const signedIn = await ctx.signIn(holder.api, "alice");
		if (!signedIn.ok)
			throw new Error(`sign-in failed: ${signedIn.reason} [${signedIn.steps.join(" > ")}]`);
		await ctx.clock.set(ctx.params.idleTimeoutMs + 60_000);
		const expired = await holder.api.listLinks();
		ctx.check(
			"expired session",
			expired.status === 401,
			"401 (session_expired or unauthenticated)",
			brief(expired),
		);
		await ctx.clock.set(0);
		const back = await ctx.signIn(holder.api, "alice", { returnTo: "/oracle-a14-return" });
		ctx.check(
			"return location survives",
			back.ok && (back.finalLocation ?? "").includes("/oracle-a14-return"),
			"302 to /oracle-a14-return",
			back.finalLocation ?? { reason: back.reason, steps: back.steps },
		);
		const claim = await holder.api.claim(holder.link.id, holder.link.claim?.token ?? "");
		ctx.check(
			"claim proof survives",
			claim.status === 200,
			"200 claim with the original proof",
			brief(claim),
		);

		const cancel = await ctx.api().cancelSignIn("/oracle-a14-cancel");
		ctx.check(
			"cancelled sign-in",
			cancel.status === 302 && /signin=cancelled/.test(cancel.location ?? ""),
			"302 with signin=cancelled",
			cancel,
		);

		// Forged bearer tokens straight to every guarded internal route.
		const rogue = await ctx.commands.run<{ privateJwk: JsonWebKey; kid?: string }>("rogueKey");
		const base = { iss: identity.issuerUrl, aud: identity.audience };
		const forged: Record<string, string> = {
			"rogue key": signedToken(base, rogue.privateJwk, rogue.kid),
			"alg none": unsignedToken(base),
		};
		if (ctx.commands.has("issueToken")) {
			const issue = async (args: Record<string, string | number>) =>
				(
					await ctx.commands.run<{ token: string }>("issueToken", {
						account: (await ctx.credentials("alice")).login,
						audience: identity.audience,
						issuer: identity.issuerUrl,
						expiresInSeconds: 300,
						...args,
					})
				).token;
			forged["wrong audience"] = await issue({ audience: "oracle-wrong-audience" });
			forged["wrong issuer"] = await issue({ issuer: "https://oracle-wrong-issuer.example" });
			forged.expired = await issue({ expiresInSeconds: -120 });
		} else {
			forged["wrong audience (rogue-signed)"] = signedToken(
				{ ...base, aud: "oracle-wrong-audience" },
				rogue.privateJwk,
				rogue.kid,
			);
			forged["wrong issuer (rogue-signed)"] = signedToken(
				{ ...base, iss: "https://oracle-wrong-issuer.example" },
				rogue.privateJwk,
				rogue.kid,
			);
			forged["expired (rogue-signed)"] = signedToken(
				{ ...base, exp: Math.floor(Date.now() / 1000) - 120 },
				rogue.privateJwk,
				rogue.kid,
			);
			ctx.note(
				"issueToken not provided: wrong-audience, wrong-issuer and expired tokens are signed with the rogue key, so they also fail the signature check",
			);
		}
		const routes = Object.entries(ctx.adapter.services).flatMap(([service, spec]) =>
			spec.replicas.flatMap((replica) =>
				(spec.guardedRoutes ?? []).map((route) => ({ service, replica, route })),
			),
		);
		if (routes.length === 0) {
			ctx.blocked("guarded internal routes", "adapter lists no guardedRoutes");
			return;
		}
		const accepted: unknown[] = [];
		for (const { service, replica, route } of routes) {
			for (const [name, token] of Object.entries(forged)) {
				const client = new Client(replica.url, ctx.origin);
				const r = await client.request(route.method, route.path, {
					headers: { Authorization: `Bearer ${token}` },
					body: route.method === "GET" || route.method === "DELETE" ? undefined : {},
					noCookies: true,
				});
				if (r.status !== 401)
					accepted.push({
						service,
						replica: replica.name,
						route: `${route.method} ${route.path}`,
						forgery: name,
						status: r.status,
					});
			}
		}
		ctx.check(
			"every forged token is 401",
			accepted.length === 0,
			`401 for ${Object.keys(forged).length} forged tokens on ${routes.length} guarded route(s)`,
			accepted,
		);
	},
});
