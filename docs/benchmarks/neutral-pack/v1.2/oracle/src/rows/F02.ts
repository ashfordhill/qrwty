import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { brief, createGuest, hitSlug, poll } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "F02",
	title: "Postgres refused and stalled, then restored",
	scope: "Local",
	expected:
		"Cached valid routes redirect only until their validatedUntil (≤ 30 s), then 503 with Retry-After; writes fail with 503, never a false success; service recovers without restart",
	requires: ["publicEntry", "toxiproxy"],
	coverage: "live-arm",
	liveArmReason: "needs the arm's Links database behind Toxiproxy and its route cache",
	params: { validatedMs: 30_000, marginMs: 3_000, maxLatencyMs: 30_000 },
	async run(ctx) {
		const entry = ctx.adapter.publicEntry.url;
		const proxies = ctx.proxies("postgres.links");
		const toxi = ctx.toxiproxy();
		for (const kind of ["refuse", "stall"] as const) {
			const { link } = await createGuest(ctx, destination("F02", `${kind}-${randomUUID()}`));
			const warmed = await hitSlug(ctx, entry, link.slug);
			const lastRead = Date.now();
			await toxi.fault(kind, proxies);
			const observations: {
				at: number;
				status: number;
				retryAfter: boolean;
				location: boolean;
				ms: number;
			}[] = [];
			try {
				const end = Date.now() + ctx.params.validatedMs + ctx.params.marginMs + 5_000;
				while (Date.now() < end) {
					const started = Date.now();
					const r = await hitSlug(ctx, entry, link.slug, "GET", {
						timeoutMs: ctx.params.maxLatencyMs + 5_000,
					}).catch(() => null);
					observations.push({
						at: started,
						status: r?.status ?? 0,
						retryAfter: !!r?.header("retry-after"),
						location: !!r?.header("location"),
						ms: Date.now() - started,
					});
					await ctx.sleep(500);
				}
				const write = await ctx
					.api()
					.createLink(destination("F02", `${kind}-write`))
					.catch(() => null);
				ctx.check(
					`${kind}: write fails explicitly`,
					write?.status === 503,
					"503, never a false 201",
					write ? brief(write) : "no response",
				);
			} finally {
				await toxi.restore(proxies);
			}
			ctx.check(`${kind}: warmed`, warmed.status === 302, "302 before the fault", brief(warmed));
			const late302 = observations.filter(
				(o) => o.status === 302 && o.at > lastRead + ctx.params.validatedMs + ctx.params.marginMs,
			);
			ctx.check(
				`${kind}: cache only until validatedUntil`,
				late302.length === 0,
				`no 302 later than ${ctx.params.validatedMs / 1000} s after the last authoritative read`,
				late302.slice(0, 3),
			);
			const after = observations.filter(
				(o) => o.at > lastRead + ctx.params.validatedMs + ctx.params.marginMs,
			);
			ctx.check(
				`${kind}: 503 with Retry-After afterwards`,
				after.length > 0 && after.every((o) => o.status === 503 && o.retryAfter && !o.location),
				"503 with Retry-After and no Location",
				after.slice(0, 3),
			);
			ctx.check(
				`${kind}: bounded latency`,
				observations.every((o) => o.ms <= ctx.params.maxLatencyMs),
				`every response within ${ctx.params.maxLatencyMs} ms`,
				Math.max(...observations.map((o) => o.ms)),
			);
			const recovered = await poll(
				() =>
					ctx
						.api()
						.createLink(destination("F02", `${kind}-recovered-${randomUUID()}`))
						.catch(() => null),
				(r) => r?.status === 201,
				60_000,
				2_000,
			);
			ctx.check(
				`${kind}: recovers without restart`,
				recovered.ok,
				"201 within 60 s of restoring the database, no restart command",
				recovered.value ? brief(recovered.value) : null,
			);
		}
	},
});
