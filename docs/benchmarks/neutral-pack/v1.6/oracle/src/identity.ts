// Sign-in credentials of the oracle's accounts (pack v1.6). The adapter's identity section maps
// each account to its login identifier and gives the passwords through one variable
// (`passwordEnv`) or a command that prints one account's password once (`passwordCommand`).
// A password is read at most once per account and run, kept in memory only, registered as a
// secret before anything else happens, and never logged, written or put in a result.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { envValue } from "./adapter.ts";
import { expand } from "./faults/commands.ts";
import { type AccountKey, loginFor } from "./fixtures/accounts.ts";
import { redactText, registerSecret } from "./redact.ts";
import type { Adapter, CommandSpec } from "./types.ts";

/** The oracle cannot sign in as this account: the check is `blocked`, never `failed`. */
export class AccountBlockedError extends Error {
	readonly account: AccountKey;

	constructor(account: AccountKey, reason: string) {
		super(reason);
		this.account = account;
	}
}

export interface Credentials {
	login: string;
	password: string;
}

/** Shortest password the redaction can replace (registerSecret ignores shorter values). */
const MIN_PASSWORD_LENGTH = 4;
const PASSWORD_TIMEOUT_MS = 30_000;

/**
 * Runs the adapter's passwordCommand for one account. The command runs without a shell, with
 * `{account}` replaced by alice, bob or operator, and prints that account's password once on
 * stdout: one line, optionally ended by a newline. Its output is never recorded; a failure is
 * reported by exit code and a redacted stderr tail only.
 */
export function readPasswordCommand(
	spec: CommandSpec,
	baseDir: string,
	account: AccountKey,
): Promise<string> {
	const argv = expand(spec.argv, { account });
	return new Promise((resolvePromise, reject) => {
		const blocked = (why: string) =>
			reject(new AccountBlockedError(account, `identity.passwordCommand for ${account} ${why}`));
		const child = spawn(argv[0], argv.slice(1), {
			cwd: resolve(baseDir, spec.cwd ?? "."),
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		const stdout: Buffer[] = [];
		let stderr = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, spec.timeoutMs ?? PASSWORD_TIMEOUT_MS);
		child.stdout.on("data", (d: Buffer) => stdout.push(d));
		child.stderr.on("data", (d: Buffer) => {
			stderr = (stderr + d.toString("utf8")).slice(-2000);
		});
		let settled = false;
		const done = (exitCode: number | null, error?: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			const text = Buffer.concat(stdout).toString("utf8");
			// Whatever it printed is treated as secret before any message is composed.
			const lines = text.split(/\r?\n/);
			for (const line of lines) registerSecret(line);
			const tail = redactText(stderr.trim()).slice(-300);
			if (error) return blocked(`could not start: ${error.message}`);
			if (timedOut) return blocked(`timed out after ${spec.timeoutMs ?? PASSWORD_TIMEOUT_MS} ms`);
			if (exitCode !== 0) return blocked(`failed (exit ${exitCode})${tail ? `: ${tail}` : ""}`);
			const printed =
				lines.length > 1 && lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
			if (printed.length !== 1 || printed[0] === "")
				return blocked(
					`printed ${printed.length === 1 ? "nothing" : `${printed.length} lines`}; it must print the password once, on one line`,
				);
			if (printed[0].length < MIN_PASSWORD_LENGTH)
				return blocked(`printed a password shorter than ${MIN_PASSWORD_LENGTH} characters`);
			resolvePromise(printed[0]);
		};
		child.on("error", (error) => done(null, error));
		child.on("close", (code) => done(code));
	});
}

/**
 * The run's view of the adapter's identity section: login identifiers, passwords (read once per
 * account) and the logins the issuer refused, which the oracle never posts again in this run.
 */
export class Identity {
	private readonly passwords = new Map<AccountKey, Promise<string>>();
	private readonly refusals = new Map<AccountKey, string>();

	readonly adapter: Adapter;
	readonly baseDir: string;

	constructor(adapter: Adapter, baseDir: string) {
		this.adapter = adapter;
		this.baseDir = baseDir;
	}

	/** The login identifier mapped to an account, or null when the adapter maps none. */
	login(account: AccountKey): string | null {
		return loginFor(this.adapter.identity, account);
	}

	/** Login and password; throws AccountBlockedError when the oracle cannot have them. */
	async credentials(account: AccountKey): Promise<Credentials> {
		const identity = this.adapter.identity;
		if (!identity) throw new AccountBlockedError(account, "adapter has no identity section");
		const login = this.login(account);
		if (!login)
			throw new AccountBlockedError(
				account,
				`identity.accounts does not map ${account}, so the oracle cannot sign in as it`,
			);
		let password = this.passwords.get(account);
		if (!password) {
			password = this.readPassword(account);
			this.passwords.set(account, password);
		}
		return { login, password: await password };
	}

	/** Why an earlier sign-in of this account in this run was refused, if one was. */
	refusal(account: AccountKey): string | undefined {
		return this.refusals.get(account);
	}

	recordRefusal(account: AccountKey, reason: string): void {
		if (!this.refusals.has(account)) this.refusals.set(account, reason);
	}

	private async readPassword(account: AccountKey): Promise<string> {
		const identity = this.adapter.identity;
		if (identity?.passwordCommand)
			return readPasswordCommand(identity.passwordCommand, this.baseDir, account);
		const value = envValue(identity?.passwordEnv);
		if (!value)
			throw new AccountBlockedError(
				account,
				`environment ${identity?.passwordEnv ?? "(no passwordEnv)"} is unset`,
			);
		registerSecret(value);
		return value;
	}
}
