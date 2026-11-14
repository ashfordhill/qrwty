// A stateful fixture of the Stripe API subset the billing contract needs: customers, prices,
// Checkout sessions, billing portal sessions, subscriptions, invoices and events, with
// idempotency keys, a call log, controllable state, delay and failure. Arms point the official
// Stripe SDK at it (host/port/protocol) in their test profile. It never talks to Stripe.
import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "../client/client.ts";
import { sign } from "./stripe-signer.ts";

export const FIXTURE_PRICE_ID = "price_TEST_qrwty_paid_monthly_v1";
const DAY = 86_400;

type Obj = Record<string, unknown> & { id: string };

export interface StripeCall {
	at: string;
	method: string;
	path: string;
	idempotencyKey: string | null;
	status: number;
	replayed: boolean;
	params: Record<string, unknown>;
}

export interface StripeFixtureOptions {
	listen?: string;
	priceIds?: string[];
	/** Webhook endpoint and signing secret used by deliver(); never logged. */
	webhook?: { url: string; secret: string; origin?: string };
}

/** Parses Stripe's form encoding (`a[b][0][c]=v`, `expand[]=x`) into nested values. */
export function parseForm(text: string): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [rawKey, value] of new URLSearchParams(text)) {
		const base = /^[^[]+/.exec(rawKey)?.[0] ?? rawKey;
		const parts = [
			base,
			...[...rawKey.slice(base.length).matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]),
		];
		let node: Record<string, unknown> | unknown[] = out;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const last = i === parts.length - 1;
			const nextIsIndex = !last && /^\d*$/.test(parts[i + 1]);
			if (Array.isArray(node)) {
				const index = part === "" ? node.length : Number(part);
				if (last) node[index] = value;
				else {
					if (node[index] === undefined) node[index] = nextIsIndex ? [] : {};
					node = node[index] as Record<string, unknown> | unknown[];
				}
			} else if (last) {
				node[part] = value;
			} else {
				if (node[part] === undefined) node[part] = nextIsIndex ? [] : {};
				node = node[part] as Record<string, unknown> | unknown[];
			}
		}
	}
	return out;
}

function id(prefix: string): string {
	return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function now(): number {
	return Math.floor(Date.now() / 1000);
}

export class StripeFixture {
	url = "";
	readonly calls: StripeCall[] = [];
	readonly customers = new Map<string, Obj>();
	readonly prices = new Map<string, Obj>();
	readonly sessions = new Map<string, Obj>();
	readonly portals = new Map<string, Obj>();
	readonly subscriptions = new Map<string, Obj>();
	readonly invoices = new Map<string, Obj>();
	readonly events: Obj[] = [];
	private readonly idempotency = new Map<string, { hash: string; status: number; body: unknown }>();
	/** When true every API request is answered by resetting the connection. */
	down = false;
	delayMs = 0;
	/** The next N API requests fail with 500 api_error. */
	failNext = 0;
	private server: Server | null = null;

	readonly options: StripeFixtureOptions;

	constructor(options: StripeFixtureOptions = {}) {
		this.options = options;
		this.resetState();
	}

	resetState(): void {
		for (const map of [
			this.customers,
			this.prices,
			this.sessions,
			this.portals,
			this.subscriptions,
			this.invoices,
		]) {
			map.clear();
		}
		this.events.length = 0;
		this.calls.length = 0;
		this.idempotency.clear();
		this.down = false;
		this.delayMs = 0;
		this.failNext = 0;
		for (const priceId of new Set([FIXTURE_PRICE_ID, ...(this.options.priceIds ?? [])])) {
			this.prices.set(priceId, {
				id: priceId,
				object: "price",
				active: true,
				currency: "usd",
				unit_amount: 500,
				lookup_key: "qrwty-test-paid-monthly",
				product: "prod_TEST_qrwty_paid",
				recurring: { interval: "month", interval_count: 1 },
				type: "recurring",
				livemode: false,
			});
		}
	}

	async start(): Promise<this> {
		const [host, port] = (this.options.listen ?? "127.0.0.1:0").split(":");
		this.server = createServer((req, res) => {
			void this.handle(req, res);
		});
		await new Promise<void>((resolve, reject) => {
			this.server?.once("error", reject);
			this.server?.listen(Number(port), host, () => resolve());
		});
		const address = this.server.address() as AddressInfo;
		this.url = `http://${host}:${address.port}`;
		return this;
	}

	close(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.server) return resolve();
			this.server.closeAllConnections();
			this.server.close(() => resolve());
		});
	}

	// ---- state transitions used by rows (and by the control routes) ----

	private event(type: string, object: Obj, previous?: Record<string, unknown>): Obj {
		const evt: Obj = {
			id: id("evt"),
			object: "event",
			api_version: "2026-10-29.oracle",
			created: now(),
			type,
			livemode: false,
			pending_webhooks: 1,
			request: { id: null, idempotency_key: null },
			data: previous
				? { object: structuredClone(object), previous_attributes: previous }
				: { object: structuredClone(object) },
		};
		this.events.push(evt);
		return evt;
	}

	/** Completes a Checkout session: subscription active, first invoice paid. */
	completeCheckout(sessionId: string): { subscription: Obj; events: Obj[] } {
		const session = this.sessions.get(sessionId);
		if (!session) throw new Error(`unknown checkout session ${sessionId}`);
		if (session.status !== "open")
			throw new Error(`checkout session ${sessionId} is ${session.status}`);
		const start = now();
		const priceId = ((session.line_items as { price: string }[])[0] ?? { price: FIXTURE_PRICE_ID })
			.price;
		const subscription: Obj = {
			id: id("sub"),
			object: "subscription",
			customer: session.customer,
			status: "active",
			cancel_at_period_end: false,
			canceled_at: null,
			ended_at: null,
			created: start,
			current_period_start: start,
			current_period_end: start + 30 * DAY,
			metadata:
				(session.subscription_data as { metadata?: unknown } | undefined)?.metadata ??
				session.metadata ??
				{},
			items: {
				object: "list",
				data: [
					{
						id: id("si"),
						object: "subscription_item",
						price: this.prices.get(priceId),
						quantity: 1,
						current_period_start: start,
						current_period_end: start + 30 * DAY,
					},
				],
			},
			latest_invoice: null,
			livemode: false,
		};
		const invoice = this.newInvoice(subscription, "paid");
		subscription.latest_invoice = invoice.id;
		this.subscriptions.set(subscription.id, subscription);
		session.status = "complete";
		session.payment_status = "paid";
		session.subscription = subscription.id;
		const events = [
			this.event("checkout.session.completed", session),
			this.event("customer.subscription.created", subscription),
			this.event("invoice.paid", invoice),
		];
		return { subscription, events };
	}

	private newInvoice(subscription: Obj, status: string): Obj {
		const invoice: Obj = {
			id: id("in"),
			object: "invoice",
			customer: subscription.customer,
			subscription: subscription.id,
			status,
			amount_due: 500,
			currency: "usd",
			attempt_count: status === "paid" ? 1 : 1,
			created: now(),
			livemode: false,
		};
		this.invoices.set(invoice.id, invoice);
		return invoice;
	}

	paymentFailed(subscriptionId: string): Obj[] {
		const sub = this.mustSub(subscriptionId);
		const previous = { status: sub.status };
		const invoice = this.newInvoice(sub, "open");
		sub.status = "past_due";
		sub.latest_invoice = invoice.id;
		return [
			this.event("invoice.payment_failed", invoice),
			this.event("customer.subscription.updated", sub, previous),
		];
	}

	paymentRecovered(subscriptionId: string): Obj[] {
		const sub = this.mustSub(subscriptionId);
		const previous = { status: sub.status };
		const invoice = this.newInvoice(sub, "paid");
		sub.status = "active";
		sub.latest_invoice = invoice.id;
		return [
			this.event("invoice.paid", invoice),
			this.event("customer.subscription.updated", sub, previous),
		];
	}

	setCancelAtPeriodEnd(subscriptionId: string, value: boolean): Obj[] {
		const sub = this.mustSub(subscriptionId);
		const previous = { cancel_at_period_end: sub.cancel_at_period_end };
		sub.cancel_at_period_end = value;
		return [this.event("customer.subscription.updated", sub, previous)];
	}

	/** Ends the current period: cancels if scheduled, otherwise renews. */
	advancePeriod(subscriptionId: string): Obj[] {
		const sub = this.mustSub(subscriptionId);
		if (sub.cancel_at_period_end) return this.cancelNow(subscriptionId);
		const previous = { current_period_end: sub.current_period_end };
		sub.current_period_start = sub.current_period_end;
		sub.current_period_end = (sub.current_period_end as number) + 30 * DAY;
		return [this.event("customer.subscription.updated", sub, previous)];
	}

	cancelNow(subscriptionId: string): Obj[] {
		const sub = this.mustSub(subscriptionId);
		sub.status = "canceled";
		sub.canceled_at = now();
		sub.ended_at = now();
		return [this.event("customer.subscription.deleted", sub)];
	}

	private mustSub(subscriptionId: string): Obj {
		const sub = this.subscriptions.get(subscriptionId);
		if (!sub) throw new Error(`unknown subscription ${subscriptionId}`);
		return sub;
	}

	activeSubscriptions(customer?: string): Obj[] {
		return [...this.subscriptions.values()].filter(
			(s) =>
				["active", "past_due", "trialing"].includes(s.status as string) &&
				(!customer || s.customer === customer),
		);
	}

	callsTo(method: string, pathPrefix: string): StripeCall[] {
		return this.calls.filter(
			(c) => c.method === method && c.path.startsWith(pathPrefix) && !c.replayed,
		);
	}

	/** Signs an event with the adapter's webhook secret and POSTs it to the arm's webhook URL. */
	async deliver(
		event: Obj | Buffer,
		mutate?: (body: Buffer, header: string) => { body: Buffer; header: string },
	) {
		const hook = this.options.webhook;
		if (!hook) throw new Error("stripe fixture has no webhook binding");
		const payload = Buffer.isBuffer(event)
			? event
			: Buffer.from(JSON.stringify(event, null, 2), "utf8");
		let { body, header } = sign(payload, hook.secret);
		if (mutate) ({ body, header } = mutate(body, header));
		const target = new URL(hook.url);
		const client = new Client(target.origin, hook.origin ?? target.origin);
		return client.request("POST", target.pathname + target.search, {
			rawBody: body,
			headers: { "Content-Type": "application/json; charset=utf-8", "Stripe-Signature": header },
		});
	}

	// ---- HTTP ----

	private send(
		res: ServerResponse,
		status: number,
		body: unknown,
		extra: Record<string, string> = {},
	): void {
		const text = JSON.stringify(body);
		res.writeHead(status, {
			"Content-Type": "application/json",
			"Content-Length": String(Buffer.byteLength(text)),
			"Request-Id": id("req"),
			...extra,
		});
		res.end(text);
	}

	private error(res: ServerResponse, status: number, type: string, message: string, code?: string) {
		this.send(res, status, { error: { type, message, ...(code ? { code } : {}) } });
	}

	private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(chunk as Buffer);
		const raw = Buffer.concat(chunks).toString("utf8");
		const url = new URL(req.url ?? "/", "http://fixture");
		const method = req.method ?? "GET";

		if (url.pathname.startsWith("/__oracle/stripe/")) return this.control(method, url, raw, res);
		if (url.pathname.startsWith("/checkout/") || url.pathname.startsWith("/portal/")) {
			return this.hosted(method, url, res);
		}
		if (this.down) {
			req.socket.destroy();
			return;
		}
		if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));

		const params =
			method === "GET" || method === "DELETE" ? parseForm(url.search.slice(1)) : parseForm(raw);
		const key = (req.headers["idempotency-key"] as string | undefined) ?? null;
		const call: StripeCall = {
			at: new Date().toISOString(),
			method,
			path: url.pathname,
			idempotencyKey: key ? createHash("sha256").update(key).digest("hex").slice(0, 16) : null,
			status: 0,
			replayed: false,
			params: summarize(params),
		};
		this.calls.push(call);

		const auth = req.headers.authorization ?? "";
		const apiKey = auth.replace(/^Bearer\s+/i, "");
		if (!apiKey) {
			call.status = 401;
			return this.error(res, 401, "invalid_request_error", "No API key provided.");
		}
		if (!/^sk_test_|^rk_test_/.test(apiKey)) {
			call.status = 401;
			return this.error(
				res,
				401,
				"invalid_request_error",
				"The oracle fixture accepts test-mode keys only.",
			);
		}
		if (this.failNext > 0) {
			this.failNext--;
			call.status = 500;
			return this.error(res, 500, "api_error", "oracle fixture injected failure");
		}
		const idemKey =
			key && method === "POST"
				? `${createHash("sha256").update(apiKey).digest("hex")}:${key}`
				: null;
		const hash = createHash("sha256").update(`${method} ${url.pathname} ${raw}`).digest("hex");
		if (idemKey) {
			const seen = this.idempotency.get(idemKey);
			if (seen && seen.hash !== hash) {
				call.status = 400;
				return this.error(
					res,
					400,
					"idempotency_error",
					"Keys for idempotent requests can only be used with the same parameters they were first used with.",
				);
			}
			if (seen) {
				call.status = seen.status;
				call.replayed = true;
				return this.send(res, seen.status, seen.body, { "Idempotent-Replayed": "true" });
			}
		}
		const { status, body } = this.route(method, url.pathname, params);
		call.status = status;
		if (idemKey && status < 500) this.idempotency.set(idemKey, { hash, status, body });
		return this.send(res, status, body);
	}

	private route(
		method: string,
		path: string,
		p: Record<string, unknown>,
	): { status: number; body: unknown } {
		const missing = (what: string, value: string) => ({
			status: 404,
			body: {
				error: {
					type: "invalid_request_error",
					code: "resource_missing",
					message: `No such ${what}: '${value}'`,
				},
			},
		});
		const list = (data: Obj[], url: string) => ({
			status: 200,
			body: {
				object: "list",
				data: data.slice(0, Number(p.limit ?? 10)),
				has_more: data.length > Number(p.limit ?? 10),
				url,
			},
		});
		const seg = path.split("/").filter(Boolean); // ["v1", resource, id?, action?]
		const [, resource, rid, action] = seg;

		if (resource === "customers") {
			if (method === "POST" && !rid) {
				const customer: Obj = {
					id: id("cus"),
					object: "customer",
					email: p.email ?? null,
					name: p.name ?? null,
					metadata: p.metadata ?? {},
					created: now(),
					livemode: false,
				};
				this.customers.set(customer.id, customer);
				return { status: 200, body: customer };
			}
			if (method === "GET" && !rid) {
				return list(
					[...this.customers.values()].filter((c) => !p.email || c.email === p.email),
					"/v1/customers",
				);
			}
			const customer = rid ? this.customers.get(rid) : undefined;
			if (!customer) return missing("customer", rid ?? "");
			if (method === "GET") return { status: 200, body: customer };
			if (method === "POST") {
				Object.assign(
					customer,
					p.metadata
						? { metadata: { ...(customer.metadata as object), ...(p.metadata as object) } }
						: {},
					p.email ? { email: p.email } : {},
				);
				return { status: 200, body: customer };
			}
			if (method === "DELETE") {
				this.customers.delete(customer.id);
				return { status: 200, body: { id: customer.id, object: "customer", deleted: true } };
			}
		}
		if (resource === "prices") {
			if (method === "GET" && !rid) {
				const keys = (p.lookup_keys as string[] | undefined) ?? [];
				return list(
					[...this.prices.values()].filter(
						(x) => keys.length === 0 || keys.includes(x.lookup_key as string),
					),
					"/v1/prices",
				);
			}
			const price = rid ? this.prices.get(rid) : undefined;
			return price ? { status: 200, body: price } : missing("price", rid ?? "");
		}
		if (resource === "checkout" && rid === "sessions") {
			const sid = action;
			const sub = seg[4];
			if (method === "POST" && !sid) {
				const items = (p.line_items as { price?: string; quantity?: string }[] | undefined) ?? [];
				if (items.length === 0 || !items.every((i) => i.price && this.prices.has(i.price))) {
					return {
						status: 400,
						body: {
							error: {
								type: "invalid_request_error",
								code: "resource_missing",
								message: "No such price",
								param: "line_items[0][price]",
							},
						},
					};
				}
				if (p.customer && !this.customers.has(p.customer as string))
					return missing("customer", p.customer as string);
				const session: Obj = {
					id: id("cs_test"),
					object: "checkout.session",
					mode: p.mode ?? "payment",
					customer: p.customer ?? null,
					customer_email: p.customer_email ?? null,
					client_reference_id: p.client_reference_id ?? null,
					metadata: p.metadata ?? {},
					subscription_data: p.subscription_data ?? null,
					line_items: items.map((i) => ({ price: i.price, quantity: Number(i.quantity ?? 1) })),
					success_url: p.success_url ?? null,
					cancel_url: p.cancel_url ?? null,
					status: "open",
					payment_status: "unpaid",
					subscription: null,
					created: now(),
					expires_at: now() + DAY,
					livemode: false,
					url: "",
				};
				session.url = `${this.url}/checkout/${session.id}`;
				this.sessions.set(session.id, session);
				return { status: 200, body: session };
			}
			if (method === "GET" && !sid) {
				return list(
					[...this.sessions.values()].filter(
						(s) =>
							(!p.customer || s.customer === p.customer) && (!p.status || s.status === p.status),
					),
					"/v1/checkout/sessions",
				);
			}
			const session = sid ? this.sessions.get(sid) : undefined;
			if (!session) return missing("checkout.session", sid ?? "");
			if (method === "POST" && sub === "expire") {
				if (session.status !== "open")
					return {
						status: 400,
						body: {
							error: {
								type: "invalid_request_error",
								message: "Only open sessions can be expired.",
							},
						},
					};
				session.status = "expired";
				this.event("checkout.session.expired", session);
			}
			return { status: 200, body: session };
		}
		if (resource === "billing_portal" && rid === "sessions" && method === "POST") {
			if (!p.customer || !this.customers.has(p.customer as string))
				return missing("customer", (p.customer as string) ?? "");
			const portal: Obj = {
				id: id("bps"),
				object: "billing_portal.session",
				customer: p.customer,
				return_url: p.return_url ?? null,
				created: now(),
				livemode: false,
				url: "",
			};
			portal.url = `${this.url}/portal/${portal.id}`;
			this.portals.set(portal.id, portal);
			return { status: 200, body: portal };
		}
		if (resource === "subscriptions") {
			if (method === "GET" && !rid) {
				const status = (p.status as string | undefined) ?? "active";
				const subs = [...this.subscriptions.values()].filter(
					(s) =>
						(!p.customer || s.customer === p.customer) && (status === "all" || s.status === status),
				);
				return list(subs, "/v1/subscriptions");
			}
			const sub = rid ? this.subscriptions.get(rid) : undefined;
			if (!sub) return missing("subscription", rid ?? "");
			if (method === "GET") return { status: 200, body: sub };
			if (method === "POST") {
				if (p.cancel_at_period_end !== undefined)
					this.setCancelAtPeriodEnd(sub.id, p.cancel_at_period_end === "true");
				if (p.metadata) sub.metadata = { ...(sub.metadata as object), ...(p.metadata as object) };
				return { status: 200, body: sub };
			}
			if (method === "DELETE") {
				if (sub.status === "canceled")
					return {
						status: 400,
						body: {
							error: {
								type: "invalid_request_error",
								message: "This subscription is already canceled.",
							},
						},
					};
				this.cancelNow(sub.id);
				return { status: 200, body: sub };
			}
		}
		if (resource === "invoices" && method === "GET" && rid) {
			const invoice = this.invoices.get(rid);
			return invoice ? { status: 200, body: invoice } : missing("invoice", rid);
		}
		if (resource === "events" && method === "GET") {
			if (rid) {
				const evt = this.events.find((e) => e.id === rid);
				return evt ? { status: 200, body: evt } : missing("event", rid);
			}
			return list(
				[...this.events].reverse().filter((e) => !p.type || e.type === p.type),
				"/v1/events",
			);
		}
		return {
			status: 404,
			body: {
				error: {
					type: "invalid_request_error",
					message: `Unrecognized request URL (${method}: ${path}).`,
				},
			},
		};
	}

	private control(method: string, url: URL, raw: string, res: ServerResponse) {
		const parts = url.pathname.replace("/__oracle/stripe/", "").split("/");
		const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
		try {
			if (parts[0] === "calls") return this.send(res, 200, { calls: this.calls });
			if (parts[0] === "events") return this.send(res, 200, { events: this.events });
			if (parts[0] === "reset" && method === "POST") {
				this.resetState();
				return this.send(res, 200, { ok: true });
			}
			if (parts[0] === "mode" && method === "POST") {
				if (typeof body.down === "boolean") this.down = body.down;
				if (typeof body.delayMs === "number") this.delayMs = body.delayMs;
				if (typeof body.failNext === "number") this.failNext = body.failNext;
				return this.send(res, 200, {
					down: this.down,
					delayMs: this.delayMs,
					failNext: this.failNext,
				});
			}
			if (parts[0] === "checkout" && parts[2] === "complete")
				return this.send(res, 200, this.completeCheckout(parts[1]));
			if (parts[0] === "subscriptions" && parts[1]) {
				const actions: Record<string, () => Obj[]> = {
					"payment-failed": () => this.paymentFailed(parts[1]),
					"payment-recovered": () => this.paymentRecovered(parts[1]),
					"cancel-at-period-end": () => this.setCancelAtPeriodEnd(parts[1], true),
					"advance-period": () => this.advancePeriod(parts[1]),
					"cancel-now": () => this.cancelNow(parts[1]),
				};
				const action = actions[parts[2] ?? ""];
				if (action) return this.send(res, 200, { events: action() });
			}
			return this.send(res, 404, { error: "unknown control" });
		} catch (error) {
			return this.send(res, 409, { error: (error as Error).message });
		}
	}

	/** Minimal hosted pages so a browser can finish Checkout or visit the portal by mouse. */
	private hosted(method: string, url: URL, res: ServerResponse) {
		const [kind, sid, action] = url.pathname.split("/").filter(Boolean);
		const html = (body: string) => {
			res.writeHead(200, {
				"Content-Type": "text/html; charset=utf-8",
				"Cache-Control": "no-store",
			});
			res.end(
				`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Oracle Stripe fixture</title></head><body>${body}</body></html>`,
			);
		};
		const redirect = (to: string) => {
			res.writeHead(303, { Location: to });
			res.end();
		};
		if (kind === "checkout") {
			const session = this.sessions.get(sid);
			if (!session) return html("<p>Unknown session</p>");
			if (method === "POST" && action === "complete") {
				if (session.status === "open") this.completeCheckout(sid);
				return redirect(String(session.success_url ?? "/").replace("{CHECKOUT_SESSION_ID}", sid));
			}
			if (method === "POST" && action === "cancel")
				return redirect(String(session.cancel_url ?? "/"));
			return html(
				`<main><h1>Test checkout (oracle fixture)</h1><p>No real payment.</p><form method="post" action="/checkout/${sid}/complete"><button type="submit">Pay (test fixture)</button></form><form method="post" action="/checkout/${sid}/cancel"><button type="submit">Cancel</button></form></main>`,
			);
		}
		const portal = this.portals.get(sid);
		if (!portal) return html("<p>Unknown portal session</p>");
		if (method === "POST" && action === "cancel") {
			for (const sub of this.activeSubscriptions(portal.customer as string))
				this.setCancelAtPeriodEnd(sub.id, true);
			return redirect(String(portal.return_url ?? "/"));
		}
		return html(
			`<main><h1>Billing portal (oracle fixture)</h1><form method="post" action="/portal/${sid}/cancel"><button type="submit">Cancel plan</button></form><a href="${String(portal.return_url ?? "/")}">Return</a></main>`,
		);
	}
}

/** Call-log parameters without emails or free text (the log is evidence, not data). */
function summarize(params: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(params)) {
		if (key === "email" || key === "customer_email" || key === "name") out[key] = "[omitted]";
		else out[key] = value;
	}
	return out;
}

export async function startStripe(options: StripeFixtureOptions = {}): Promise<StripeFixture> {
	return new StripeFixture(options).start();
}
