import { randomUUID } from "node:crypto";
import { errorCode } from "../client/client.ts";
import { destination } from "../fixtures/destinations.ts";
import { asLink, brief, isError, leaks } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A06",
	title: "Cross-account object IDs and cursors; no session; bad session cookie on create",
	scope: "Local; staging subset",
	expected:
		"404 for every foreign object; 400 invalid_cursor; 401 without a session; 401 (not a guest 201) with the bad cookie; no Bob data in any body",
	requires: ["publicEntry", "identity"],
	coverage: "double",
	async run(ctx) {
		const run = randomUUID().slice(0, 8);
		const bob = await ctx.signedIn("bob");
		const alice = await ctx.signedIn("alice");
		const bobLinks = [];
		for (let i = 0; i < 2; i++) {
			const r = await bob.createLink(destination("A06", `${run}-bob-${i}`));
			const link = asLink(r);
			if (r.status !== 201 || !link) throw new Error(`Bob's owned create returned ${r.status}`);
			bobLinks.push(link);
		}
		const target = bobLinks[0];
		const bobData = [
			target.destination,
			target.shortUrl,
			bobLinks[1].destination,
			bobLinks[1].shortUrl,
		];
		const foreign = [
			["read", await alice.getLink(target.id)],
			[
				"edit",
				await alice.patchLink(
					target.id,
					{ destination: destination("A06", `${run}-hijack`) },
					`"${target.version}"`,
				),
			],
			["delete", await alice.deleteLink(target.id)],
			["analytics", await alice.analytics(target.id)],
			["csv", await alice.csv(target.id)],
		] as const;
		for (const [operation, response] of foreign) {
			ctx.check(
				`foreign ${operation}`,
				isError(response, 404, "not_found") && leaks(response, bobData).length === 0,
				"404 not_found without Bob data",
				brief(response),
			);
		}
		// Claim: http-contract §4 allows 409 claim_consumed "also when another account owns it";
		// A06 asks for denial without data. Any of 404, 403 claim_invalid or 409 claim_consumed passes.
		const claim = await alice.claim(target.id, "oracle-not-a-proof");
		const claimDenied =
			isError(claim, 404, "not_found") ||
			isError(claim, 403, "claim_invalid") ||
			isError(claim, 409, "claim_consumed");
		ctx.check(
			"foreign claim",
			claimDenied && leaks(claim, bobData).length === 0,
			"denied (404, 403 claim_invalid or 409 claim_consumed) without Bob data",
			brief(claim),
		);
		const unknown = await alice.getLink(`${target.id}x`);
		ctx.check(
			"unknown id matches foreign id",
			unknown.status === 404 && errorCode(unknown) === "not_found",
			"404 not_found (no existence oracle)",
			brief(unknown),
		);
		const still = await bob.getLink(target.id);
		ctx.check(
			"Bob's link untouched",
			still.status === 200 && asLink(still)?.destination === target.destination,
			"Bob still reads his unchanged link",
			brief(still),
		);

		const page = await bob.listLinks("?limit=1");
		const cursor = (page.json as { nextCursor?: string | null } | undefined)?.nextCursor;
		if (cursor) {
			const stolen = await alice.listLinks(`?limit=1&cursor=${encodeURIComponent(cursor)}`);
			ctx.check(
				"foreign cursor",
				isError(stolen, 400, "invalid_cursor") && leaks(stolen, bobData).length === 0,
				"400 invalid_cursor",
				brief(stolen),
			);
		} else {
			ctx.check(
				"Bob's cursor exists",
				false,
				"a nextCursor with limit=1 and two links",
				brief(page),
			);
		}
		const malformed = await alice.listLinks("?cursor=oracle-not-a-cursor");
		ctx.check(
			"malformed cursor",
			isError(malformed, 400, "invalid_cursor"),
			"400 invalid_cursor",
			brief(malformed),
		);

		const nobody = ctx.api();
		const owner = [
			["list", await nobody.listLinks()],
			["read", await nobody.getLink(target.id)],
			["analytics", await nobody.analytics(target.id)],
			["csv", await nobody.csv(target.id)],
			["billing", await nobody.billing()],
		] as const;
		for (const [operation, response] of owner) {
			ctx.check(
				`no session: ${operation}`,
				response.status === 401 && leaks(response, bobData).length === 0,
				"401",
				brief(response),
			);
		}

		// A revoked session cookie and a garbage cookie on create: 401, never a guest 201.
		const carol = ctx.api();
		const signedIn = await ctx.signIn(carol, "alice");
		if (!signedIn.ok)
			throw new Error(
				`sign-in for the revoked-session case failed: ${signedIn.reason} [${signedIn.steps.join(" > ")}]`,
			);
		await carol.session();
		const revokedJar = carol.client.jar.clone();
		// The session's cookie names, read before any later answer can change a jar.
		const sessionCookieNames = revokedJar.names();
		const revokedCsrf = carol.csrfToken;
		const logout = await carol.mutate("POST", "/auth/logout", undefined, { idempotencyKey: false });
		ctx.check("logout", logout.status === 204, "204", brief(logout));
		const stale = ctx.api();
		// A copy, never revokedJar itself: an arm may clear the revoked cookie in its 401.
		stale.client.jar = revokedJar.clone();
		stale.csrfToken = revokedCsrf;
		const revokedCreate = await stale.createLink(destination("A06", `${run}-revoked`));
		ctx.check(
			"revoked session on create",
			revokedCreate.status === 401,
			"401 (not a guest 201)",
			brief(revokedCreate),
		);
		// A separate jar: every session cookie name, each with a value the arm never issued. The
		// CSRF token is passed directly, so the create is the only request and carries that cookie.
		const garbage = ctx.api();
		for (const name of sessionCookieNames)
			garbage.client.jar.set(name, "oracle-invalid-session-value");
		const sentCookieNames = garbage.client.jar.names();
		const garbageCreate = await garbage.mutate(
			"POST",
			"/api/v1/links",
			{ destination: destination("A06", `${run}-garbage`) },
			{ idempotencyKey: true, csrf: revokedCsrf ?? false },
		);
		ctx.check(
			"invalid session cookie on create",
			sentCookieNames.length > 0 && garbageCreate.status === 401,
			"a present but invalid session cookie is sent; 401 (not a guest 201)",
			{ ...brief(garbageCreate), cookieNames: sentCookieNames },
		);
	},
});
