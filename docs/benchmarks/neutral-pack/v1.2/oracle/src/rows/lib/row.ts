import type { RowContext } from "../../context.ts";
import type { Capability } from "../../types.ts";

export interface RowModule {
	id: string;
	title: string;
	/** Scope from acceptance-oracle.md (Local, staging subset, ...). */
	scope: string;
	/** Pass condition, quoted from acceptance-oracle.md. */
	expected: string;
	/** Adapter capabilities; a missing one makes the row `blocked` before it runs. */
	requires: Capability[];
	/**
	 * `double`: the self-test suite runs this row against a deliberately wrong test double.
	 * `live-arm`: the row needs a real arm (replicas, stores, workers, faults or UI names); its
	 * logic is covered by unit tests of the helpers it uses.
	 */
	coverage: "double" | "live-arm";
	liveArmReason?: string;
	/** Frozen timing parameters. Only the self-test harness may shorten them (recorded). */
	params?: Record<string, number>;
	run(ctx: RowContext): Promise<void>;
}

export function defineRow(row: RowModule): RowModule {
	return row;
}
