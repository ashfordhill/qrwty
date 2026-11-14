// Adapter command runner. Commands print one JSON value on stdout and exit non-zero on failure
// (oracle-tooling-plan.md, "Adapter manifest"). argv is run without a shell; `{name}`
// placeholders are replaced by the arguments the oracle passes.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { redactText } from "../redact.ts";
import type { CommandName, CommandSpec } from "../types.ts";

export interface CommandResult {
	name: string;
	argv: string[];
	exitCode: number | null;
	json: unknown;
	stdoutTail: string;
	stderrTail: string;
	durationMs: number;
	timedOut: boolean;
}

export class CommandError extends Error {
	readonly result: CommandResult;

	constructor(result: CommandResult) {
		super(
			`adapter command ${result.name} failed (exit ${result.exitCode}${result.timedOut ? ", timed out" : ""}): ${result.stderrTail.slice(-300)}`,
		);
		this.result = result;
	}
}

export function expand(argv: string[], args: Record<string, string | number>): string[] {
	return argv.map((part) =>
		part.replace(/\{([A-Za-z]+)\}/g, (whole, key: string) =>
			key in args ? String(args[key]) : whole,
		),
	);
}

export function runSpec(
	name: string,
	spec: CommandSpec,
	baseDir: string,
	args: Record<string, string | number> = {},
	env: NodeJS.ProcessEnv = process.env,
): Promise<CommandResult> {
	const argv = expand(spec.argv, args);
	const started = Date.now();
	return new Promise((resolvePromise) => {
		const child = spawn(argv[0], argv.slice(1), {
			cwd: resolve(baseDir, spec.cwd ?? "."),
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, spec.timeoutMs ?? 120_000);
		child.stdout.on("data", (d: Buffer) => {
			stdout += d.toString("utf8");
		});
		child.stderr.on("data", (d: Buffer) => {
			stderr += d.toString("utf8");
		});
		const done = (exitCode: number | null) => {
			clearTimeout(timer);
			let json: unknown = null;
			const trimmed = stdout.trim();
			if (trimmed) {
				try {
					json = JSON.parse(trimmed);
				} catch {
					const last = trimmed.split("\n").pop() ?? "";
					try {
						json = JSON.parse(last);
					} catch {
						json = null;
					}
				}
			}
			resolvePromise({
				name,
				argv: argv.map(redactText),
				exitCode,
				json,
				stdoutTail: redactText(stdout.slice(-2000)),
				stderrTail: redactText(stderr.slice(-2000)),
				durationMs: Date.now() - started,
				timedOut,
			});
		};
		child.on("error", (error) => {
			stderr += String(error);
			done(null);
		});
		child.on("close", (code) => done(code));
	});
}

export class Commands {
	readonly log: CommandResult[] = [];

	readonly specs: Partial<Record<CommandName, CommandSpec>>;
	readonly baseDir: string;

	constructor(specs: Partial<Record<CommandName, CommandSpec>>, baseDir: string) {
		this.specs = specs;
		this.baseDir = baseDir;
	}

	has(name: CommandName): boolean {
		return !!this.specs[name];
	}

	/** Runs a command; throws CommandError on a non-zero exit or unparsable output. */
	async run<T = Record<string, unknown>>(
		name: CommandName,
		args: Record<string, string | number> = {},
	): Promise<T> {
		const spec = this.specs[name];
		if (!spec) throw new Error(`adapter command ${name} is not provided`);
		const result = await runSpec(name, spec, this.baseDir, args);
		this.log.push(result);
		if (result.exitCode !== 0 || result.json === null) throw new CommandError(result);
		return result.json as T;
	}

	/** Runs a command and returns the raw result without throwing (for R rows). */
	async tryRun(
		name: CommandName,
		args: Record<string, string | number> = {},
		env?: NodeJS.ProcessEnv,
	): Promise<CommandResult> {
		const spec = this.specs[name];
		if (!spec) throw new Error(`adapter command ${name} is not provided`);
		const result = await runSpec(name, spec, this.baseDir, args, env);
		this.log.push(result);
		return result;
	}
}
