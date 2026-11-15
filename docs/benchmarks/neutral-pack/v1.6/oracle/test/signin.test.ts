// Pack v1.6: per-account login identifiers, the password command, and at most one login post.
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseAdapter } from "../src/adapter.ts";
import { Api } from "../src/client/session.ts";
import { AccountBlockedError, Identity, readPasswordCommand } from "../src/identity.ts";
import { redactText } from "../src/redact.ts";
import type { RowModule } from "../src/rows/lib/row.ts";
import { runRows } from "../src/runner.ts";
import { EXAMPLE_ADAPTER, httpServer } from "./helpers.ts";

const ORIGIN = "http://qrwty.localhost:1";
const runtimePassword = () => `pw-${randomBytes(8).toString("hex")}`;

const loginForm = (error = "") =>
	`<!doctype html>${error}<form action="/login" method="post"><input type="hidden" name="state" value="s1"><input type="email" name="username"><input type="password" name="password"></form>`;

/**
 * A fake arm (behind the public entry, Host = ORIGIN) and a fake issuer that answers a refused
 * login with its form again, as Auth0 and Keycloak do, and counts every login post.
 */
async function fakeFlow(options: {
	login: string;
	password: string;
	dropFirstAuthorize?: boolean;
	dropPost?: boolean;
}) {
	const seen = { posts: 0, authorizeGets: 0 };
	const issuer = await httpServer((req, res) => {
		if (req.url?.startsWith("/authorize")) {
			seen.authorizeGets++;
			if (options.dropFirstAuthorize && seen.authorizeGets === 1) {
				req.socket.destroy();
				return;
			}
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(loginForm());
			return;
		}
		if (req.url === "/login" && req.method === "POST") {
			seen.posts++;
			if (options.dropPost) {
				req.socket.destroy();
				return;
			}
			let body = "";
			req.on("data", (d) => {
				body += d;
			});
			req.on("end", () => {
				const form = new URLSearchParams(body);
				if (form.get("username") === options.login && form.get("password") === options.password) {
					res.writeHead(302, { Location: `${ORIGIN}/auth/callback?code=c1&state=s1` });
					res.end();
					return;
				}
				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(loginForm('<p role="alert">Wrong email or password.</p>'));
			});
			return;
		}
		res.writeHead(404);
		res.end();
	});
	const arm = await httpServer((req, res) => {
		const url = new URL(req.url ?? "/", ORIGIN);
		if (url.pathname === "/auth/login") {
			res.writeHead(302, {
				Location: `${issuer.url}/authorize?state=s1&redirect_uri=${encodeURIComponent(`${ORIGIN}/auth/callback`)}`,
			});
			res.end();
			return;
		}
		if (url.pathname === "/auth/callback") {
			res.writeHead(302, { Location: url.searchParams.get("code") ? "/" : "/?signin=failed" });
			res.end();
			return;
		}
		if (url.pathname === "/api/v1/session") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ authenticated: true, csrfToken: "csrf-1", account: null }));
			return;
		}
		res.writeHead(404);
		res.end();
	});
	return {
		seen,
		entry: arm.url,
		issuerUrl: issuer.url,
		close: async () => {
			await arm.close();
			await issuer.close();
		},
	};
}

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
	for (const close of closers.splice(0)) await close();
});

async function flow(options: Parameters<typeof fakeFlow>[0]) {
	const f = await fakeFlow(options);
	closers.push(f.close);
	return f;
}

describe("sign-in driver: at most one login post (v1.6)", () => {
	it("signs in with one post", async () => {
		const password = runtimePassword();
		const f = await flow({ login: "alice@example.test", password });
		const result = await Api.forEntry(f.entry, ORIGIN).signIn("alice@example.test", password);
		expect(result).toMatchObject({ ok: true, posts: 1, refused: false, finalLocation: "/" });
		expect(f.seen.posts).toBe(1);
	});

	it("never posts a refused login again, though the issuer shows its form again", async () => {
		const password = runtimePassword();
		const f = await flow({ login: "alice@example.test", password });
		const result = await Api.forEntry(f.entry, ORIGIN).signIn("oracle-alice", password);
		expect(f.seen.posts).toBe(1);
		expect(result.ok).toBe(false);
		expect(result.posts).toBe(1);
		expect(result.refused).toBe(true);
		expect(result.reason).toMatch(
			/refused the login: the login post answered 400 with the login form again; posted once, not posted again/,
		);
		const text = JSON.stringify(result);
		expect(text).not.toContain(password);
		expect(text).not.toContain("oracle-alice");
	});

	it("retries a network error before the post, and never one during the post", async () => {
		const password = runtimePassword();
		const before = await flow({ login: "bob@example.test", password, dropFirstAuthorize: true });
		const retried = await Api.forEntry(before.entry, ORIGIN).signIn("bob@example.test", password);
		expect(retried.ok).toBe(true);
		expect(before.seen.authorizeGets).toBe(2);
		expect(before.seen.posts).toBe(1);
		expect(retried.steps.some((s) => /network error .*retried/.test(s))).toBe(true);

		const during = await flow({ login: "bob@example.test", password, dropPost: true });
		const dropped = await Api.forEntry(during.entry, ORIGIN).signIn("bob@example.test", password);
		expect(during.seen.posts).toBe(1);
		expect(dropped).toMatchObject({ ok: false, posts: 1, refused: false });
		expect(dropped.reason).toMatch(/network error during the login post .*not posted again/);
	});
});

describe("identity: login identifiers and the password command (v1.6)", () => {
	const script = (body: string) => {
		const dir = mkdtempSync(join(tmpdir(), "oracle-identity-"));
		const path = join(dir, "password.mjs");
		writeFileSync(path, body);
		return { dir, argv: [process.execPath, path, "{account}"] };
	};

	it("reads one line once per account, registers it as a secret and never re-runs it", async () => {
		const value = runtimePassword();
		process.env.ORACLE_UNIT_PASSWORD = value;
		const { dir, argv } = script(
			`import { appendFileSync } from "node:fs";
appendFileSync(new URL("calls.txt", import.meta.url), process.argv[2] + "\\n");
process.stdout.write(process.env.ORACLE_UNIT_PASSWORD + "-" + process.argv[2] + "\\n");`,
		);
		const adapter = parseAdapter(
			JSON.stringify({
				...EXAMPLE_ADAPTER,
				identity: {
					issuerUrl: "http://issuer.test",
					audience: "a",
					accounts: { alice: "alice@example.test", bob: "bob@example.test" },
					passwordCommand: { argv, timeoutMs: 10_000 },
				},
			}),
			join(dir, "oracle-adapter.json"),
		);
		const identity = new Identity(adapter.adapter, adapter.baseDir);
		const first = await identity.credentials("alice");
		const again = await identity.credentials("alice");
		const bob = await identity.credentials("bob");
		expect(first).toEqual({ login: "alice@example.test", password: `${value}-alice` });
		expect(again).toEqual(first);
		expect(bob.password).toBe(`${value}-bob`);
		expect(readFileSync(join(dir, "calls.txt"), "utf8")).toBe("alice\nbob\n");
		expect(redactText(`posted ${value}-alice`)).toBe("posted [redacted]");
		await expect(identity.credentials("operator")).rejects.toThrow(
			/identity.accounts does not map operator/,
		);
		await expect(identity.credentials("operator")).rejects.toBeInstanceOf(AccountBlockedError);
	});

	it("blocks an account whose command fails or prints more than the password", async () => {
		const value = runtimePassword();
		process.env.ORACLE_UNIT_PASSWORD = value;
		const twoLines = script(
			"process.stdout.write(process.env.ORACLE_UNIT_PASSWORD + '\\nextra\\n');",
		);
		const failing = script("process.stderr.write('vault locked'); process.exit(3);");
		const empty = script("");
		const spec = (argv: string[]) => ({ argv, timeoutMs: 10_000 });
		await expect(readPasswordCommand(spec(twoLines.argv), twoLines.dir, "bob")).rejects.toThrow(
			/printed 2 lines; it must print the password once/,
		);
		const error = await readPasswordCommand(spec(failing.argv), failing.dir, "bob").catch(
			(e: Error) => e,
		);
		expect(error).toBeInstanceOf(AccountBlockedError);
		expect((error as Error).message).toBe(
			"identity.passwordCommand for bob failed (exit 3): vault locked",
		);
		await expect(readPasswordCommand(spec(empty.argv), empty.dir, "bob")).rejects.toThrow(
			/printed nothing/,
		);
		// Whatever the rejected command printed is redacted from every output.
		expect(redactText(`x ${value} y`)).toBe("x [redacted] y");
	});
});

describe("runner: unmapped accounts are blocked, refused logins are not posted again (v1.6)", () => {
	const row = (id: string, run: RowModule["run"]): RowModule => ({
		id,
		title: "unit test row",
		scope: "Local",
		expected: "unit test of the identity handling",
		requires: ["publicEntry", "identity"],
		coverage: "live-arm",
		liveArmReason: "unit test",
		run,
	});

	it("reports an unmapped account blocked with its reason, never failed", async () => {
		const password = runtimePassword();
		process.env.ORACLE_UNIT_PASSWORD = password;
		const f = await flow({ login: "alice@example.test", password });
		const loaded = parseAdapter(
			JSON.stringify({
				...EXAMPLE_ADAPTER,
				publicEntry: { url: f.entry, origin: ORIGIN },
				identity: {
					issuerUrl: f.issuerUrl,
					audience: "a",
					accounts: { alice: "alice@example.test", bob: "bob@example.test" },
					passwordEnv: "ORACLE_UNIT_PASSWORD",
				},
			}),
			"oracle-adapter.json",
		);
		const [line] = await runRows({
			loaded,
			rows: [
				row("A18", async (ctx) => {
					await ctx.signedIn("alice");
					ctx.check("alice signed in", true, "signed in", null);
					await ctx.signedIn("operator");
				}),
			],
			outDir: mkdtempSync(join(tmpdir(), "oracle-identity-run-")),
			scope: "staging",
			command: "unit",
			resetBetweenRows: false,
		});
		expect(line.status).toBe("blocked");
		expect(line.observed.checks.map((c) => [c.name, c.status])).toEqual([
			["alice signed in", "passed"],
			["account operator", "blocked"],
		]);
		expect(line.observed.checks[1].observed).toMatch(/does not map operator/);
		expect(f.seen.posts).toBe(1);
	});

	it("posts a refused login once in the whole run and fails each row with the reason", async () => {
		const password = runtimePassword();
		process.env.ORACLE_UNIT_PASSWORD = password;
		const f = await flow({ login: "alice@example.test", password: runtimePassword() });
		const loaded = parseAdapter(
			JSON.stringify({
				...EXAMPLE_ADAPTER,
				publicEntry: { url: f.entry, origin: ORIGIN },
				identity: {
					issuerUrl: f.issuerUrl,
					audience: "a",
					accounts: { alice: "alice@example.test" },
					passwordEnv: "ORACLE_UNIT_PASSWORD",
				},
			}),
			"oracle-adapter.json",
		);
		const signIn = async (ctx: Parameters<RowModule["run"]>[0]) => {
			await ctx.signedIn("alice");
		};
		const lines = await runRows({
			loaded,
			rows: [row("A06", signIn), row("A07", signIn), row("A14", signIn)],
			outDir: mkdtempSync(join(tmpdir(), "oracle-identity-run-")),
			scope: "staging",
			command: "unit",
			resetBetweenRows: false,
		});
		expect(f.seen.posts).toBe(1);
		expect(lines.map((l) => l.status)).toEqual(["failed", "failed", "failed"]);
		const reasons = lines.map((l) => String(l.observed.checks[0].observed));
		expect(reasons[0]).toMatch(/sign-in as alice failed: the issuer refused the login/);
		expect(reasons[1]).toMatch(/refused earlier in this run \(A06: the issuer refused/);
		expect(reasons[2]).toMatch(/not posted again/);
		expect(JSON.stringify(lines)).not.toContain(password);
	});
});
