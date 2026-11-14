import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export async function httpServer(
	handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<{ url: string; server: Server; close: () => Promise<void> }> {
	const server = createServer(handler);
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
	const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	return {
		url,
		server,
		close: () =>
			new Promise((r) => {
				server.closeAllConnections();
				server.close(() => r());
			}),
	};
}

export const EXAMPLE_ADAPTER = {
	schemaVersion: 1,
	arm: "b",
	commit: "0123abc",
	images: { redirect: `sha256:${"a".repeat(64)}` },
	publicEntry: { url: "http://127.0.0.1:47100", origin: "http://qrwty.localhost:47100" },
	edgeTokenEnv: "ORACLE_EDGE_TOKEN",
	services: {
		redirect: {
			roles: ["redirect"],
			replicas: [
				{ name: "redirect-1", url: "http://127.0.0.1:47111", container: "qrwtyb-redirect-1" },
			],
			health: "/healthz",
			readiness: "/readyz",
		},
	},
	workers: [{ name: "analytics-1", kind: "analytics" }],
	commands: {
		reset: { argv: ["./oracle/reset.sh"] },
		clock: { argv: ["./oracle/clock.sh", "{offsetMs}"], timeoutMs: 10000 },
	},
	toxiproxy: {
		apiUrl: "http://127.0.0.1:47174",
		proxies: { postgres: ["qrwtyb-pg"], "pubsub.publish": ["qrwtyb-pubsub-pub"] },
	},
	pubsub: { emulatorHost: "127.0.0.1:47185", project: "qrwtyb-local", topic: "click-events" },
};
