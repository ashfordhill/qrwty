// Test clock: calls the adapter's clock command and records each offset in the row's result.
// Contract: `clock` receives {offsetMs} (absolute offset from real time, may be negative) and
// prints {"offsetMs": n, "boundMs": n} where boundMs is the arm's recorded clock bound.
import type { ClockOffsetRecord } from "../types.ts";
import type { Commands } from "./commands.ts";

export class Clock {
	readonly records: ClockOffsetRecord[] = [];
	offsetMs = 0;

	private readonly commands: Commands;

	constructor(commands: Commands) {
		this.commands = commands;
	}

	async set(offsetMs: number): Promise<ClockOffsetRecord> {
		const out = await this.commands.run<{ offsetMs?: number; boundMs?: number }>("clock", {
			offsetMs: Math.round(offsetMs),
		});
		const record: ClockOffsetRecord = {
			at: new Date().toISOString(),
			offsetMs: typeof out.offsetMs === "number" ? out.offsetMs : Math.round(offsetMs),
			boundMs: typeof out.boundMs === "number" ? out.boundMs : null,
		};
		this.offsetMs = record.offsetMs;
		this.records.push(record);
		return record;
	}

	/** Arm time = real time + offset. */
	now(): number {
		return Date.now() + this.offsetMs;
	}

	async reset(): Promise<void> {
		if (this.offsetMs !== 0) await this.set(0);
	}
}
