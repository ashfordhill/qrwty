// The A09 destination corpus (acceptance-oracle.md, "A09 destination corpus").

export interface AcceptedCase {
	input: string;
	expected: string;
	note: string;
}

const LEN_PREFIX = "https://example.com/oracle/a09/len?p=";

/** A URL of exactly `bytes` UTF-8 bytes (ASCII only). */
export function paddedUrl(bytes: number): string {
	return LEN_PREFIX + "x".repeat(bytes - LEN_PREFIX.length);
}

export const ACCEPTED: AcceptedCase[] = [
	{ input: "https://example.com/oracle/a09/plain", expected: "", note: "unchanged" },
	{
		input: "https://example.com/oracle/a09/q?b=2&a=1&A=3",
		expected: "",
		note: "order and case kept",
	},
	{
		input: "https://example.com/oracle/a09/esc?x=%2F%20%E2%9C%93&y=a+b",
		expected: "",
		note: "escapes kept",
	},
	{ input: "https://example.com/oracle/a09/Case/Path", expected: "", note: "path case kept" },
	{ input: "https://example.com/oracle/a09/frag#section-2", expected: "", note: "fragment kept" },
	{
		input: "HTTPS://EXAMPLE.COM/oracle/a09/host-case",
		expected: "https://example.com/oracle/a09/host-case",
		note: "scheme and host lower-cased",
	},
	{
		input: "https://example.com:443/oracle/a09/default-port",
		expected: "https://example.com/oracle/a09/default-port",
		note: "default port removed",
	},
	{
		input: "https://münchen.example.com/oracle/a09/idn",
		expected: "https://xn--mnchen-3ya.example.com/oracle/a09/idn",
		note: "IDN to A-label",
	},
	{ input: "http://example.com/oracle/a09/http", expected: "", note: "http kept" },
	{ input: paddedUrl(8192), expected: "", note: "exactly 8,192 bytes" },
].map((c) => ({ ...c, expected: c.expected || c.input }));

/** Rejected inputs; `<origin>` is replaced by the arm's public origin. */
export function rejected(origin: string): string[] {
	return [
		"javascript:alert(1)",
		"data:text/html,hi",
		"ftp://example.com/x",
		"mailto:a@example.com",
		"https://user:pass@example.com/x",
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
		`${origin}/AbCdEfGhIj`,
		paddedUrl(8193),
	];
}

/** Reputation fixture path markers (acceptance-oracle.md, "Reputation fixture verdicts"). */
export const REPUTATION = {
	unsafe: "https://example.com/oracle/unsafe/page",
	slow: "https://example.com/oracle/slow/page",
	error: "https://example.com/oracle/error/page",
};

/** A clean synthetic destination unique to a row and index. */
export function destination(row: string, index: number | string, extra = ""): string {
	return `https://example.com/oracle/${row.toLowerCase()}/${index}${extra}`;
}
