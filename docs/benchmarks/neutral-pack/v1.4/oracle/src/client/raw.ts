// Byte-exact HTTP/1.1 over node:net (or node:tls). Never follows redirects; keeps raw headers.
import { connect as netConnect, type Socket } from "node:net";
import { performance } from "node:perf_hooks";
import { connect as tlsConnect } from "node:tls";

export interface RawTarget {
	host: string;
	port: number;
	tls: boolean;
	servername?: string;
}

export interface RawResponse {
	status: number;
	statusText: string;
	/** Header lines as received, in order, name case kept. */
	rawHeaders: [string, string][];
	/** Lower-cased header name to all values. */
	headers: Record<string, string[]>;
	body: Buffer;
	/** Monotonic milliseconds (performance.now) at send, first byte and end. */
	sentAt: number;
	firstByteAt: number;
	endedAt: number;
	/** Wall-clock milliseconds when the response head was complete. */
	headWallMs: number;
}

export function targetFromUrl(url: string): RawTarget {
	const u = new URL(url);
	const tls = u.protocol === "https:";
	return {
		host: u.hostname.replace(/^\[|\]$/g, ""),
		port: u.port ? Number(u.port) : tls ? 443 : 80,
		tls,
		servername: tls ? u.hostname : undefined,
	};
}

function open(target: RawTarget): Socket {
	return target.tls
		? tlsConnect({ host: target.host, port: target.port, servername: target.servername })
		: netConnect({ host: target.host, port: target.port });
}

/** A connection opened ahead of its request and held idle until `sendRaw` uses it (F06). */
export interface HeldConnection {
	socket: Socket;
	/** False once the peer closed it or it failed; `sendRaw` then opens a fresh connection. */
	open(): boolean;
}

/** Opens a connection and resolves once it is established; nothing is sent on it. */
export function openConnection(target: RawTarget, timeoutMs = 30_000): Promise<HeldConnection> {
	return new Promise((resolvePromise, reject) => {
		const socket = open(target);
		let alive = true;
		const timer = setTimeout(() => {
			socket.destroy();
			reject(new Error(`connect timeout after ${timeoutMs} ms`));
		}, timeoutMs);
		const down = () => {
			alive = false;
		};
		socket.on("end", down);
		socket.on("close", down);
		socket.on("error", (error) => {
			down();
			clearTimeout(timer);
			reject(error);
		});
		socket.once(target.tls ? "secureConnect" : "connect", () => {
			clearTimeout(timer);
			resolvePromise({ socket, open: () => alive && !socket.destroyed });
		});
	});
}

function parseHead(
	head: string,
): Omit<RawResponse, "body" | "sentAt" | "firstByteAt" | "endedAt" | "headWallMs"> {
	const lines = head.split("\r\n");
	const statusLine = lines.shift() ?? "";
	const match = /^HTTP\/1\.[01] (\d{3})(?: (.*))?$/.exec(statusLine);
	if (!match) throw new Error(`malformed status line: ${JSON.stringify(statusLine.slice(0, 80))}`);
	const rawHeaders: [string, string][] = [];
	const headers: Record<string, string[]> = {};
	for (const line of lines) {
		if (line === "") continue;
		const colon = line.indexOf(":");
		if (colon <= 0) throw new Error(`malformed header line: ${JSON.stringify(line.slice(0, 80))}`);
		const name = line.slice(0, colon);
		const value = line.slice(colon + 1).trim();
		rawHeaders.push([name, value]);
		const lower = name.toLowerCase();
		if (!headers[lower]) headers[lower] = [];
		headers[lower].push(value);
	}
	return { status: Number(match[1]), statusText: match[2] ?? "", rawHeaders, headers };
}

function decodeChunked(data: Buffer): Buffer {
	const parts: Buffer[] = [];
	let offset = 0;
	while (offset < data.length) {
		const lineEnd = data.indexOf("\r\n", offset);
		if (lineEnd < 0) break;
		const size = Number.parseInt(
			data.subarray(offset, lineEnd).toString("latin1").split(";")[0],
			16,
		);
		if (!Number.isFinite(size)) throw new Error("malformed chunk size");
		if (size === 0) break;
		parts.push(data.subarray(lineEnd + 2, lineEnd + 2 + size));
		offset = lineEnd + 2 + size + 2;
	}
	return Buffer.concat(parts);
}

/**
 * Sends `bytes` exactly as given on a fresh connection and reads one response.
 * `expectBody` is false for HEAD requests (the response has no body whatever its headers say).
 */
export function sendRaw(
	target: RawTarget,
	bytes: Buffer,
	options: { timeoutMs?: number; expectBody?: boolean; held?: HeldConnection } = {},
): Promise<RawResponse> {
	const timeoutMs = options.timeoutMs ?? 30_000;
	const expectBody = options.expectBody ?? true;
	return new Promise((resolvePromise, reject) => {
		const reuse = options.held?.open() ? options.held.socket : null;
		const socket = reuse ?? open(target);
		const chunks: Buffer[] = [];
		let size = 0;
		let sentAt = 0;
		let firstByteAt = 0;
		let headEnd = -1;
		let headWallMs = 0;
		let parsed: ReturnType<typeof parseHead> | null = null;
		let settled = false;

		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			socket.destroy();
			if (error) {
				reject(error);
				return;
			}
			try {
				const all = Buffer.concat(chunks, size);
				if (!parsed) {
					if (headEnd < 0) throw new Error("connection closed before a complete response head");
					parsed = parseHead(all.subarray(0, headEnd).toString("latin1"));
				}
				let body: Buffer = all.subarray(headEnd + 4);
				if (!expectBody || parsed.status === 204 || parsed.status === 304) body = Buffer.alloc(0);
				else if ((parsed.headers["transfer-encoding"] ?? []).some((v) => /chunked/i.test(v))) {
					body = decodeChunked(body);
				} else if (parsed.headers["content-length"]) {
					body = body.subarray(0, Number(parsed.headers["content-length"][0]));
				}
				resolvePromise({
					...parsed,
					body,
					sentAt,
					firstByteAt,
					endedAt: performance.now(),
					headWallMs,
				});
			} catch (parseError) {
				reject(parseError as Error);
			}
		};

		const timer = setTimeout(() => finish(new Error(`timeout after ${timeoutMs} ms`)), timeoutMs);

		const complete = (): boolean => {
			if (!parsed) return false;
			if (!expectBody || parsed.status === 204 || parsed.status === 304) return true;
			if ((parsed.status >= 100 && parsed.status < 200) || parsed.status === 204) return true;
			const length = parsed.headers["content-length"];
			if (length) return size - (headEnd + 4) >= Number(length[0]);
			const chunked = (parsed.headers["transfer-encoding"] ?? []).some((v) => /chunked/i.test(v));
			if (chunked) return Buffer.concat(chunks, size).includes("\r\n0\r\n\r\n", headEnd);
			return false;
		};

		if (reuse) {
			sentAt = performance.now();
			socket.write(bytes);
		} else {
			socket.once(target.tls ? "secureConnect" : "connect", () => {
				sentAt = performance.now();
				socket.write(bytes);
			});
		}
		socket.on("data", (chunk: Buffer) => {
			if (firstByteAt === 0) firstByteAt = performance.now();
			chunks.push(chunk);
			size += chunk.length;
			if (headEnd < 0) {
				const all = Buffer.concat(chunks, size);
				headEnd = all.indexOf("\r\n\r\n");
				if (headEnd >= 0) {
					headWallMs = Date.now();
					try {
						parsed = parseHead(all.subarray(0, headEnd).toString("latin1"));
					} catch (error) {
						finish(error as Error);
						return;
					}
				}
			}
			if (complete()) finish();
		});
		socket.on("end", () => finish());
		socket.on("close", () => finish());
		socket.on("error", (error) => finish(error));
	});
}

export interface BuildOptions {
	method: string;
	path: string;
	/** Ordered header list; sent exactly as given (no normalisation, no Host added). */
	headers: [string, string][];
	body?: Buffer | string;
}

/** Builds request bytes. Content-Length is added only when a body is given and none is set. */
export function buildRequest(options: BuildOptions): Buffer {
	const body =
		options.body === undefined
			? undefined
			: Buffer.isBuffer(options.body)
				? options.body
				: Buffer.from(options.body, "utf8");
	const headers = [...options.headers];
	if (body && !headers.some(([name]) => name.toLowerCase() === "content-length")) {
		headers.push(["Content-Length", String(body.length)]);
	}
	if (!headers.some(([name]) => name.toLowerCase() === "connection")) {
		headers.push(["Connection", "close"]);
	}
	const head = `${options.method} ${options.path} HTTP/1.1\r\n${headers
		.map(([name, value]) => `${name}: ${value}`)
		.join("\r\n")}\r\n\r\n`;
	return body ? Buffer.concat([Buffer.from(head, "latin1"), body]) : Buffer.from(head, "latin1");
}
