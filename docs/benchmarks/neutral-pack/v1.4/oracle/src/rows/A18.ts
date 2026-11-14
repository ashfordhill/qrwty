import { randomUUID } from "node:crypto";
import type { Response } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { asLink, createGuest, hitSlug, profileCheck } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

const NOT_IMPLEMENTED = /not[\s_-]?implemented/i;

export default defineRow({
	id: "A18",
	title: "Unimplemented and error inventory; placeholder credentials at startup",
	scope: "Local",
	expected: 'No 501 or "not implemented" anywhere; placeholders refused at startup',
	requires: ["publicEntry", "identity"],
	coverage: "double",
	async run(ctx) {
		const guest = ctx.api();
		const alice = await ctx.signedIn("alice");
		const operator = await ctx.signedIn("operator");
		const own = asLink(await alice.createLink(destination("A18", randomUUID())));
		const guestLink = await createGuest(ctx, destination("A18", `${randomUUID()}-g`));
		if (!own) throw new Error("owned create failed");
		const id = encodeURIComponent(own.id);
		const calls: [string, () => Promise<Response>][] = [
			["GET /api/v1/session", () => guest.get("/api/v1/session")],
			["GET /auth/login", () => guest.get("/auth/login?returnTo=/")],
			[
				"GET /auth/login (absolute returnTo)",
				() => guest.get("/auth/login?returnTo=https://evil.example/"),
			],
			["GET /auth/callback (no code)", () => guest.get("/auth/callback")],
			[
				"POST /auth/logout (guest)",
				() => guest.mutate("POST", "/auth/logout", undefined, { idempotencyKey: false }),
			],
			[
				"POST /api/v1/links (invalid JSON)",
				() =>
					guest.mutate("POST", "/api/v1/links", undefined, {
						idempotencyKey: true,
						rawBody: "{not json",
						headers: { "Content-Type": "application/json" },
					}),
			],
			[
				"POST /api/v1/links (missing destination)",
				() => guest.mutate("POST", "/api/v1/links", {}, { idempotencyKey: true }),
			],
			[
				"POST /api/v1/links (owned)",
				() => alice.createLink(destination("A18", `${randomUUID()}-o`)),
			],
			[
				"POST claim (guest, no session)",
				() => guest.claim(guestLink.link.id, guestLink.link.claim?.token ?? ""),
			],
			["POST claim (bad proof)", () => alice.claim(guestLink.link.id, "oracle-bad-proof")],
			["POST claim (unknown id)", () => alice.claim("oracle-unknown-id", "x")],
			["GET /api/v1/me/links", () => alice.listLinks()],
			["GET /api/v1/me/links (limit 51)", () => alice.listLinks("?limit=51")],
			["GET /api/v1/links/{id}", () => alice.getLink(own.id)],
			[
				"PATCH /api/v1/links/{id} (invalid destination)",
				() => alice.patchLink(own.id, { destination: "javascript:alert(1)" }, `"${own.version}"`),
			],
			[
				"PATCH /api/v1/links/{id} (unknown state)",
				() => alice.patchLink(own.id, { state: "deleted" }, `"${own.version}"`),
			],
			["GET analytics", () => alice.analytics(own.id)],
			[
				"GET analytics (from after to)",
				() => alice.analytics(own.id, "?from=2026-11-10&to=2026-11-01"),
			],
			["GET analytics.csv", () => alice.csv(own.id)],
			[
				"POST /api/v1/abuse-reports",
				() =>
					guest.mutate(
						"POST",
						"/api/v1/abuse-reports",
						{ shortUrl: own.shortUrl, reason: "spam" },
						{ idempotencyKey: false },
					),
			],
			[
				"POST /api/v1/abuse-reports (bad reason)",
				() =>
					guest.mutate(
						"POST",
						"/api/v1/abuse-reports",
						{ shortUrl: own.shortUrl, reason: "oracle" },
						{ idempotencyKey: false },
					),
			],
			["GET operator by-slug", () => operator.get(`/api/v1/operator/links/by-slug/${own.slug}`)],
			[
				"POST operator block (no reason)",
				() =>
					operator.mutate(
						"POST",
						`/api/v1/operator/links/${id}/block`,
						{},
						{ idempotencyKey: false },
					),
			],
			[
				"POST operator unblock",
				() =>
					operator.mutate(
						"POST",
						`/api/v1/operator/links/${id}/unblock`,
						{ reason: "oracle" },
						{ idempotencyKey: false },
					),
			],
			["GET /api/v1/me/billing", () => alice.billing()],
			[
				"POST checkout (unknown plan)",
				() =>
					alice.mutate(
						"POST",
						"/api/v1/billing/checkout",
						{ plan: "oracle-unknown" },
						{ idempotencyKey: true },
					),
			],
			[
				"POST checkout",
				() =>
					alice.mutate(
						"POST",
						"/api/v1/billing/checkout",
						{ plan: "paid-monthly" },
						{ idempotencyKey: true },
					),
			],
			[
				"POST portal",
				() => alice.mutate("POST", "/api/v1/billing/portal", undefined, { idempotencyKey: false }),
			],
			[
				"POST webhook (unsigned)",
				() =>
					guest.mutate(
						"POST",
						"/api/v1/billing/webhook",
						{ id: "evt_oracle", type: "ping" },
						{ idempotencyKey: false, csrf: false },
					),
			],
			[
				"DELETE /api/v1/me (no key)",
				() => alice.mutate("DELETE", "/api/v1/me", undefined, { idempotencyKey: false }),
			],
			["DELETE /api/v1/links/{id}", () => alice.deleteLink(own.id)],
			["GET /{slug} (deleted)", () => hitSlug(ctx, ctx.adapter.publicEntry.url, own.slug)],
			[
				"GET /{slug} (guest link)",
				() => hitSlug(ctx, ctx.adapter.publicEntry.url, guestLink.link.slug),
			],
			[
				"HEAD /{slug}",
				() => hitSlug(ctx, ctx.adapter.publicEntry.url, guestLink.link.slug, "HEAD"),
			],
			["PUT /{slug}", () => hitSlug(ctx, ctx.adapter.publicEntry.url, guestLink.link.slug, "PUT")],
			["GET /{unknown}", () => hitSlug(ctx, ctx.adapter.publicEntry.url, "ZzZzZzZzZz")],
			["GET /api/v1/unknown-route", () => guest.get("/api/v1/oracle-unknown")],
		];
		const results: { call: string; status: number; flagged: boolean }[] = [];
		for (const [call, send] of calls) {
			const r = await send();
			results.push({
				call,
				status: r.status,
				flagged: r.status === 501 || NOT_IMPLEMENTED.test(r.text),
			});
		}
		await ctx.artifact("route-inventory.json", results);
		const flagged = results.filter((r) => r.flagged);
		ctx.check(
			"no 501 or not implemented",
			flagged.length === 0,
			`none of ${results.length} calls returns 501 or says "not implemented"`,
			flagged,
		);
		ctx.note(
			"DELETE /api/v1/me is called with invalid input only (A15 deletes an account with valid input)",
		);

		const check = ctx.adapter.productionProfileCheck;
		const placeholders =
			check?.settings.filter((s) => s.category === "placeholder-credential") ?? [];
		if (!check || placeholders.length === 0) {
			ctx.blocked(
				"placeholder credentials refused",
				"productionProfileCheck declares no placeholder-credential setting",
			);
			return;
		}
		for (const process of check.processes) {
			for (const setting of placeholders) {
				const out = await profileCheck(ctx, process, setting);
				ctx.check(
					`placeholder ${setting.name} refused by ${process}`,
					out.refused,
					"startup refused with a named reason",
					out,
				);
			}
		}
	},
});
