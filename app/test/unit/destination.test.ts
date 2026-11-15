import { describe, expect, it } from "vitest";
import {
	MAX_DESTINATION_BYTES,
	normalizeDestination,
} from "../../src/modules/link-api/link-operations/destination.ts";

const ORIGIN_HOST = "qrwty.io";
const LEN_PREFIX = "https://example.com/oracle/a09/len?p=";
const padded = (bytes: number) => LEN_PREFIX + "x".repeat(bytes - LEN_PREFIX.length);

// The pack's A09 corpus (acceptance-oracle.md, "A09 destination corpus"), input → expected.
const ACCEPTED: [string, string][] = [
	["https://example.com/oracle/a09/plain", "https://example.com/oracle/a09/plain"],
	["https://example.com/oracle/a09/q?b=2&a=1&A=3", "https://example.com/oracle/a09/q?b=2&a=1&A=3"],
	[
		"https://example.com/oracle/a09/esc?x=%2F%20%E2%9C%93&y=a+b",
		"https://example.com/oracle/a09/esc?x=%2F%20%E2%9C%93&y=a+b",
	],
	["https://example.com/oracle/a09/Case/Path", "https://example.com/oracle/a09/Case/Path"],
	[
		"https://example.com/oracle/a09/frag#section-2",
		"https://example.com/oracle/a09/frag#section-2",
	],
	["HTTPS://EXAMPLE.COM/oracle/a09/host-case", "https://example.com/oracle/a09/host-case"],
	[
		"https://example.com:443/oracle/a09/default-port",
		"https://example.com/oracle/a09/default-port",
	],
	[
		"https://münchen.example.com/oracle/a09/idn",
		"https://xn--mnchen-3ya.example.com/oracle/a09/idn",
	],
	["http://example.com/oracle/a09/http", "http://example.com/oracle/a09/http"],
	[padded(8192), padded(8192)],
];

const REJECTED = [
	"javascript:alert(1)",
	"data:text/html,hi",
	"ftp://example.com/x",
	"mailto:a@example.com",
	// Built at run time so no credential-shaped literal sits in the source.
	["https://user", "pass@example.com/x"].join(":"),
	"https://user@example.com/x",
	"https://example.com/oracle/a09/cr\r\nx",
	"https://example.com/oracle/a09/tab\tx",
	"https://example.com/oracle/a09/nul\u0000x",
	"https://exa mple.com/",
	"https://example.com:0/",
	"https://example.com:65536/",
	"https:///nohost",
	"/relative",
	"example.com/no-scheme",
	"http://127.0.0.1/",
	"http://10.1.2.3/",
	"http://172.16.0.1/",
	"http://192.168.1.1/",
	"http://169.254.169.254/latest",
	"http://0.0.0.0/",
	"http://2130706433/",
	"http://0x7f000001/",
	"http://[::1]/",
	"http://[fc00::1]/",
	"http://[fe80::1]/",
	"http://localhost/",
	"http://foo.localhost/",
	"http://printer.local/",
	"http://db.internal/",
	"http://intranet/",
	"https://qrwty.io/AbCdEfGhIj",
	padded(8193),
];

describe("the A09 destination corpus", () => {
	it.each(ACCEPTED)("accepts %s", (input, expected) => {
		expect(normalizeDestination(input, ORIGIN_HOST)).toMatchObject({
			ok: true,
			destination: expected,
		});
	});
	it.each(REJECTED.map((input, i) => [i + 1, input]))(
		"rejects corpus entry %i",
		(_label, input) => {
			const result = normalizeDestination(input, ORIGIN_HOST);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason.length).toBeGreaterThan(0);
		},
	);
	it("checks the length of exactly the bound", () => {
		expect(Buffer.byteLength(padded(8192))).toBe(MAX_DESTINATION_BYTES);
	});
});

describe("beyond the corpus", () => {
	it.each([
		["https://Example.COM:8443/A?B#C", "https://example.com:8443/A?B#C"],
		["http://example.com:80", "http://example.com"],
		["https://example.com?x=1", "https://example.com?x=1"],
		["https://example.com/a/../b/./c", "https://example.com/a/../b/./c"],
		["https://example.com/%zz", "https://example.com/%zz"],
		["https://8.8.8.8/dns", "https://8.8.8.8/dns"],
		["https://[2001:4860:4860::8888]/", "https://[2001:4860:4860::8888]/"],
		["https://example.com./trailing-dot", "https://example.com./trailing-dot"],
		["https://ＥＸＡＭＰＬＥ.com/fullwidth", "https://example.com/fullwidth"],
	])("keeps %s as %s", (input, expected) => {
		expect(normalizeDestination(input, ORIGIN_HOST)).toMatchObject({
			ok: true,
			destination: expected,
		});
	});
	it.each([
		"https://example.com\\@evil.example/", // a WHATWG parser reads the backslash as a slash
		"https://ex%61mple.com/", // a percent-encoded host
		"https://example.com:/", // an empty port
		"https://example.com:08080/", // a port with a leading zero
		"http://127.1/", // a short IPv4 form
		"http://0177.0.0.1/", // octal IPv4
		"http://[::ffff:127.0.0.1]/", // IPv4-mapped loopback
		"http://[64:ff9b::7f00:1]/", // NAT64 of loopback
		"http://[2001:db8::1]/", // documentation
		"http://[fe80::1%25eth0]/", // a zone ID
		"http://100.64.0.1/", // shared address space
		"http://224.0.0.1/", // multicast
		"http://192.0.2.10/", // documentation
		"https://localhost./", // localhost with a trailing dot
		"https://qrwty.io./loop", // the origin with a trailing dot
		"https://QRWTY.IO/loop", // the origin in capitals
		"https://router.home.arpa/",
		"https://example.com/a b", // a space in the path
		"https://example.com/ü", // non-ASCII in the path
		"https://example.com/\u0085", // a C1 control
		"https://example.com/\u007f", // DEL
		"https://-bad.example.com/",
		"https://１２７.０.０.１/", // full-width digits map to 127.0.0.1
		"https:example.com", // no authority
		"",
	])("rejects %j", (input) => {
		expect(normalizeDestination(input, ORIGIN_HOST).ok).toBe(false);
	});
	it("rejects anything but a string", () => {
		for (const input of [undefined, null, 42, {}, ["https://example.com"]])
			expect(normalizeDestination(input, ORIGIN_HOST).ok).toBe(false);
	});
	it("rejects a lone surrogate", () => {
		expect(normalizeDestination("https://example.com/\ud800", ORIGIN_HOST).ok).toBe(false);
	});
});
