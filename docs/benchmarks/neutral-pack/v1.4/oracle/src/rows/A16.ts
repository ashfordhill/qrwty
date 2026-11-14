import { randomUUID } from "node:crypto";
import type { RowContext } from "../context.ts";
import { destination } from "../fixtures/destinations.ts";
import { asLink, brief, hitSlug, operatorBlock, poll, redirectReplicaUrls } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

async function converge(ctx: RowContext, slug: string, status: number, boundMs: number) {
	const replicas = redirectReplicaUrls(ctx);
	return poll(
		async () =>
			Promise.all(
				replicas.map(async (r) => ({
					replica: r.name,
					status: (await hitSlug(ctx, r.url, slug)).status,
				})),
			),
		(list) => list.every((o) => o.status === status),
		boundMs,
		500,
	);
}

export default defineRow({
	id: "A16",
	title: "Public reports, non-operator calls, operator block and unblock",
	scope: "Local",
	expected:
		"Reports alone change nothing; non-operator 404; block reaches every replica within 60 s (403); actor and reason recorded",
	requires: ["publicEntry", "identity", "command:inspect"],
	coverage: "double",
	params: { reports: 20, propagationMs: 60_000 },
	async run(ctx) {
		const alice = await ctx.signedIn("alice");
		const dest = destination("A16", randomUUID());
		const link = asLink(await alice.createLink(dest));
		if (!link) throw new Error("owned create failed");
		const reports = [];
		for (let i = 0; i < ctx.params.reports; i++) {
			reports.push(
				await ctx
					.api()
					.mutate(
						"POST",
						"/api/v1/abuse-reports",
						{ shortUrl: link.shortUrl, reason: "phishing", details: `oracle report ${i}` },
						{ idempotencyKey: false },
					),
			);
		}
		ctx.check(
			"reports acknowledged",
			reports.every(
				(r) =>
					r.status === 202 && (r.json as { received?: boolean } | undefined)?.received === true,
			),
			"202 {received: true}",
			[...new Set(reports.map((r) => r.status))],
		);
		const unknown = await ctx
			.api()
			.mutate(
				"POST",
				"/api/v1/abuse-reports",
				{ shortUrl: `${ctx.origin}/ZzZzZzZzZz`, reason: "spam" },
				{ idempotencyKey: false },
			);
		ctx.check(
			"report on an unknown link",
			unknown.status === 202,
			"202 even for an unknown link",
			brief(unknown),
		);
		const afterReports = await converge(ctx, link.slug, 302, 5_000);
		ctx.check(
			"reports alone change nothing",
			afterReports.ok,
			"302 on every replica after many reports",
			afterReports.value,
		);

		const nonOperator = [
			await alice.get(`/api/v1/operator/links/by-slug/${link.slug}`),
			await alice.mutate(
				"POST",
				`/api/v1/operator/links/${encodeURIComponent(link.id)}/block`,
				{ reason: "not an operator" },
				{ idempotencyKey: false },
			),
			await alice.mutate(
				"POST",
				`/api/v1/operator/links/${encodeURIComponent(link.id)}/unblock`,
				{ reason: "not an operator" },
				{ idempotencyKey: false },
			),
			await ctx.api().get(`/api/v1/operator/links/by-slug/${link.slug}`),
		];
		ctx.check(
			"non-operator 404",
			nonOperator.every((r) => r.status === 404),
			"404 on every operator route for a non-operator and a guest",
			nonOperator.map(brief),
		);

		const operator = await ctx.signedIn("operator");
		const view = await operator.get(`/api/v1/operator/links/by-slug/${link.slug}`);
		const viewBody = (view.json ?? {}) as { state?: string };
		ctx.check(
			"operator lookup",
			view.status === 200 && viewBody.state === "active",
			"200 with state active",
			brief(view),
		);
		const reason = `oracle A16 ${randomUUID().slice(0, 8)}`;
		const blocked = await operatorBlock(ctx, link.id, reason);
		const blockedAt = ctx.mono();
		ctx.check("operator block", blocked.status === 200, "200", brief(blocked));
		const reach = await converge(ctx, link.slug, 403, ctx.params.propagationMs + 2_000);
		ctx.check(
			"block reaches every replica within 60 s",
			reach.ok && ctx.mono() - blockedAt <= ctx.params.propagationMs + 2_000,
			"403 on every replica",
			{ elapsedMs: ctx.mono() - blockedAt, last: reach.value },
		);
		const actions =
			(
				await ctx.inspect<{
					items?: {
						actor?: string;
						action?: string;
						linkId?: string;
						reason?: string;
						at?: string;
					}[];
				}>("operatorActions")
			).items ?? [];
		const recorded = actions.find(
			(a) => a.linkId === link.id && a.action === "block" && a.reason === reason,
		);
		ctx.check(
			"actor and reason recorded",
			!!recorded && !!recorded.actor && !!recorded.at,
			"operator action with actor, reason and time",
			recorded ?? actions.slice(-3),
		);
		const unblocked = await operatorBlock(ctx, link.id, `${reason} lifted`, true);
		ctx.check("operator unblock", unblocked.status === 200, "200", brief(unblocked));
		const back = await converge(ctx, link.slug, 302, ctx.params.propagationMs + 2_000);
		ctx.check(
			"unblock reaches every replica",
			back.ok,
			"302 on every replica within 60 s",
			back.value,
		);
	},
});
