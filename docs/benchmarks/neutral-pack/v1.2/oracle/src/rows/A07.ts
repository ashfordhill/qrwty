import { randomUUID } from "node:crypto";
import type { Api } from "../client/session.ts";
import { destination } from "../fixtures/destinations.ts";
import {
	asLink,
	brief,
	isError,
	type Link,
	lastPerReplica,
	lateOld,
	operatorBlock,
	parallel,
	watchSlug,
} from "./lib/flows.ts";
import { defineRow } from "./lib/row.ts";

async function owned(api: Api, name: string): Promise<{ link: Link; dest: string }> {
	const dest = destination("A07", name);
	const r = await api.createLink(dest);
	const link = asLink(r);
	if (r.status !== 201 || !link) throw new Error(`owned create returned ${r.status}`);
	return { link, dest };
}

export default defineRow({
	id: "A07",
	title: "Concurrent PATCH with one If-Match; propagation of edit, disable, delete and block",
	scope: "Local; staging subset",
	expected:
		"One 200, the rest 412; after each change's commit, no replica returns the old allowed result later than 60 s; a deleted slug stays 410 and is never issued again",
	requires: ["publicEntry", "identity"],
	coverage: "double",
	params: { propagationMs: 60_000, marginMs: 5_000 },
	async run(ctx) {
		const run = randomUUID().slice(0, 8);
		const alice = await ctx.signedIn("alice");
		const race = await owned(alice, `${run}-race`);
		const etag = `"${race.link.version}"`;
		const patches = await parallel(10, (i) =>
			alice.patchLink(race.link.id, { destination: destination("A07", `${run}-race-${i}`) }, etag),
		);
		const ok = patches.filter((r) => r.status === 200).length;
		const stale = patches.filter((r) => isError(r, 412, "version_conflict")).length;
		ctx.check(
			"one PATCH wins",
			ok === 1 && stale === 9,
			"1 × 200, 9 × 412 version_conflict",
			patches.map((r) => r.status),
		);
		const winner = patches.find((r) => r.status === 200);
		const nextVersion = (winner?.json as { version?: number } | undefined)?.version;
		ctx.check(
			"new ETag",
			!!winner && winner.header("etag") === `"${nextVersion}"` && nextVersion !== race.link.version,
			'ETag "<new version>"',
			winner ? { etag: winner.header("etag"), version: nextVersion } : null,
		);
		const missing = await alice.patchLink(race.link.id, { state: "disabled" });
		ctx.check(
			"PATCH without If-Match",
			isError(missing, 428, "precondition_required"),
			"428 precondition_required",
			brief(missing),
		);

		const edit = await owned(alice, `${run}-edit`);
		const disable = await owned(alice, `${run}-disable`);
		const del = await owned(alice, `${run}-delete`);
		const block = await owned(alice, `${run}-block`);
		const newDest = destination("A07", `${run}-edited`);
		const window = ctx.params.propagationMs + ctx.params.marginMs;
		const watchers = [edit, disable, del, block].map((x) =>
			watchSlug(ctx, x.link.slug, window + 2_000),
		);
		await ctx.sleep(1_000);
		const commits: Record<string, number> = {};
		const e = await alice.patchLink(
			edit.link.id,
			{ destination: newDest },
			`"${edit.link.version}"`,
		);
		commits.edit = Date.now();
		const d = await alice.patchLink(
			disable.link.id,
			{ state: "disabled" },
			`"${disable.link.version}"`,
		);
		commits.disable = Date.now();
		const x = await alice.deleteLink(del.link.id);
		commits.delete = Date.now();
		const b = await operatorBlock(ctx, block.link.id, "oracle A07 block");
		commits.block = Date.now();
		ctx.check(
			"mutations accepted",
			e.status === 200 && d.status === 200 && x.status === 204 && b.status === 200,
			"edit 200, disable 200, delete 204, block 200",
			[brief(e), brief(d), brief(x), brief(b)],
		);
		const [we, wd, wx, wb] = await Promise.all(watchers);
		const bound = ctx.params.propagationMs;
		const cases = [
			{
				name: "edit",
				obs: we,
				isOld: (o: { status: number; location: string | null }) =>
					o.status === 302 && o.location === edit.dest,
				isNew: (o: { status: number; location: string | null }) =>
					o.status === 302 && o.location === newDest,
				newText: `302 to the new destination`,
			},
			{
				name: "disable",
				obs: wd,
				isOld: (o: { status: number }) => o.status === 302,
				isNew: (o: { status: number }) => o.status === 410,
				newText: "410",
			},
			{
				name: "delete",
				obs: wx,
				isOld: (o: { status: number }) => o.status === 302,
				isNew: (o: { status: number }) => o.status === 410,
				newText: "410",
			},
			{
				name: "block",
				obs: wb,
				isOld: (o: { status: number }) => o.status === 302,
				isNew: (o: { status: number }) => o.status === 403,
				newText: "403",
			},
		];
		for (const c of cases) {
			const late = lateOld(c.obs, commits[c.name] + bound, c.isOld);
			ctx.check(
				`${c.name}: no old result after ${bound / 1000} s`,
				late.length === 0,
				`no replica serves the old allowed result later than commit + ${bound} ms`,
				{ late: late.slice(0, 5), observations: c.obs.length },
			);
			const last = lastPerReplica(c.obs);
			ctx.check(
				`${c.name}: every replica converged`,
				last.length > 0 && last.every(c.isNew),
				`${c.newText} on every replica`,
				last,
			);
		}
		await ctx.artifact("propagation.json", {
			commits,
			edit: we,
			disable: wd,
			delete: wx,
			block: wb,
		});
		const again = await alice.deleteLink(del.link.id);
		ctx.check("repeat delete", again.status === 204, "204 again", brief(again));
		const tomb = await alice.getLink(del.link.id);
		ctx.check(
			"deleted link not returned",
			tomb.status === 404,
			"404 for the deleted link's API object",
			brief(tomb),
		);
		ctx.note(
			"'never issued again' is checked by the slug staying 410 here and by A03's unique allocation; the oracle cannot request a chosen slug",
		);
	},
});
