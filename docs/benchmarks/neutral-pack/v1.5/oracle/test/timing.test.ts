// Pack v1.4: durations and deadlines use the monotonic clock. Each test fakes only the wall clock
// (Date), jumps it forward by 3.6 s during a measured interval, as this host's WSL2 clock does
// every 36 s, and shows that the measured duration does not change.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RowContext } from "../src/context.ts";
import { runSpec } from "../src/faults/commands.ts";
import { lateOld, poll, watchSlug } from "../src/rows/lib/flows.ts";
import { httpServer } from "./helpers.ts";

const JUMP_MS = 3_600;

/** Fakes Date only; timers and performance.now stay real, and the fake clock keeps running. */
function fakeWallClock(): { jump: () => void } {
	vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
	return { jump: () => vi.setSystemTime(Date.now() + JUMP_MS) };
}

afterEach(() => {
	vi.useRealTimers();
});

describe("monotonic timing", () => {
	it("poll's elapsed time ignores a wall-clock jump", async () => {
		const wall = fakeWallClock();
		const wallStart = Date.now();
		let calls = 0;
		const result = await poll(
			async () => {
				calls++;
				if (calls === 2) wall.jump();
				return calls;
			},
			(n) => n >= 4,
			10_000,
			50,
		);
		expect(Date.now() - wallStart).toBeGreaterThanOrEqual(JUMP_MS);
		expect(result.ok).toBe(true);
		expect(result.elapsedMs).toBeGreaterThanOrEqual(140);
		expect(result.elapsedMs).toBeLessThan(1_500);
	});

	it("an adapter command's duration ignores a wall-clock jump", async () => {
		const wall = fakeWallClock();
		const wallStart = Date.now();
		const jump = setTimeout(() => wall.jump(), 100);
		const out = await runSpec(
			"inspect",
			{ argv: [process.execPath, "-e", "setTimeout(() => console.log('{}'), 400)"] },
			process.cwd(),
		);
		clearTimeout(jump);
		expect(out.exitCode).toBe(0);
		expect(Date.now() - wallStart).toBeGreaterThanOrEqual(JUMP_MS);
		expect(out.durationMs).toBeGreaterThanOrEqual(350);
		expect(out.durationMs).toBeLessThan(JUMP_MS);
	});

	it("a timed loop and its deadline check ignore a wall-clock jump", async () => {
		const server = await httpServer((_req, res) => {
			res.writeHead(302, { Location: "https://example.com/oracle/timing" });
			res.end();
		});
		const ctx = {
			origin: "http://qrwty.localhost",
			adapter: {
				services: {
					redirect: {
						roles: ["redirect"],
						replicas: [{ name: "r1", url: server.url }],
						health: "/healthz",
						readiness: "/readyz",
					},
				},
			},
		} as unknown as RowContext;
		const wall = fakeWallClock();
		const jump = setTimeout(() => wall.jump(), 150);
		try {
			const observations = await watchSlug(ctx, "AbCdEfGhIj", 600, 20);
			const first = observations[0];
			const last = observations[observations.length - 1];
			// With wall-clock time the loop would have stopped at the jump (about 150 ms).
			expect(last.sentMono - first.sentMono).toBeGreaterThanOrEqual(450);
			expect(last.sentWallMs - first.sentWallMs).toBeGreaterThanOrEqual(JUMP_MS);
			// A deadline 500 ms after the first send: a wall-clock comparison would flag every
			// observation after the jump as late; the monotonic one flags only those really later.
			const deadline = first.sentMono + 500;
			const late = lateOld(observations, deadline, (o) => o.status === 302);
			expect(late.every((o) => o.sentMono > deadline)).toBe(true);
			expect(late.length).toBeLessThan(
				observations.filter((o) => o.sentWallMs > first.sentWallMs + 500).length,
			);
		} finally {
			clearTimeout(jump);
			await server.close();
		}
	});
});
