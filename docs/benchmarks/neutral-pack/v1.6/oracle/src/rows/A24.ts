import { randomUUID } from "node:crypto";
import { BOT_AGENTS, HUMAN_AGENTS } from "../fixtures/clicks.ts";
import { destination } from "../fixtures/destinations.ts";
import type { CaptureEntry } from "../observe/capture-proxy.ts";
import { createGuest, hitSlug, type Link, redirectReplicaUrls, UUID } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

interface Window {
	kind: string;
	startMono: number;
	endMono: number;
}

export default defineRow({
	id: "A24",
	title: "Every successful GET has a durable record",
	scope: "Local; staging subset",
	expected:
		"Every 302 carries an event ID found among the captured messages for the right link; every fault-time failure is 503 without Location; HEAD has no event; bots are present; every message without a 302 is explained by a 410/503 carrying its ID or an in-flight request at a kill",
	requires: ["publicEntry", "pubsub"],
	coverage: "double",
	params: { phaseMs: 5_000, settleMs: 15_000, workers: 4, publishLeadToleranceMs: 50 },
	async run(ctx) {
		const capture = await ctx.pubsub();
		const proxy = await ctx.captureProxy();
		const links: Link[] = [];
		for (let i = 0; i < 4; i++)
			links.push((await createGuest(ctx, destination("A24", `${randomUUID()}-${i}`))).link);
		const headOnly = (await createGuest(ctx, destination("A24", `${randomUUID()}-head`))).link;
		const bySlug = new Map(links.map((l) => [l.slug, l]));
		const windows: Window[] = [];
		let kill: { replica: string; mono: number } | null = null;
		let stop = false;

		const traffic = Array.from({ length: ctx.params.workers }, async (_, w) => {
			let i = 0;
			while (!stop) {
				i++;
				const head = i % 9 === 0;
				const link = head ? headOnly : links[(i + w) % links.length];
				const agent =
					i % 5 === 0 ? BOT_AGENTS[i % BOT_AGENTS.length] : HUMAN_AGENTS[i % HUMAN_AGENTS.length];
				try {
					await hitSlug(ctx, proxy.url, link.slug, head ? "HEAD" : "GET", {
						userAgent: agent,
						timeoutMs: 30_000,
					});
				} catch {
					// recorded by the capture proxy
				}
				await ctx.sleep(40);
			}
		});

		const phase = async (kind: string, apply: () => Promise<void>, undo: () => Promise<void>) => {
			const startMono = ctx.mono();
			await apply();
			await ctx.sleep(ctx.params.phaseMs);
			await undo();
			windows.push({ kind, startMono, endMono: ctx.mono() });
			await ctx.sleep(ctx.params.phaseMs);
		};

		await ctx.sleep(ctx.params.phaseMs);
		const proxies = ctx.adapter.toxiproxy ? ctx.proxies("pubsub.publish") : [];
		if (proxies.length > 0) {
			const toxi = ctx.toxiproxy();
			for (const kind of ["refuse", "stall", "break"] as const) {
				await phase(
					kind,
					() => toxi.fault(kind, proxies),
					() => toxi.restore(proxies),
				);
			}
		} else {
			ctx.blocked("publisher faults", "no Toxiproxy proxy for pubsub.publish (or pubsub)");
		}
		const victim = redirectReplicaUrls(ctx)[0];
		if (ctx.commands.has("kill") && ctx.commands.has("start") && victim) {
			await phase(
				"kill",
				async () => {
					kill = { replica: victim.name, mono: ctx.mono() };
					await ctx.commands.run("kill", { target: victim.name });
				},
				async () => {
					await ctx.commands.run("start", { target: victim.name });
				},
			);
		} else {
			ctx.blocked("replica kill", "adapter commands kill and start are needed");
		}
		stop = true;
		await Promise.all(traffic);
		await ctx.sleep(ctx.params.settleMs);

		const entries = proxy.entries;
		await ctx.artifact("capture-proxy.json", entries);
		await ctx.artifact(
			"pubsub-capture.json",
			capture.messages.map((m) => ({ ...m, data: m.data.toString("utf8") })),
		);
		const events = capture.events();
		const inWindow = (e: CaptureEntry) =>
			windows.some(
				(w) => e.startMono <= w.endMono && (e.endMono ?? Number.POSITIVE_INFINITY) >= w.startMono,
			);
		const killInstant = kill as { replica: string; mono: number } | null;
		const inFlightAtKill = (e: CaptureEntry) =>
			!!killInstant &&
			e.startMono <= killInstant.mono &&
			(e.endMono ?? Number.POSITIVE_INFINITY) >= killInstant.mono &&
			e.status !== 302;

		const gets = entries.filter((e) => e.method === "GET");
		const redirects = gets.filter((e) => e.status === 302);
		ctx.check("traffic ran", redirects.length > 20, "more than 20 redirects captured", {
			requests: entries.length,
			redirects: redirects.length,
		});
		const noId = redirects.filter((e) => !e.clickEvent || !UUID.test(e.clickEvent));
		ctx.check(
			"every 302 carries an event ID",
			noId.length === 0,
			"QRWTY-Click-Event UUID on each 302",
			noId.slice(0, 5).map((e) => e.seq),
		);
		const missing = redirects.filter((e) => {
			const m = e.clickEvent ? events.get(e.clickEvent) : undefined;
			const link = bySlug.get(e.path.split("?")[0].slice(1));
			return !m || !link || m.json?.linkId !== link.id;
		});
		ctx.check(
			"every 302 event is captured for the right link",
			missing.length === 0,
			"a captured message with that eventId and the link's id",
			{
				missing: missing.length,
				sample: missing.slice(0, 5).map((e) => ({ seq: e.seq, clickEvent: e.clickEvent })),
			},
		);
		const early = redirects.filter((e) => {
			const m = e.clickEvent ? events.get(e.clickEvent) : undefined;
			return (
				m &&
				e.headWallMs !== null &&
				m.publishTimeMs > e.headWallMs + ctx.params.publishLeadToleranceMs
			);
		});
		ctx.check(
			"302 only after the publish",
			early.length === 0,
			`message publishTime ≤ response time + ${ctx.params.publishLeadToleranceMs} ms`,
			early.slice(0, 5).map((e) => ({
				seq: e.seq,
				response: e.headWallMs,
				published: events.get(e.clickEvent ?? "")?.publishTimeMs,
			})),
		);
		const badFailures = gets.filter(
			(e) => e.status !== 302 && !inFlightAtKill(e) && !(e.status === 503 && !e.location),
		);
		ctx.check(
			"failures are 503 without Location",
			badFailures.length === 0,
			"every non-302 GET is 503 without Location (or in flight at the kill)",
			badFailures.slice(0, 5).map((e) => ({
				seq: e.seq,
				status: e.status,
				location: e.location,
				error: e.upstreamError,
				inWindow: inWindow(e),
			})),
		);
		const faultTime = gets.filter((e) => inWindow(e) && e.status !== 302);
		ctx.note(
			`fault windows: ${windows.map((w) => w.kind).join(", ")}; fault-time failures: ${faultTime.length}`,
		);
		const heads = entries.filter((e) => e.method === "HEAD");
		ctx.check(
			"HEAD has no event",
			heads.every((e) => !e.clickEvent) &&
				![...events.values()].some((m) => m.json?.linkId === headOnly.id),
			"no QRWTY-Click-Event on HEAD and no message for the HEAD-only link",
			{ heads: heads.length, withHeader: heads.filter((e) => e.clickEvent).length },
		);
		const botRedirects = redirects.filter(
			(e) =>
				/bot|curl|python-requests|facebookexternalhit/i.test(
					e.requestHeaders["user-agent"] ?? "",
				) || (e.requestHeaders["user-agent"] ?? "") === "",
		);
		const botEvents = botRedirects.map((e) => events.get(e.clickEvent ?? "")?.json?.deviceClass);
		ctx.check(
			"bots are present",
			botRedirects.length > 0 && botEvents.every((c) => c === "bot"),
			"bot GETs are recorded with deviceClass bot",
			{ bots: botRedirects.length, classes: [...new Set(botEvents)] },
		);
		const explained = new Set(
			entries
				.filter((e) => e.clickEvent && (e.status === 302 || e.status === 410 || e.status === 503))
				.map((e) => e.clickEvent),
		);
		const ours = new Set([...links.map((l) => l.id), headOnly.id]);
		const unexplained = [...events.values()].filter(
			(m) => ours.has(String(m.json?.linkId)) && !explained.has(String(m.json?.eventId)),
		);
		const allowance = gets.filter(inFlightAtKill).length;
		ctx.check(
			"every message without a 302 is explained",
			unexplained.length <= allowance,
			`unexplained messages ≤ ${allowance} requests in flight at the kill`,
			{ unexplained: unexplained.length, allowance },
		);
		ctx.observed.counts = {
			requests: entries.length,
			redirects: redirects.length,
			messages: capture.messages.length,
			uniqueEvents: events.size,
			faultTimeFailures: faultTime.length,
		};
	},
});
