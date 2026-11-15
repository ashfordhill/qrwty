import { randomUUID } from "node:crypto";
import { Client } from "../client/client.ts";
import { buildRequest } from "../client/raw.ts";
import { ACCEPTED, REPUTATION, rejected } from "../fixtures/destinations.ts";
import { asLink, brief, createGuest, hitSlug, isError } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

/** The raw bytes of the first Location header line, as sent (no trimming beyond the OWS). */
function rawLocation(rawHeaders: [string, string][]): string | null {
	const found = rawHeaders.find(([name]) => name.toLowerCase() === "location");
	return found ? found[1] : null;
}

export default defineRow({
	id: "A09",
	title: "HTTP and URL edge cases",
	scope: "Local",
	expected:
		"Accepted entries return Location byte-equal to the expected value; rejected entries are 400 invalid_destination; 302 has Cache-Control: no-store; HEAD matches GET without body or event; 405 with Allow; foreign host refused without Location; spoofed headers change nothing; the query is not forwarded",
	requires: ["publicEntry"],
	coverage: "double",
	params: { headSettleMs: 5_000 },
	async run(ctx) {
		const entry = ctx.adapter.publicEntry.url;
		const capture = ctx.adapter.pubsub ? await ctx.pubsub() : null;
		const accepted = [];
		for (const c of ACCEPTED) {
			const created = await ctx.api().createLink(c.input);
			const link = asLink(created);
			if (created.status !== 201 || !link) {
				ctx.check(`accept ${c.note}`, false, "201", {
					input: c.input.slice(0, 120),
					...brief(created),
				});
				continue;
			}
			const get = await hitSlug(ctx, entry, link.slug);
			const location = rawLocation(get.rawHeaders);
			ctx.check(
				`accept ${c.note}`,
				get.status === 302 && location === c.expected,
				`302 with Location byte-equal to ${c.expected.slice(0, 120)}`,
				{ status: get.status, location: location?.slice(0, 200) ?? null },
			);
			ctx.check(
				`no-store ${c.note}`,
				/(^|,)\s*no-store\s*(,|$)/i.test(get.header("cache-control") ?? ""),
				"Cache-Control: no-store",
				get.header("cache-control") ?? null,
			);
			accepted.push({ link, expected: c.expected });
		}
		const badInputs = rejected(ctx.origin);
		const notRejected: unknown[] = [];
		for (const input of badInputs) {
			const r = await ctx.api().createLink(input);
			if (!isError(r, 400, "invalid_destination"))
				notRejected.push({ input: JSON.stringify(input).slice(0, 100), ...brief(r) });
		}
		ctx.check(
			"rejected corpus",
			notRejected.length === 0,
			`${badInputs.length} × 400 invalid_destination`,
			notRejected,
		);

		// Reputation verdicts from the Web Risk fixture (acceptance-oracle.md, "Reputation fixture verdicts").
		if (ctx.run.webRisk) {
			const unsafe = await ctx.api().createLink(REPUTATION.unsafe);
			ctx.check(
				"reputation: unsafe",
				isError(unsafe, 422, "reputation_rejected"),
				"422 reputation_rejected",
				brief(unsafe),
			);
			for (const [name, url] of [
				["slow", REPUTATION.slow],
				["error", REPUTATION.error],
			] as const) {
				const r = await ctx.api().createLink(url);
				ctx.check(
					`reputation: ${name}`,
					isError(r, 503, "reputation_unavailable") && !!r.header("retry-after"),
					"503 reputation_unavailable with Retry-After",
					brief(r),
				);
			}
			const calls = ctx.webRisk().calls;
			const types = new Set(calls.flatMap((c) => c.threatTypes));
			ctx.check(
				"reputation: threat types",
				["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"].every((t) => types.has(t)),
				"uris.search with MALWARE, SOCIAL_ENGINEERING and UNWANTED_SOFTWARE",
				[...types],
			);
		} else {
			ctx.blocked("reputation verdicts", "adapter has no providers.webRisk binding");
		}

		const plain = accepted[0];
		if (!plain) return;
		// HEAD: same status and headers as GET, no body, no event, no QRWTY-Click-Event.
		const headOnly = await createGuest(
			ctx,
			`https://example.com/oracle/a09/head-only/${randomUUID()}`,
		);
		const head = await hitSlug(ctx, entry, headOnly.link.slug, "HEAD");
		const headLocation = rawLocation(head.rawHeaders);
		ctx.check(
			"HEAD matches GET",
			head.status === 302 &&
				headLocation === headOnly.link.destination &&
				/no-store/i.test(head.header("cache-control") ?? "") &&
				head.body.length === 0,
			"302, same Location, no-store, empty body",
			{ ...brief(head), bodyBytes: head.body.length },
		);
		ctx.check(
			"HEAD has no event header",
			head.header("qrwty-click-event") === undefined,
			"no QRWTY-Click-Event",
			head.header("qrwty-click-event") ?? null,
		);
		if (capture) {
			await ctx.sleep(ctx.params.headSettleMs);
			const events = [...capture.events().values()].filter(
				(m) => m.json?.linkId === headOnly.link.id,
			);
			ctx.check(
				"HEAD emits no event",
				events.length === 0,
				"no Pub/Sub message for a link that only received HEAD",
				events.length,
			);
		} else {
			ctx.blocked("HEAD emits no event", "adapter has no pubsub section");
		}
		for (const method of ["POST", "PUT", "DELETE"]) {
			const r = await hitSlug(ctx, entry, plain.link.slug, method);
			const allow = (r.header("allow") ?? "").toUpperCase().split(/\s*,\s*/);
			ctx.check(
				`${method} on a slug`,
				r.status === 405 &&
					allow.includes("GET") &&
					allow.includes("HEAD") &&
					!r.header("location"),
				"405 with Allow: GET, HEAD and no Location",
				brief(r),
			);
		}
		const foreign = await hitSlug(ctx, entry, plain.link.slug, "GET", { host: "evil.example" });
		ctx.check(
			"foreign Host",
			foreign.status !== 302 && foreign.status < 500 && !foreign.header("location"),
			"refused (404 or 421) without Location",
			brief(foreign),
		);
		// Response splitting: an encoded CR LF in the path or query never becomes a header.
		const split = await new Client(entry, ctx.origin).raw(
			buildRequest({
				method: "GET",
				path: `/${plain.link.slug}%0D%0AX-Injected:%20oracle`,
				headers: [["Host", new URL(ctx.origin).host]],
			}),
		);
		ctx.check(
			"encoded CR LF in the path",
			split.status !== 302 && !split.header("location") && split.header("x-injected") === undefined,
			"no redirect and no injected header",
			brief(split),
		);
		const splitQuery = await hitSlug(ctx, entry, plain.link.slug, "GET", {
			query: "?x=%0D%0AX-Injected:%20oracle",
		});
		ctx.check(
			"encoded CR LF in the query",
			splitQuery.status === 302 &&
				rawLocation(splitQuery.rawHeaders) === plain.expected &&
				splitQuery.header("x-injected") === undefined,
			"302 to the saved destination, no injected header",
			brief(splitQuery),
		);
		const query = await hitSlug(ctx, entry, plain.link.slug, "GET", {
			query: "?utm_source=oracle&x=1",
		});
		ctx.check(
			"query not forwarded",
			query.status === 302 && rawLocation(query.rawHeaders) === plain.expected,
			`302 to ${plain.expected}`,
			brief(query),
		);

		// Spoofed identity and forwarding headers on a guest create change nothing.
		const spoofer = ctx.api();
		const spoofed = await spoofer.mutate(
			"POST",
			"/api/v1/links",
			{ destination: `https://example.com/oracle/a09/spoof/${randomUUID()}` },
			{
				idempotencyKey: true,
				headers: {
					"X-Forwarded-For": "203.0.113.77",
					"x-user-id": "oracle-alice",
					"X-Forwarded-Host": "evil.example",
				},
			},
		);
		const body = (spoofed.json ?? {}) as { owned?: boolean; claim?: unknown; shortUrl?: string };
		ctx.check(
			"spoofed headers change nothing",
			spoofed.status === 201 &&
				body.owned === false &&
				!!body.claim &&
				(body.shortUrl ?? "").startsWith(`${ctx.origin}/`),
			"201 guest link (owned false, claim present) on the public origin",
			{
				...brief(spoofed),
				owned: body.owned ?? null,
				claim: !!body.claim,
				shortUrlOrigin: body.shortUrl ? new URL(body.shortUrl).origin : null,
			},
		);
	},
});
