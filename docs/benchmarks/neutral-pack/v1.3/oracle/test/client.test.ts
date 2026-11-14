import { type AddressInfo, createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { Client, CookieJar } from "../src/client/client.ts";
import { buildRequest, sendRaw, targetFromUrl } from "../src/client/raw.ts";
import { parseLoginForm } from "../src/client/session.ts";
import { httpServer } from "./helpers.ts";

/** A TCP server that records the exact request bytes and answers with `reply`. */
async function rawServer(reply: string) {
	const received: Buffer[] = [];
	const server = createServer((socket) => {
		socket.on("data", (d) => {
			received.push(d);
			if (Buffer.concat(received).includes("\r\n\r\n")) socket.end(reply);
		});
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
	return { port: (server.address() as AddressInfo).port, received, close: () => server.close() };
}

describe("raw HTTP client", () => {
	it("sends exactly the given bytes, including CR LF injection and a spoofed Host", async () => {
		const srv = await rawServer("HTTP/1.1 204 No Content\r\nX-Raw: kept  \r\n\r\n");
		const bytes = buildRequest({
			method: "GET",
			path: "/a%0D%0Ab",
			headers: [
				["Host", "evil.example"],
				["X-Split", "1\r\nX-Injected: 2"],
			],
		});
		const r = await sendRaw({ host: "127.0.0.1", port: srv.port, tls: false }, bytes);
		expect(Buffer.concat(srv.received).equals(bytes)).toBe(true);
		expect(bytes.toString("latin1")).toContain(
			"Host: evil.example\r\nX-Split: 1\r\nX-Injected: 2\r\n",
		);
		expect(r.status).toBe(204);
		expect(r.rawHeaders).toEqual([["X-Raw", "kept"]]);
		srv.close();
	});

	it("never follows redirects, decodes chunked bodies and reads no body for HEAD", async () => {
		const srv = await httpServer((req, res) => {
			if (req.url === "/r") {
				res.writeHead(302, { Location: "https://example.com/x?b=2&a=1" });
				return res.end("moved");
			}
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.write("chunk-1;");
			res.end("chunk-2");
		});
		const client = new Client(srv.url, "http://qrwty.localhost:1");
		const redirect = await client.request("GET", "/r");
		expect(redirect.status).toBe(302);
		expect(redirect.header("location")).toBe("https://example.com/x?b=2&a=1");
		const chunked = await client.request("GET", "/c");
		expect(chunked.text).toBe("chunk-1;chunk-2");
		const head = await client.request("HEAD", "/r");
		expect(head.status).toBe(302);
		expect(head.body.length).toBe(0);
		await srv.close();
	});

	it("sends Host = public origin, edge headers only with a token, and keeps cookies", async () => {
		const seen: Record<string, string | string[] | undefined>[] = [];
		const srv = await httpServer((req, res) => {
			seen.push(req.headers);
			res.writeHead(200, { "Set-Cookie": "sid=abc; Path=/; HttpOnly" });
			res.end("{}");
		});
		const client = new Client(srv.url, "http://qrwty.localhost:47100");
		await client.request("GET", "/", { edge: { clientIp: "203.0.113.9" } });
		await client.request("GET", "/", {
			edge: { token: "t0k", clientIp: "203.0.113.9", synthetic: "probe-1" },
		});
		expect(seen[0].host).toBe("qrwty.localhost:47100");
		expect(seen[0]["x-oracle-client-ip"]).toBeUndefined();
		expect(seen[1]["x-oracle-edge-token"]).toBe("t0k");
		expect(seen[1]["qrwty-synthetic"]).toBe("probe-1");
		expect(seen[1].cookie).toBe("sid=abc");
		await srv.close();
	});

	it("targets https URLs with TLS and the default port", () => {
		expect(targetFromUrl("https://qrwty.io/x")).toEqual({
			host: "qrwty.io",
			port: 443,
			tls: true,
			servername: "qrwty.io",
		});
	});
});

describe("cookie jar", () => {
	it("stores, replaces and expires cookies", () => {
		const jar = new CookieJar();
		jar.store(["a=1; Path=/", "b=2; HttpOnly"]);
		jar.store(["a=3", "b=; Max-Age=0"]);
		expect(jar.header()).toBe("a=3");
	});
});

describe("login form parser", () => {
	it("finds a Keycloak-style form with hidden fields and decoded action", () => {
		const html = `<form id="kc-form-login" action="/realms/qrwty/login-actions/authenticate?session_code=x&amp;tab_id=y" method="post">
      <input type="hidden" name="credentialId" value="">
      <input tabindex="1" id="username" name="username" type="text">
      <input tabindex="2" id="password" name="password" type="password">
      <input type="submit" name="login" value="Sign In"></form>`;
		const form = parseLoginForm(
			html,
			"http://issuer:8080/realms/qrwty/protocol/openid-connect/auth?x=1",
		);
		expect(form).toEqual({
			action: "http://issuer:8080/realms/qrwty/login-actions/authenticate?session_code=x&tab_id=y",
			hidden: { credentialId: "" },
			userField: "username",
			passwordField: "password",
		});
		expect(parseLoginForm("<form><input name=q></form>", "http://x/")).toBeNull();
	});
});
