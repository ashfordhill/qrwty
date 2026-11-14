import { randomUUID } from "node:crypto";
import { Client } from "../client/client.ts";
import { EVENT_FIELDS, knownStream } from "../fixtures/clicks.ts";
import { destination } from "../fixtures/destinations.ts";
import type { CapturedMessage } from "../observe/pubsub-capture.ts";
import { asLink, hitSlug, poll, redirectReplicaUrls } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

interface Analytics {
	totals?: { recordedAttempts?: number; filteredClicks?: number };
	series?: { recordedAttempts: number; filteredClicks: number }[];
	freshness?: { delayed?: boolean };
	filter?: { version?: string };
}

export default defineRow({
	id: "A10",
	title: "Known click stream with duplicates, out-of-order and late messages",
	scope: "Local",
	expected:
		"After freshness: recordedAttempts equals the number of unique non-synthetic event IDs; filteredClicks excludes filter-v1 bots; HEAD, probes and synthetic GETs are excluded",
	requires: ["publicEntry", "identity", "pubsub", "edge"],
	coverage: "double",
	params: { captureWaitMs: 30_000, freshnessWaitMs: 120_000 },
	async run(ctx) {
		const alice = await ctx.signedIn("alice");
		const capture = await ctx.pubsub();
		const created = await alice.createLink(destination("A10", randomUUID()));
		const link = asLink(created);
		if (created.status !== 201 || !link) throw new Error(`owned create returned ${created.status}`);
		const replicas = redirectReplicaUrls(ctx);
		const stream = knownStream({ human: 12, bot: 6, head: 4, synthetic: 4, probe: 4 });
		const eventIdsByKind: Record<string, string[]> = {
			human: [],
			bot: [],
			synthetic: [],
			head: [],
		};
		const statuses: number[] = [];
		for (const [i, click] of stream.entries()) {
			const replica = replicas[i % replicas.length];
			if (click.kind === "probe") {
				const spec = Object.values(ctx.adapter.services).find((s) => s.roles.includes("redirect"));
				const probe = new Client(replica.url, ctx.origin);
				await probe.request(
					"GET",
					i % 2 === 0 ? (spec?.health ?? "/healthz") : (spec?.readiness ?? "/readyz"),
					{ headers: { "User-Agent": click.userAgent } },
				);
				continue;
			}
			const response =
				click.kind === "synthetic"
					? await hitSlug(ctx, ctx.adapter.publicEntry.url, link.slug, "GET", {
							userAgent: click.userAgent,
							edge: ctx.edge("198.19.200.1", { synthetic: click.probeId }),
						})
					: await hitSlug(ctx, replica.url, link.slug, click.kind === "head" ? "HEAD" : "GET", {
							userAgent: click.userAgent,
							headers: click.referer ? { Referer: click.referer } : {},
						});
			statuses.push(response.status);
			const id = response.header("qrwty-click-event");
			if (id) eventIdsByKind[click.kind].push(id);
		}
		const gets = stream.filter(
			(c) => c.kind === "human" || c.kind === "bot" || c.kind === "synthetic",
		).length;
		ctx.check(
			"stream redirects",
			statuses.every((s) => s === 302),
			"302 for every GET and HEAD of the stream",
			[...new Set(statuses)],
		);
		ctx.check(
			"HEAD carries no event",
			eventIdsByKind.head.length === 0,
			"no QRWTY-Click-Event on HEAD",
			eventIdsByKind.head.length,
		);
		const forLink = () => [...capture.events().values()].filter((m) => m.json?.linkId === link.id);
		const arrived = await capture.waitFor(() => forLink().length >= gets, ctx.params.captureWaitMs);
		ctx.check(
			"every GET has a captured event",
			arrived && forLink().length === gets,
			`${gets} unique events (humans, bots, synthetic)`,
			forLink().length,
		);

		const byId = new Map(forLink().map((m) => [String(m.json?.eventId), m]));
		const botClasses = eventIdsByKind.bot.map((id) => byId.get(id)?.json?.deviceClass);
		ctx.check(
			"bots classified",
			botClasses.every((c) => c === "bot"),
			"deviceClass bot for filter-v1 agents",
			botClasses,
		);
		const synth = eventIdsByKind.synthetic.map((id) => byId.get(id)?.json?.synthetic);
		ctx.check(
			"synthetic GETs marked",
			synth.length > 0 && synth.every((s) => s === true),
			"synthetic true for trusted-edge probes",
			synth,
		);
		const humanWithReferrer = eventIdsByKind.human
			.map((id) => byId.get(id)?.json?.referrerHost)
			.filter((h) => h !== null && h !== undefined);
		ctx.check(
			"referrer host only",
			humanWithReferrer.every((h) => h === "referrer.example.org"),
			"lowercase host, no path or query",
			[...new Set(humanWithReferrer)],
		);
		const extraFields = forLink().flatMap((m) =>
			Object.keys(m.json ?? {}).filter((k) => !EVENT_FIELDS.includes(k)),
		);
		ctx.check(
			"event fields",
			extraFields.length === 0 && forLink().every((m) => m.attributes.schemaVersion === "1"),
			'only click-event v1 fields; attribute schemaVersion "1"',
			[...new Set(extraFields)],
		);

		// Duplicates (same event IDs), an out-of-order message and a late message within the window.
		const originals: CapturedMessage[] = forLink();
		await capture.republish(originals);
		const nonSynthetic = originals.find((m) => m.json?.synthetic === false);
		if (!nonSynthetic) throw new Error("no non-synthetic message captured");
		await capture.publishOlder(nonSynthetic, 3_600_000);
		await capture.publishOlder(nonSynthetic, 2 * 86_400_000);
		await ctx.sleep(2_000);
		const unique = forLink().filter((m) => m.json?.synthetic !== true);
		const expected = unique.length;
		const expectedFiltered = unique.filter((m) => m.json?.deviceClass !== "bot").length;
		const result = await poll(
			() => alice.analytics(link.id),
			(r) =>
				r.status === 200 &&
				(r.json as Analytics).totals?.recordedAttempts === expected &&
				(r.json as Analytics).freshness?.delayed === false,
			ctx.params.freshnessWaitMs,
			1_000,
		);
		const body = (result.value.json ?? {}) as Analytics;
		await ctx.artifact("analytics.json", body);
		ctx.check(
			"recordedAttempts",
			body.totals?.recordedAttempts === expected,
			`${expected} unique non-synthetic events`,
			body.totals?.recordedAttempts ?? null,
		);
		ctx.check(
			"filteredClicks",
			body.totals?.filteredClicks === expectedFiltered,
			`${expectedFiltered} (filter-v1 bots excluded)`,
			body.totals?.filteredClicks ?? null,
		);
		ctx.check(
			"fresh",
			body.freshness?.delayed === false,
			"freshness.delayed false",
			body.freshness ?? null,
		);
		const seriesTotal = (body.series ?? []).reduce((n, d) => n + d.recordedAttempts, 0);
		ctx.check(
			"series sums to totals",
			seriesTotal === body.totals?.recordedAttempts,
			"sum of series.recordedAttempts = totals",
			seriesTotal,
		);
		ctx.check(
			"filter version",
			body.filter?.version === "filter-v1",
			"filter-v1",
			body.filter?.version ?? null,
		);
	},
});
