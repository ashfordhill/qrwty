// Capture reverse proxy: sits in front of the arm's public entry and records every request and
// response with monotonic timestamps (performance.now in the oracle process), independently of
// the code that sends the traffic. Cookies, authorization and edge tokens are never recorded.
import { createServer, request as httpRequest, type IncomingMessage, type Server } from "node:http";
import { request as httpsRequest } from "node:https";
import type { AddressInfo } from "node:net";
import { performance } from "node:perf_hooks";
import { redactHeaders, redactText } from "../redact.ts";

export interface CaptureEntry {
	seq: number;
	method: string;
	path: string;
	requestHeaders: Record<string, string>;
	status: number | null;
	responseHeaders: Record<string, string>;
	location: string | null;
	clickEvent: string | null;
	bodyBytes: number;
	startMono: number;
	headMono: number | null;
	endMono: number | null;
	startWallMs: number;
	headWallMs: number | null;
	upstreamError: string | null;
	/** Free-form tag from the `X-Oracle-Tag` request header (dropped before forwarding). */
	tag: string | null;
}

export class CaptureProxy {
	readonly entries: CaptureEntry[] = [];
	url = "";
	private server: Server | null = null;
	private seq = 0;

	readonly upstream: string;

	constructor(upstream: string) {
		this.upstream = upstream;
	}

	async start(listen = "127.0.0.1:0"): Promise<this> {
		const [host, port] = listen.split(":");
		this.server = createServer((req, res) => this.forward(req, res));
		await new Promise<void>((resolve, reject) => {
			this.server?.once("error", reject);
			this.server?.listen(Number(port), host, () => resolve());
		});
		this.url = `http://${host}:${(this.server.address() as AddressInfo).port}`;
		return this;
	}

	close(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.server) return resolve();
			this.server.closeAllConnections();
			this.server.close(() => resolve());
		});
	}

	private forward(req: IncomingMessage, res: import("node:http").ServerResponse): void {
		const target = new URL(this.upstream);
		const tag = (req.headers["x-oracle-tag"] as string | undefined) ?? null;
		const headers = { ...req.headers };
		delete headers["x-oracle-tag"];
		const entry: CaptureEntry = {
			seq: ++this.seq,
			method: req.method ?? "GET",
			path: redactText(req.url ?? "/"),
			requestHeaders: redactHeaders(headers),
			status: null,
			responseHeaders: {},
			location: null,
			clickEvent: null,
			bodyBytes: 0,
			startMono: performance.now(),
			headMono: null,
			endMono: null,
			startWallMs: Date.now(),
			headWallMs: null,
			upstreamError: null,
			tag,
		};
		this.entries.push(entry);
		const send = target.protocol === "https:" ? httpsRequest : httpRequest;
		const upstream = send(
			{
				host: target.hostname,
				port: target.port || (target.protocol === "https:" ? 443 : 80),
				method: req.method,
				path: req.url,
				headers,
				agent: false,
				setHost: false,
			},
			(up) => {
				entry.headMono = performance.now();
				entry.headWallMs = Date.now();
				entry.status = up.statusCode ?? null;
				entry.responseHeaders = redactHeaders(up.headers);
				entry.location = (up.headers.location as string | undefined) ?? null;
				entry.clickEvent = (up.headers["qrwty-click-event"] as string | undefined) ?? null;
				res.writeHead(up.statusCode ?? 502, up.rawHeaders);
				up.on("data", (chunk: Buffer) => {
					entry.bodyBytes += chunk.length;
					res.write(chunk);
				});
				up.on("end", () => {
					entry.endMono = performance.now();
					res.end();
				});
				up.on("error", (error) => {
					entry.upstreamError = error.message;
					entry.endMono = performance.now();
					res.destroy();
				});
			},
		);
		upstream.on("error", (error) => {
			entry.upstreamError = error.message;
			entry.endMono = performance.now();
			if (!res.headersSent) {
				res.writeHead(502, { "Content-Type": "text/plain", "X-Oracle-Proxy": "upstream-error" });
				res.end("upstream error");
			} else {
				res.destroy();
			}
		});
		req.pipe(upstream);
	}

	/** Entries for the slug path `/{slug}` (query ignored). */
	forSlug(slug: string): CaptureEntry[] {
		return this.entries.filter((e) => e.path.split("?")[0] === `/${slug}`);
	}
}
