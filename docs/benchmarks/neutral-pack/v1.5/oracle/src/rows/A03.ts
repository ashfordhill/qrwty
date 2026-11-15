import { randomUUID } from "node:crypto";
import { destination } from "../fixtures/destinations.ts";
import { asLink, brief, hitSlug, isError, parallel, SLUG } from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

export default defineRow({
	id: "A03",
	title: "200 concurrent creates across replicas; creates under force-slug-collision",
	scope: "Local",
	expected:
		"All slugs distinct and each redirects to its own destination; under the forced collision the create succeeds within 5 retries or returns 503 slug_allocation_failed; the existing slug's destination never changes",
	requires: ["publicEntry", "edge", "command:faultPoint"],
	coverage: "double",
	params: { creates: 200 },
	async run(ctx) {
		const run = randomUUID().slice(0, 8);
		// Through the trusted edge with distinct synthetic client addresses, so guest admission
		// (10 per minute per key) does not refuse them; the edge spreads them over the replicas.
		ctx.note(
			"creates go through the public entry; their spread over replicas is the arm's edge balancing",
		);
		const results = await parallel(ctx.params.creates, async (i) => {
			const actor = ctx.api(ctx.edge(`198.18.${Math.floor(i / 200)}.${(i % 200) + 1}`));
			const dest = destination("A03", `${run}-${i}`);
			const response = await actor.createLink(dest);
			return { dest, response, link: asLink(response) };
		});
		const created = results.filter((r) => r.response.status === 201 && r.link);
		ctx.check("all creates succeed", created.length === results.length, `${results.length} × 201`, {
			created: created.length,
			statuses: [...new Set(results.map((r) => r.response.status))],
		});
		const slugs = created.map((r) => r.link?.slug ?? "");
		ctx.check(
			"slug format",
			slugs.every((s) => SLUG.test(s)),
			"every slug matches ^[0-9A-Za-z]{10}$",
			slugs.filter((s) => !SLUG.test(s)).slice(0, 5),
		);
		ctx.check("slugs distinct", new Set(slugs).size === slugs.length, "no duplicate slug", {
			unique: new Set(slugs).size,
			total: slugs.length,
		});
		const wrong: unknown[] = [];
		for (const r of created) {
			const hit = await hitSlug(ctx, ctx.adapter.publicEntry.url, r.link?.slug ?? "");
			if (hit.status !== 302 || hit.header("location") !== r.dest)
				wrong.push({ slug: r.link?.slug, ...brief(hit), expected: r.dest });
		}
		ctx.check(
			"each slug redirects to its own destination",
			wrong.length === 0,
			"302 with the created destination for every slug",
			wrong.slice(0, 10),
		);

		const existing = created[0];
		if (!existing?.link) return;
		await ctx.commands.run("faultPoint", {
			name: "force-slug-collision",
			state: "on",
			arg: existing.link.slug,
		});
		try {
			const actor = ctx.api(ctx.edge("198.18.250.1"));
			const collide = await actor.createLink(destination("A03", `${run}-collision`));
			const link = asLink(collide);
			const ok =
				(collide.status === 201 && !!link && link.slug !== existing.link.slug) ||
				isError(collide, 503, "slug_allocation_failed");
			ctx.check(
				"forced collision outcome",
				ok,
				"201 with a different slug, or 503 slug_allocation_failed",
				{ ...brief(collide), slug: link?.slug ?? null },
			);
		} finally {
			await ctx.commands.run("faultPoint", {
				name: "force-slug-collision",
				state: "off",
				arg: existing.link.slug,
			});
		}
		const after = await hitSlug(ctx, ctx.adapter.publicEntry.url, existing.link.slug);
		ctx.check(
			"existing slug unchanged",
			after.status === 302 && after.header("location") === existing.dest,
			`302 to ${existing.dest}`,
			brief(after),
		);
	},
});
