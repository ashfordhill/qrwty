// Integration tests of the components that need a real dependency. Set
// ORACLE_IT_PUBSUB=<host:port of the Pub/Sub emulator> and ORACLE_IT_TOXIPROXY=<Toxiproxy API URL>;
// the browser test needs Chromium for Playwright 1.63.0.
import { randomUUID } from "node:crypto";
import { type AddressInfo, connect, createServer } from "node:net";
import { PubSub } from "@google-cloud/pubsub";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { BrowserDriver } from "../../src/browser/driver.ts";
import { decodeSvg } from "../../src/browser/qr.ts";
import { Toxiproxy } from "../../src/faults/toxiproxy.ts";
import { clickEvent } from "../../src/fixtures/clicks.ts";
import { PubSubCapture } from "../../src/observe/pubsub-capture.ts";

const PUBSUB = process.env.ORACLE_IT_PUBSUB;
const TOXIPROXY = process.env.ORACLE_IT_TOXIPROXY;

describe.skipIf(!PUBSUB)("Pub/Sub capture against the emulator", () => {
	it("captures, deduplicates and republishes messages on the arm's topic", async () => {
		const project = "oracle-it";
		const topicName = `oracle-it-${randomUUID()}`;
		const admin = new PubSub({ projectId: project, apiEndpoint: PUBSUB, emulatorMode: true });
		await admin.createTopic(topicName);
		const capture = await new PubSubCapture({
			emulatorHost: PUBSUB ?? "",
			project,
			topic: topicName,
		}).start();
		const event = clickEvent("lnk_it");
		await capture.publish(Buffer.from(JSON.stringify(event)));
		expect(await capture.waitFor(() => capture.messages.length === 1, 15_000)).toBe(true);
		await capture.republish(capture.messages);
		const older = await capture.publishOlder(capture.messages[0], 3_600_000);
		expect(await capture.waitFor(() => capture.messages.length === 3, 15_000)).toBe(true);
		const unique = capture.events();
		expect(unique.size).toBe(2);
		expect(unique.has(String(event.eventId))).toBe(true);
		expect(Date.parse(String(unique.get(older.eventId)?.json?.eventTime))).toBeLessThan(
			Date.parse(String(event.eventTime)),
		);
		expect(capture.messages[0].publishTimeMs).toBeGreaterThan(Date.now() - 60_000);
		await capture.stop();
		await admin.topic(topicName).delete();
		await admin.close();
	});
});

describe.skipIf(!TOXIPROXY)("Toxiproxy driver against the pinned server", () => {
	it("refuses, stalls, breaks and restores a TCP dependency", async () => {
		const echo = createServer((s) => {
			s.on("data", (d) => s.write(d));
			s.on("error", () => undefined);
		});
		await new Promise<void>((r) => echo.listen(0, "127.0.0.1", () => r()));
		const echoPort = (echo.address() as AddressInfo).port;
		const listenPort = await new Promise<number>((r) => {
			const s = createServer();
			s.listen(0, "127.0.0.1", () => {
				const port = (s.address() as AddressInfo).port;
				s.close(() => r(port));
			});
		});
		const toxi = new Toxiproxy(TOXIPROXY ?? "");
		expect(await toxi.version()).toBe("2.13.0");
		const name = `oracle-it-${randomUUID().slice(0, 8)}`;
		await toxi.createProxy(name, `127.0.0.1:${listenPort}`, `127.0.0.1:${echoPort}`);
		const roundTrip = () =>
			new Promise<string>((resolve) => {
				const socket = connect(listenPort, "127.0.0.1");
				const done = (v: string) => {
					socket.destroy();
					resolve(v);
				};
				socket.setTimeout(1_000, () => done("timeout"));
				socket.on("error", (e: NodeJS.ErrnoException) => done(e.code ?? "error"));
				socket.on("connect", () => socket.write("ping"));
				socket.on("data", (d) => done(d.toString()));
				socket.on("close", () => done("closed"));
			});
		expect(await roundTrip()).toBe("ping");
		await toxi.fault("refuse", [name]);
		expect(await roundTrip()).toBe("ECONNREFUSED");
		await toxi.restore([name]);
		await toxi.fault("stall", [name]);
		expect(await roundTrip()).toBe("timeout");
		await toxi.restore([name]);
		await toxi.fault("break", [name]);
		expect(["ECONNRESET", "closed"]).toContain(await roundTrip());
		await toxi.restore([name]);
		expect(await roundTrip()).toBe("ping");
		await toxi.deleteProxy(name);
		echo.close();
	});
});

describe("browser driver", () => {
	it("never fetches a destination and decodes a rasterized SVG", async () => {
		const driver = await BrowserDriver.launch(["localhost"]);
		try {
			const { context, opened } = await driver.context("http://localhost:9");
			const page = await context.newPage();
			await page.goto("https://example.com/oracle/it/never-fetched?x=1");
			expect(await page.textContent("p")).toBe("oracle destination stub");
			expect(opened.map((o) => o.url)).toEqual(["https://example.com/oracle/it/never-fetched?x=1"]);
			await context.close();
			const svg = await QRCode.toString("http://localhost:47100/AbCdEfGhIj", {
				type: "svg",
				margin: 4,
			});
			expect((await decodeSvg(driver.browser, svg, 300)).data).toBe(
				"http://localhost:47100/AbCdEfGhIj",
			);
		} finally {
			await driver.close();
		}
	});
});
