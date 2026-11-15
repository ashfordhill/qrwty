import { selections } from "./application-bindings.ts";
import { localLogins } from "./local-bindings.ts";



import type { ProcessScope } from "../runtime/process.ts";

export type ServiceBinding = {
	id: string;
	kind: string;
	host: string;
	identity?: string;
	inputs: Record<string, string | number>;
	resources: Record<string, string>;
};
export function selected(kind: string, id?: string): ServiceBinding {
	const rows = selections.filter(
		(s) => s.kind === kind && (!id || s.id === id),
	);
	if (rows.length !== 1) throw Error("Expected one selected responsibility");
	return rows[0]!;
}
export function input(s: ServiceBinding, key: string): number {
	const value = s.inputs[key];
	if (typeof value !== "number") throw Error(`Missing consumed setting ${key}`);
	return value;
}
export function resource(s: ServiceBinding, field: string): string {
	const id = s.resources[field];
	if (!id) throw Error(`Missing selected resource ${field}`);
	return id;
}
/** One endpoint from the process's environment (`JEEVES_*`, the tile ID upper-cased with `-` as
 * `_`), read when its client is built. There is no default: a missing or invalid value fails
 * startup naming the variable, never the value. A host is 1–253 letters, digits, `.` or `-`, or
 * for a database an absolute path (a Unix socket directory, as `pg` reads it). */
export function endpointHost(name: string, socket = false): string {
	const value = process.env[name];
	if (
		value !== undefined &&
		(/^[A-Za-z0-9.-]{1,253}$/.test(value) ||
			(socket && value.startsWith("/") && !/[\u0000-\u001f\u007f]/.test(value)))
	)
		return value;
	throw Error(`Invalid endpoint ${name}`);
}
/** A port from the environment: an integer 1–65535. */
export function endpointPort(name: string): number {
	const value = process.env[name];
	if (value !== undefined && /^[1-9][0-9]{0,4}$/.test(value) && Number(value) <= 65535)
		return Number(value);
	throw Error(`Invalid endpoint ${name}`);
}



export function httpSettings(s: ServiceBinding) {
	return {
		requestTimeoutMs: input(s, "host.requestTimeoutMs"),
		concurrencyLimit: input(s, "host.concurrencyLimit"),
	};
}
