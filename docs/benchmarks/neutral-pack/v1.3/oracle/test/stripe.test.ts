import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FIXTURE_PRICE_ID, parseForm, StripeFixture } from "../src/fixtures/stripe.ts";
import {
	alterOneByte,
	sign,
	signThenAlterOneByte,
	signWrong,
} from "../src/fixtures/stripe-signer.ts";
import { httpServer } from "./helpers.ts";

const SECRET = "whsec_" + "unitTestSecretValue0001";
let fixture: StripeFixture;
let stripe: Stripe;

beforeAll(async () => {
	fixture = await new StripeFixture({ priceIds: ["price_unit_allowlisted"] }).start();
	const port = Number(new URL(fixture.url).port);
	stripe = new Stripe("sk_" + "test_unitTestKeyNotReal000000", {
		host: "127.0.0.1",
		port,
		protocol: "http",
		maxNetworkRetries: 0,
	});
});
afterAll(() => fixture.close());

describe("Stripe fixture with the official SDK", () => {
	it("creates customers, Checkout sessions and portal sessions", async () => {
		const customer = await stripe.customers.create({
			email: "oracle@example.invalid",
			metadata: { account: "a1" },
		});
		expect(customer.id).toMatch(/^cus_/);
		expect((await stripe.customers.retrieve(customer.id)).id).toBe(customer.id);
		const session = await stripe.checkout.sessions.create({
			mode: "subscription",
			customer: customer.id,
			line_items: [{ price: "price_unit_allowlisted", quantity: 1 }],
			success_url: "http://qrwty.localhost/billing?checkout=success",
			cancel_url: "http://qrwty.localhost/billing?checkout=cancelled",
		});
		expect(session.url).toBe(`${fixture.url}/checkout/${session.id}`);
		expect(fixture.callsTo("POST", "/v1/checkout/sessions").at(-1)?.params.line_items).toEqual([
			{ price: "price_unit_allowlisted", quantity: "1" },
		]);
		const portal = await stripe.billingPortal.sessions.create({
			customer: customer.id,
			return_url: "http://qrwty.localhost/billing",
		});
		expect(portal.url).toMatch(/\/portal\/bps_/);
		await expect(
			stripe.checkout.sessions.create({
				mode: "subscription",
				line_items: [{ price: "price_unknown", quantity: 1 }],
				success_url: "http://x",
			}),
		).rejects.toThrow(/No such price/);
	});

	it("completes Checkout into one active subscription with events, then follows the lifecycle", async () => {
		const customer = await stripe.customers.create({});
		const session = await stripe.checkout.sessions.create({
			mode: "subscription",
			customer: customer.id,
			line_items: [{ price: FIXTURE_PRICE_ID, quantity: 1 }],
			success_url: "http://x",
		});
		const { subscription, events } = fixture.completeCheckout(session.id);
		expect(events.map((e) => e.type)).toEqual([
			"checkout.session.completed",
			"customer.subscription.created",
			"invoice.paid",
		]);
		const listed = await stripe.subscriptions.list({ customer: customer.id });
		expect(listed.data.map((s) => s.id)).toEqual([subscription.id]);
		fixture.paymentFailed(subscription.id);
		expect((await stripe.subscriptions.retrieve(subscription.id)).status).toBe("past_due");
		await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
		fixture.advancePeriod(subscription.id);
		expect((await stripe.subscriptions.retrieve(subscription.id)).status).toBe("canceled");
		expect((await stripe.events.list({ type: "customer.subscription.deleted" })).data.length).toBe(
			1,
		);
		expect(() => fixture.completeCheckout(session.id)).toThrow(/complete/);
	});

	it("replays idempotent requests and refuses a reused key with other parameters", async () => {
		const a = await stripe.customers.create(
			{ email: "a@example.invalid" },
			{ idempotencyKey: "k-1" },
		);
		const b = await stripe.customers.create(
			{ email: "a@example.invalid" },
			{ idempotencyKey: "k-1" },
		);
		expect(b.id).toBe(a.id);
		await expect(
			stripe.customers.create({ email: "other@example.invalid" }, { idempotencyKey: "k-1" }),
		).rejects.toThrow(/same parameters/);
		expect(fixture.calls.filter((c) => c.replayed).length).toBeGreaterThanOrEqual(1);
	});

	it("refuses live keys, injects failures and can go down", async () => {
		const port = Number(new URL(fixture.url).port);
		const live = new Stripe(`sk_${"live"}_notARealKeyAtAll000000`, {
			host: "127.0.0.1",
			port,
			protocol: "http",
			maxNetworkRetries: 0,
		});
		await expect(live.customers.create({})).rejects.toThrow(/test-mode keys only/);
		fixture.failNext = 1;
		await expect(stripe.customers.create({})).rejects.toThrow(/injected failure/);
		fixture.down = true;
		await expect(stripe.customers.create({})).rejects.toThrow();
		fixture.down = false;
		expect((await stripe.customers.create({})).id).toMatch(/^cus_/);
	});

	it("parses Stripe's form encoding", () => {
		expect(
			parseForm(
				"line_items[0][price]=p&line_items[0][quantity]=1&expand[]=a&expand[]=b&metadata[k]=v",
			),
		).toEqual({
			line_items: [{ price: "p", quantity: "1" }],
			expand: ["a", "b"],
			metadata: { k: "v" },
		});
	});

	it("delivers signed events to a webhook endpoint", async () => {
		const received: { body: string; header: string }[] = [];
		const hook = await httpServer((req, res) => {
			let body = "";
			req.on("data", (d) => (body += d));
			req.on("end", () => {
				received.push({ body, header: String(req.headers["stripe-signature"]) });
				res.writeHead(200);
				res.end();
			});
		});
		const withHook = await new StripeFixture({
			webhook: { url: `${hook.url}/api/v1/billing/webhook`, secret: SECRET },
		}).start();
		const response = await withHook.deliver({ id: "evt_unit", object: "event", type: "ping" });
		expect(response.status).toBe(200);
		expect(() =>
			stripe.webhooks.constructEvent(received[0].body, received[0].header, SECRET),
		).not.toThrow();
		await withHook.close();
		await hook.close();
	});
});

describe("webhook signer against stripe.webhooks.constructEvent", () => {
	const payload = JSON.stringify({ id: "evt_123abc", object: "event", type: "customer.created" });
	it("produces signatures the official SDK accepts", () => {
		const { body, header } = sign(payload, SECRET);
		expect((stripe.webhooks.constructEvent(body, header, SECRET) as { id: string }).id).toBe(
			"evt_123abc",
		);
	});
	it("forgeries are rejected: wrong secret and one byte changed after signing", () => {
		const wrong = signWrong(payload);
		expect(() => stripe.webhooks.constructEvent(wrong.body, wrong.header, SECRET)).toThrow();
		const altered = signThenAlterOneByte(payload, SECRET);
		expect(() => stripe.webhooks.constructEvent(altered.body, altered.header, SECRET)).toThrow();
		const diff = [...altered.body].filter((b, i) => b !== Buffer.from(payload)[i]).length;
		expect(diff).toBe(1);
		expect(JSON.parse(alterOneByte(Buffer.from(payload)).body.toString()).id).not.toBe(
			"evt_123abc",
		);
	});
});
