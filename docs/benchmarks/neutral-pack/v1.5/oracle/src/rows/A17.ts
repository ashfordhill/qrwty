import { randomUUID } from "node:crypto";
import type { RowContext } from "../context.ts";
import { destination } from "../fixtures/destinations.ts";
import { brief, isError } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

async function burst(ctx: RowContext, addresses: (i: number) => string, count: number) {
	const results = [];
	for (let i = 0; i < count; i += 5) {
		const batch = await Promise.all(
			Array.from({ length: Math.min(5, count - i) }, (_, j) =>
				ctx.api(ctx.edge(addresses(i + j))).createLink(destination("A17", `${randomUUID()}`)),
			),
		);
		results.push(...batch);
	}
	return results;
}

export default defineRow({
	id: "A17",
	title: "Guest creation beyond admission; IPv6 /64; shared-address users",
	scope: "Local",
	expected:
		"429 with Retry-After and a useful body once over the limit (at most twice the limit admitted across replicas); the /64 counts as one key; legitimate shared-address users under the limit succeed; no storage for refused creates",
	requires: ["publicEntry", "edge"],
	coverage: "double",
	params: { limit: 10, attempts: 30, maxRetryAfterS: 60 },
	async run(ctx) {
		const limit = ctx.params.limit;
		const countBefore = ctx.commands.has("inspect")
			? await ctx.inspect<{ links?: number }>("linkCount")
			: null;
		const v4 = await burst(ctx, () => "198.18.77.1", ctx.params.attempts);
		const admitted = v4.filter((r) => r.status === 201).length;
		const refused = v4.filter((r) => isError(r, 429, "rate_limited"));
		ctx.check(
			"bounded admission (IPv4)",
			admitted <= 2 * limit && admitted >= 1,
			`1..${2 * limit} admitted of ${ctx.params.attempts}`,
			admitted,
		);
		const first429 = refused[0];
		const retryAfter = Number(first429?.header("retry-after"));
		const message =
			(first429?.json as { error?: { message?: string } } | undefined)?.error?.message ?? "";
		ctx.check(
			"useful 429",
			!!first429 &&
				Number.isInteger(retryAfter) &&
				retryAfter > 0 &&
				retryAfter <= ctx.params.maxRetryAfterS &&
				message.length > 0,
			"429 rate_limited, Retry-After in seconds, a message",
			first429 ? brief(first429) : null,
		);
		if (countBefore && typeof countBefore.links === "number") {
			const after = await ctx.inspect<{ links?: number }>("linkCount");
			ctx.check(
				"no storage for refused creates",
				after.links === countBefore.links + admitted,
				`link rows grow by ${admitted}`,
				{ before: countBefore.links, after: after.links },
			);
		} else {
			ctx.blocked("no storage for refused creates", "adapter inspect linkCount is not available");
		}

		const v6 = await burst(
			ctx,
			(i) => `2001:db8:77:1::${(i + 1).toString(16)}`,
			ctx.params.attempts,
		);
		const admitted6 = v6.filter((r) => r.status === 201).length;
		ctx.check(
			"IPv6 /64 is one key",
			admitted6 <= 2 * limit && v6.some((r) => r.status === 429),
			`at most ${2 * limit} admitted across one /64 and a 429`,
			admitted6,
		);

		const shared = await burst(ctx, () => "198.18.78.1", 5);
		ctx.check(
			"shared-address users under the limit",
			shared.every((r) => r.status === 201),
			"5 × 201 for five browsers behind one address",
			shared.map((r) => r.status),
		);

		if (first429 && Number.isInteger(retryAfter) && retryAfter <= ctx.params.maxRetryAfterS) {
			await ctx.sleep((retryAfter + 1) * 1000);
			const recovered = await ctx
				.api(ctx.edge("198.18.77.1"))
				.createLink(destination("A17", "recovered"));
			ctx.check(
				"recovery after Retry-After",
				recovered.status === 201,
				"201 after waiting Retry-After",
				brief(recovered),
			);
		}
	},
});
