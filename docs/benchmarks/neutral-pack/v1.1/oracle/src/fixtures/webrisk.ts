// Web Risk Lookup API fixture: `uris.search` verdicts by destination path marker.
// https://cloud.google.com/web-risk/docs/reference/rest/v1/uris/search
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface WebRiskCall {
	at: string;
	method: string;
	uri: string | null;
	threatTypes: string[];
	apiKeyPresent: boolean;
	verdict: "clean" | "threat" | "slow" | "error" | "bad-request";
}

export interface WebRiskFixture {
	url: string;
	calls: WebRiskCall[];
	/** Delay of `/oracle/slow/` answers; longer than any adapter deadline by default. */
	slowMs: number;
	reset(): void;
	close(): Promise<void>;
}

function send(res: ServerResponse, status: number, body: unknown): void {
	const text = JSON.stringify(body);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(text),
	});
	res.end(text);
}

export async function startWebRisk(listen = "127.0.0.1:0"): Promise<WebRiskFixture> {
	const [host, port] = listen.split(":");
	const fixture: WebRiskFixture = {
		url: "",
		calls: [],
		slowMs: 30_000,
		reset() {
			fixture.calls.length = 0;
			fixture.slowMs = 30_000;
		},
		close: async () => {},
	};

	const handler = (req: IncomingMessage, res: ServerResponse) => {
		const url = new URL(req.url ?? "/", "http://fixture");
		if (url.pathname === "/__oracle/calls") return send(res, 200, { calls: fixture.calls });
		if (url.pathname === "/__oracle/health") return send(res, 200, { ok: true });
		if (url.pathname !== "/v1/uris:search") {
			return send(res, 404, { error: { code: 404, message: "not found", status: "NOT_FOUND" } });
		}
		const uri = url.searchParams.get("uri");
		const threatTypes = url.searchParams.getAll("threatTypes");
		const call: WebRiskCall = {
			at: new Date().toISOString(),
			method: req.method ?? "GET",
			uri,
			threatTypes,
			apiKeyPresent:
				url.searchParams.has("key") ||
				!!req.headers["x-goog-api-key"] ||
				!!req.headers.authorization,
			verdict: "clean",
		};
		fixture.calls.push(call);
		if (!uri || threatTypes.length === 0) {
			call.verdict = "bad-request";
			return send(res, 400, {
				error: {
					code: 400,
					message: "uri and threatTypes are required",
					status: "INVALID_ARGUMENT",
				},
			});
		}
		let path = "";
		try {
			path = new URL(uri).pathname;
		} catch {
			path = uri;
		}
		if (path.includes("/oracle/unsafe/")) {
			call.verdict = "threat";
			const type = threatTypes.includes("MALWARE") ? "MALWARE" : threatTypes[0];
			return send(res, 200, {
				threat: { threatTypes: [type], expireTime: new Date(Date.now() + 300_000).toISOString() },
			});
		}
		if (path.includes("/oracle/error/")) {
			call.verdict = "error";
			return send(res, 500, {
				error: { code: 500, message: "oracle fixture error", status: "INTERNAL" },
			});
		}
		if (path.includes("/oracle/slow/")) {
			call.verdict = "slow";
			const timer = setTimeout(() => send(res, 200, {}), fixture.slowMs);
			res.on("close", () => clearTimeout(timer));
			return;
		}
		return send(res, 200, {});
	};

	const server: Server = createServer(handler);
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(Number(port), host, () => resolve());
	});
	const address = server.address() as AddressInfo;
	fixture.url = `http://${host}:${address.port}`;
	fixture.close = () =>
		new Promise((resolve) => {
			server.closeAllConnections();
			server.close(() => resolve());
		});
	return fixture;
}
