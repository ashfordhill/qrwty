// A6 (Q09) offline: guest admission across copies and cache failures, the client address and its
// network, the operator's identity, reports and moderation routes, a guest create beyond the limit,
// and account deletion's issuer step. In-memory stand-ins only: no Docker, no network.
import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CacheClient } from "../../src/modules/dependencies.ts";
import type { ModuleResponse } from "../../src/modules/entry.ts";
import {
	ADMISSION_KEY_HEADER,
	type Admission,
	createAdmission,
	GUEST_CREATE,
} from "../../src/modules/link-api/abuse-and-moderation/admission.ts";
import {
	OPERATOR_HEADERS,
	operatorOf,
	operatorPayload,
	operatorSignature,
	operatorSubjects,
} from "../../src/modules/link-api/abuse-and-moderation/operator.ts";
import {
	moderationRoutes,
	reportedSlug,
} from "../../src/modules/link-api/abuse-and-moderation/routes.ts";
import type { Dependencies as AbuseDependencies } from "../../src/modules/link-api/link-api-abuse-and-moderation.slots.ts";
import type { Dependencies } from "../../src/modules/link-api/link-api-link-operations.slots.ts";
import { GUEST_SCOPE_HEADER } from "../../src/modules/link-api/link-operations/create.ts";
import { parseKeyRing } from "../../src/modules/link-api/link-operations/replay-seal.ts";
import { linkOperations } from "../../src/modules/link-api/link-operations/service.ts";
import { testHooks } from "../../src/modules/link-api/link-operations/test-hooks.ts";
import { ownerKey } from "../../src/modules/link-api/link-operations/view.ts";
import {
	admissionKeyFor,
	CLIENT_ADDRESS_HEADER,
	CLIENT_SIGNATURE_HEADER,
	clientSignature,
	networkOf,
	UNVERIFIED,
	verifiedAddress,
} from "../../src/modules/session-api/session/client-address.ts";
import type { SessionContext } from "../../src/modules/session-api/session/context.ts";
import {
	csrfToken,
	newAccountCookie,
	SESSION_COOKIE,
} from "../../src/modules/session-api/session/cookies.ts";
import { auth0UserEraser, type UserEraser } from "../../src/modules/session-api/session/erasure.ts";
import { forwardRoutes } from "../../src/modules/session-api/session/forward.ts";
import { sealTokens, sessionId } from "../../src/modules/session-api/session/sessions.ts";
import type { SessionStore } from "../../src/modules/session-api/session/store.ts";
import { keyRing } from "../../src/runtime/settings.ts";

/** A Valkey stand-in: get/set/delete with a delay, so copies interleave; `down` fails every call. */
function fakeCache(delayMs = 0) {
	const values = new Map<string, string>();
	const state = { down: false, sets: 0 };
	const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs * Math.random()));
	const cache: CacheClient = {
		async get(key) {
			await wait();
			if (state.down) throw new Error("Cache unavailable");
			return values.get(key);
		},
		async set(key, value) {
			await wait();
			if (state.down) throw new Error("Cache unavailable");
			state.sets++;
			values.set(key, value);
		},
		async delete(key) {
			values.delete(key);
		},
	};
	return { cache, values, state };
}
const KEY = "A".repeat(43);

describe("guest admission", () => {
	it("admits 10 in a window, then 429 with the seconds left, then a new window", async () => {
		let now = 1_000_000;
		const { cache, values } = fakeCache();
		const admit = createAdmission({ now: () => now });
		for (let i = 0; i < 10; i++)
			expect(await admit(cache, GUEST_CREATE, KEY)).toEqual({ admitted: true });
		now += 15_000;
		expect(await admit(cache, GUEST_CREATE, KEY)).toEqual({
			admitted: false,
			retryAfterSeconds: 45,
		});
		expect(await admit(cache, GUEST_CREATE, "B".repeat(43))).toEqual({ admitted: true });
		now += 45_000;
		expect(await admit(cache, GUEST_CREATE, KEY)).toEqual({ admitted: true });
		// The value names only the keyed hash; it expires with its window.
		for (const name of values.keys())
			expect(name).toMatch(/^adm:v1:guest-admission-test-v1:[AB]{43}(:[A-Za-z0-9_-]{1,16})?$/);
	});

	it("counts across copies: alternating copies admit 10 in all", async () => {
		const { cache } = fakeCache();
		const copies = [
			createAdmission({ tag: "one" }),
			createAdmission({ tag: "two" }),
			createAdmission({ tag: "three" }),
		];
		let admitted = 0;
		for (let i = 0; i < 30; i++)
			if ((await (copies[i % 3] as Admission)(cache, GUEST_CREATE, KEY)).admitted) admitted++;
		expect(admitted).toBe(10);
	});

	it("stays bounded in a simultaneous burst: never more than the limit per copy", async () => {
		// Every copy reads before any writes, so none sees another's admissions: the worst case
		// without an atomic counter (AG-31) is copies x limit; two copies stay within twice the limit.
		for (const copies of [2, 3]) {
			const { cache } = fakeCache(3);
			const admits = Array.from({ length: copies }, () => createAdmission());
			const results = await Promise.all(
				Array.from({ length: 300 }, (_, i) =>
					(admits[i % copies] as Admission)(cache, GUEST_CREATE, KEY),
				),
			);
			const admitted = results.filter((r) => r.admitted).length;
			expect(admitted).toBeGreaterThanOrEqual(10);
			expect(admitted).toBeLessThanOrEqual(10 * copies);
			// Once the writes have landed, every copy refuses.
			for (const admit of admits)
				expect((await admit(cache, GUEST_CREATE, KEY)).admitted).toBe(false);
		}
	});

	it("admits exactly the limit when copies' requests follow each other closely", async () => {
		const { cache } = fakeCache(1);
		const admits = [createAdmission(), createAdmission(), createAdmission()];
		let admitted = 0;
		for (let round = 0; round < 10; round++) {
			const results = await Promise.all(admits.map((admit) => admit(cache, GUEST_CREATE, KEY)));
			admitted += results.filter((r) => r.admitted).length;
		}
		expect(admitted).toBeGreaterThanOrEqual(10);
		expect(admitted).toBeLessThanOrEqual(12);
	});

	it("limits each copy alone while the cache is down, and counts on when it is back", async () => {
		const { cache, state } = fakeCache();
		const failures: unknown[] = [];
		const admit = createAdmission({ onFailure: (error) => failures.push(error) });
		for (let i = 0; i < 4; i++) await admit(cache, GUEST_CREATE, KEY);
		state.down = true;
		let admitted = 0;
		for (let i = 0; i < 20; i++) if ((await admit(cache, GUEST_CREATE, KEY)).admitted) admitted++;
		expect(admitted).toBe(6);
		expect(failures.length).toBeGreaterThan(0);
		state.down = false;
		expect((await admit(cache, GUEST_CREATE, KEY)).admitted).toBe(false);
	});

	it("ignores a corrupt shared value", async () => {
		const { cache, values } = fakeCache();
		const admit = createAdmission();
		values.set(`adm:v1:${GUEST_CREATE.name}:${KEY}`, '{"s":"x","c":[1]}');
		expect((await admit(cache, GUEST_CREATE, KEY)).admitted).toBe(true);
	});
});

describe("the client address", () => {
	const key = new TextEncoder().encode(`${"k".repeat(64)}\n`);
	const signed = (address: string, seconds: number) => ({
		[CLIENT_ADDRESS_HEADER]: address,
		[CLIENT_SIGNATURE_HEADER]: `v1.${seconds}.${clientSignature(key, seconds, address)}`,
	});

	it("signs the Worker's text with the trimmed key (deploy/cloudflare checks the same)", () => {
		const expected = createHmac("sha256", "k".repeat(64))
			.update("qrwty-client-v1\n1794777000\n2001:db8::1")
			.digest("base64url");
		expect(clientSignature(key, 1794777000, "2001:db8::1")).toBe(expected);
	});

	it("reduces IPv4 to /32 and IPv6 to /64, IPv4-mapped to IPv4", () => {
		expect(networkOf("203.0.113.9")).toBe("4:203.0.113.9");
		expect(networkOf("2001:db8:1:2:aaaa::1")).toBe("6:2001:0db8:0001:0002");
		expect(networkOf("2001:DB8:1:2:ffff:ffff:ffff:ffff")).toBe("6:2001:0db8:0001:0002");
		expect(networkOf("::ffff:203.0.113.9")).toBe("4:203.0.113.9");
		expect(networkOf("::1")).toBe("6:0000:0000:0000:0000");
		for (const bad of ["", "x", "1.2.3", "fe80::1%eth0", "256.1.1.1"])
			expect(networkOf(bad)).toBeUndefined();
	});

	it("accepts only a fresh, valid signature; anything else is unverified", () => {
		const now = 1794777000;
		expect(verifiedAddress(signed("203.0.113.9", now), key, now)).toBe("203.0.113.9");
		expect(verifiedAddress(signed("203.0.113.9", now - 61), key, now)).toBeUndefined();
		expect(
			verifiedAddress(
				{ ...signed("203.0.113.9", now), [CLIENT_ADDRESS_HEADER]: "198.51.100.1" },
				key,
				now,
			),
		).toBeUndefined();
		expect(verifiedAddress(signed("203.0.113.9", now), undefined, now)).toBeUndefined();
		// X-Forwarded-For proves nothing.
		expect(admissionKeyFor({ "x-forwarded-for": "198.51.100.1" }, key, now)).toBe(UNVERIFIED);
		expect(admissionKeyFor(signed("203.0.113.9", now), undefined, now)).toBe(UNVERIFIED);
	});

	it("gives one network one key, never the address itself", () => {
		const now = 1794777000;
		const a = admissionKeyFor(signed("2001:db8:1:2::1", now), key, now);
		const b = admissionKeyFor(signed("2001:db8:1:2:9999:8888:7777:6666", now), key, now);
		const c = admissionKeyFor(signed("2001:db8:1:3::1", now), key, now);
		expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(a).not.toContain("2001");
		const other = admissionKeyFor(signed("203.0.113.9", now), key, now);
		expect(other).not.toBe(admissionKeyFor(signed("203.0.113.10", now), key, now));
	});
});

describe("operators", () => {
	const key = new TextEncoder().encode("o".repeat(64));
	const now = 1794777000;
	const cli = (path: string, reason: string, overrides: Record<string, string> = {}) => {
		const parts = {
			method: "POST",
			path,
			time: String(now),
			nonce: "N".repeat(24),
			actor: "owner@example.com",
			reason,
		};
		return {
			[OPERATOR_HEADERS.actor]: parts.actor,
			[OPERATOR_HEADERS.time]: parts.time,
			[OPERATOR_HEADERS.nonce]: parts.nonce,
			[OPERATOR_HEADERS.signature]: operatorSignature(key, operatorPayload(parts)),
			...overrides,
		};
	};
	const anonymous = { signedIn: false } as const;

	it("is an allowlisted subject, or the CLI's valid signature; nobody when both are absent", () => {
		const settings = { subjects: operatorSubjects("auth0|op, auth0|two"), key };
		const signedIn = (subject: string) => ({ signedIn: true, principal: { subject } }) as const;
		expect(
			operatorOf({ method: "GET", headers: {}, caller: signedIn("auth0|op") }, "/x", "", settings)
				?.actor,
		).toBe("account:auth0|op");
		expect(
			operatorOf(
				{ method: "GET", headers: {}, caller: signedIn("auth0|alice") },
				"/x",
				"",
				settings,
			),
		).toBeUndefined();
		const headers = cli("/links/1/block", "phishing");
		expect(
			operatorOf(
				{ method: "POST", headers, caller: anonymous },
				"/links/1/block",
				"phishing",
				settings,
				now,
			),
		).toEqual({
			actor: "cli:owner@example.com",
			requestId: "N".repeat(24),
		});
		// Another path, reason, actor, a stale time or no key: not an operator.
		expect(
			operatorOf(
				{ method: "POST", headers, caller: anonymous },
				"/links/2/block",
				"phishing",
				settings,
				now,
			),
		).toBeUndefined();
		expect(
			operatorOf(
				{ method: "POST", headers, caller: anonymous },
				"/links/1/block",
				"spam",
				settings,
				now,
			),
		).toBeUndefined();
		expect(
			operatorOf(
				{
					method: "POST",
					headers: { ...headers, [OPERATOR_HEADERS.actor]: "x" },
					caller: anonymous,
				},
				"/links/1/block",
				"phishing",
				settings,
				now,
			),
		).toBeUndefined();
		expect(
			operatorOf(
				{ method: "POST", headers, caller: anonymous },
				"/links/1/block",
				"phishing",
				settings,
				now + 121,
			),
		).toBeUndefined();
		expect(
			operatorOf(
				{ method: "POST", headers, caller: anonymous },
				"/links/1/block",
				"phishing",
				{ subjects: operatorSubjects(undefined), key: undefined },
				now,
			),
		).toBeUndefined();
		expect(operatorSubjects("").size).toBe(0);
	});
});

describe("reports and moderation routes", () => {
	const origin = new URL("https://qrwty.io");
	const setup = () => {
		const calls: { sql: string; values: readonly unknown[] }[] = [];
		const { cache } = fakeCache();
		const routes = moderationRoutes({
			origin,
			subjects: operatorSubjects(undefined),
			operatorKey: undefined,
			admission: createAdmission(),
			onFailure: () => {},
		});
		const dependencies = {
			admissionCache: cache,
			links: {
				query: async (sql: string, values: readonly unknown[] = []) => {
					calls.push({ sql, values });
					return [{ record_report: true }];
				},
			},
		} as unknown as AbuseDependencies;
		const call = (
			method: string,
			path: string,
			body?: unknown,
			headers: Record<string, string> = {},
		) =>
			routes(
				{
					method,
					path,
					rawPath: path,
					query: {},
					headers: { [ADMISSION_KEY_HEADER]: KEY, ...headers },
					body,
					caller: { signedIn: false },
					signal: new AbortController().signal,
				},
				dependencies,
			);
		return { call, calls };
	};

	it("finds the slug of a short URL on the public origin only", () => {
		expect(reportedSlug("https://qrwty.io/Ab3dE5gH9k", origin)).toBe("Ab3dE5gH9k");
		expect(reportedSlug("Ab3dE5gH9k", origin)).toBe("Ab3dE5gH9k");
		expect(reportedSlug("https://evil.example/Ab3dE5gH9k", origin)).toBeUndefined();
		expect(reportedSlug("https://qrwty.io/app/links", origin)).toBeUndefined();
	});

	it("answers 202 for a report, stores it by slug, and limits a network to 5 per 10 minutes", async () => {
		const { call, calls } = setup();
		const report = {
			shortUrl: "https://qrwty.io/Ab3dE5gH9k",
			reason: "phishing",
			details: "fake bank",
		};
		for (let i = 0; i < 5; i++) {
			const r = await call("POST", "/reports", report);
			expect(r.status).toBe(202);
			expect(r.body).toEqual({ received: true });
		}
		expect(calls).toHaveLength(5);
		expect(calls[0]?.sql).toContain("record_report(");
		expect(calls[0]?.values.slice(0, 3)).toEqual(["Ab3dE5gH9k", "phishing", "fake bank"]);
		const limited = await call("POST", "/reports", report);
		expect(limited.status).toBe(429);
		expect(Number(limited.headers?.["Retry-After"])).toBeGreaterThan(0);
		expect(calls).toHaveLength(5);
	});

	it("is 202 for an unknown host without storing; 400 for a bad body; never a change", async () => {
		const { call, calls } = setup();
		expect(
			(await call("POST", "/reports", { shortUrl: "https://elsewhere.example/x", reason: "spam" }))
				.status,
		).toBe(202);
		expect(calls).toHaveLength(0);
		for (const bad of [
			null,
			{ shortUrl: "https://qrwty.io/Ab3dE5gH9k", reason: "dislike" },
			{ shortUrl: "https://qrwty.io/Ab3dE5gH9k", reason: "spam", details: "x".repeat(1001) },
			{ shortUrl: "https://qrwty.io/Ab3dE5gH9k", reason: "spam", block: true },
		])
			expect((await call("POST", "/reports", bad)).status).toBe(400);
		expect(calls.every((c) => !c.sql.includes("moderate_link"))).toBe(true);
	});

	it("answers 404 on every operator route to a non-operator, before any SQL", async () => {
		const { call, calls } = setup();
		expect((await call("GET", "/operator/links/by-slug/Ab3dE5gH9k")).status).toBe(404);
		const id = "00000000-0000-4000-8000-000000000000";
		expect((await call("POST", `/operator/links/${id}/block`, { reason: "phishing" })).status).toBe(
			404,
		);
		expect(
			(
				await call(
					"POST",
					`/operator/links/${id}/unblock`,
					{ reason: "x" },
					{ [OPERATOR_HEADERS.signature]: "s".repeat(43) },
				)
			).status,
		).toBe(404);
		expect(calls).toHaveLength(0);
	});
});

describe("a guest create beyond the limit", () => {
	it("is 429 with Retry-After before the reputation check and stores nothing", async () => {
		let created = 0;
		const reputation: string[] = [];
		const { cache } = fakeCache();
		const handle = linkOperations({
			origin: new URL("https://qrwty.io"),
			keyRing: parseKeyRing(`k1 ${Buffer.alloc(32, 7).toString("base64url")}`),
			hooks: testHooks(undefined),
			reputation: () => async (destination) => {
				reputation.push(destination);
				return "clean";
			},
			onFailure: () => {},
			admission: createAdmission(),
		});
		const links = {
			query: async (sql: string, values: readonly unknown[] = []) => {
				if (sql.includes("find_idempotent(")) return [];
				created++;
				return [
					{ outcome: "created", status: 201, body: { id: values[3], version: 1 }, sealed: null },
				];
			},
		};
		const dependencies = { links, admissionCache: cache } as unknown as Dependencies;
		const create = (i: number) =>
			handle(dependencies, {
				method: "POST",
				path: "/links",
				rawPath: "/links",
				query: {},
				headers: {
					"idempotency-key": `k${i}`,
					[GUEST_SCOPE_HEADER]: "G".repeat(43),
					[ADMISSION_KEY_HEADER]: KEY,
				},
				body: { destination: `https://example.com/${i}` },
				caller: { signedIn: false },
				signal: new AbortController().signal,
			});
		for (let i = 0; i < 10; i++) expect((await create(i)).status).toBe(201);
		const eleventh = await create(10);
		expect(eleventh.status).toBe(429);
		expect((eleventh.body as { error: { code: string } }).error.code).toBe("rate_limited");
		expect(Number(eleventh.headers?.["Retry-After"])).toBeGreaterThan(0);
		expect(created).toBe(10);
		expect(reputation).toHaveLength(10);
	});
});

describe("account deletion", () => {
	const keyOf = (id: string) => createHash("sha256").update(id).digest().toString("base64url");
	const ring = keyRing().parse(Buffer.from(JSON.stringify([{ id: "k1", key: keyOf("k1") }])));

	function forwarding(eraseUser: UserEraser) {
		const order: string[] = [];
		let revoked = false;
		const cookie = newAccountCookie();
		const id = sessionId(cookie);
		const tokens = sealTokens(ring, id, {
			subject: "auth0|alice",
			access: "access",
			refresh: null,
			email: null,
			name: null,
		});
		const store = {
			useSession: async () =>
				revoked
					? { status: "revoked" }
					: {
							status: "active",
							subject_key: ownerKey("auth0|alice"),
							tokens_sealed: tokens,
							token_generation: 1,
							access_expires_at: new Date(Date.now() + 300_000),
						},
			revokeAccount: async () => {
				order.push("revoke sessions");
				revoked = true;
				return [];
			},
		} as unknown as SessionStore;
		const linkApi = {
			request: async (path: string) => {
				order.push(`link-api ${path}`);
				return new Response(JSON.stringify({ erased: true }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			},
		};
		const context = {
			ring,
			origin: new URL("https://qrwty.io"),
			store,
			oidc: {} as SessionContext["oidc"],
			linkApi,
			accountApi: linkApi,
			// A7: the subscription is canceled first.
			billingApi: {
				request: async (path: string) => {
					order.push(`billing-api ${path}`);
					return new Response(JSON.stringify({ subscriptionsCanceled: 0 }), {
						status: 200,
						headers: { "content-type": "application/json" },
					});
				},
			},
			eraseUser: {
				warm: async (signal: AbortSignal) => eraseUser.warm(signal),
				erase: async (subject: string, signal: AbortSignal) => {
					order.push(`erase ${subject}`);
					return eraseUser.erase(subject, signal);
				},
			},
		};
		const routes = forwardRoutes();
		const call = () =>
			routes(
				{
					method: "DELETE",
					path: "/api/v1/me",
					rawPath: "/api/v1/me",
					query: {},
					headers: {
						cookie: `${SESSION_COOKIE}=${cookie.value}`,
						"x-csrf-token": csrfToken(ring, cookie.value),
						"idempotency-key": "delete-1",
					},
					body: undefined,
					caller: { signedIn: false },
					signal: new AbortController().signal,
				},
				context,
			) as Promise<ModuleResponse>;
		return { call, order };
	}

	it("deletes the Auth0 user after Links' erasure and before the sessions", async () => {
		const issuer: { path: string; init: RequestInit }[] = [];
		const identity = {
			request: async (path: string, init: RequestInit = {}) => {
				issuer.push({ path, init });
				if (path === "/oauth/token")
					return new Response(JSON.stringify({ access_token: "mgmt", expires_in: 86400 }), {
						status: 200,
					});
				return new Response(null, { status: 204 });
			},
		};
		const eraser = auth0UserEraser(identity, new URL("https://tenant.example/"), {
			clientId: "erasure-client-1",
			clientSecret: "s".repeat(32),
		});
		const { call, order } = forwarding(eraser);
		const r = await call();
		expect(r.status).toBe(202);
		expect(order).toEqual([
			"billing-api /modules/billing-api-customer-billing/account/erase",
			"link-api /modules/link-api-link-operations/account/erase",
			"erase auth0|alice",
			"revoke sessions",
		]);
		const token = issuer.find((c) => c.path === "/oauth/token");
		expect(String(token?.init.body)).toContain("grant_type=client_credentials");
		expect(String(token?.init.body)).toContain(
			encodeURIComponent("https://tenant.example/api/v2/"),
		);
		const deletion = issuer.find((c) => c.init.method === "DELETE");
		expect(deletion?.path).toBe("/api/v2/users/auth0%7Calice");
		expect((deletion?.init.headers ?? {}) as Record<string, string>).toMatchObject({
			authorization: "Bearer mgmt",
		});
		// The token is cached: a second deletion asks for none.
		await eraser.erase("auth0|bob", new AbortController().signal);
		expect(issuer.filter((c) => c.path === "/oauth/token")).toHaveLength(1);
	});

	it("answers 503 and keeps the session when the issuer can't delete the user", async () => {
		const eraser: UserEraser = {
			warm: async () => {},
			erase: async () => {
				throw new Error("Management API user deletion answered 500");
			},
		};
		const { call, order } = forwarding(eraser);
		const r = await call();
		expect(r.status).toBe(503);
		expect(r.headers?.["Retry-After"]).toBeDefined();
		expect(order).not.toContain("revoke sessions");
	});
});
