// Destination validation and the only normalization the HTTP contract allows (http-contract §4):
// lower-case scheme and host, drop a default port, an international host to its A-label. The
// path, query and fragment are kept byte for byte, so the parser never re-serializes them (a WHATWG
// URL would resolve dot segments, re-encode characters and read numeric hosts as IPv4).
import { BlockList, isIPv6 } from "node:net";
import { domainToASCII } from "node:url";

export const MAX_DESTINATION_BYTES = 8192;

export type DestinationResult =
	| { ok: true; destination: string; host: string }
	| { ok: false; reason: string };

const DEFAULT_PORT: Record<string, string> = { http: "80", https: "443" };

/** IPv4 ranges that are not public unicast (RFC 6890 and its updates). */
const privateV4 = new BlockList();
for (const [net, prefix] of [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.0.2.0", 24],
	["192.88.99.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["198.51.100.0", 24],
	["203.0.113.0", 24],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
] as const)
	privateV4.addSubnet(net, prefix, "ipv4");

/** IPv6: only global unicast (2000::/3) is public, minus the special blocks inside it. */
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const specialV6 = new BlockList();
for (const [net, prefix] of [
	["2001::", 23], // IETF protocol assignments (Teredo, benchmarking, ORCHID, ...)
	["2001:db8::", 32], // documentation
	["2002::", 16], // 6to4: embeds an IPv4 address
	["3fff::", 20], // documentation (RFC 9637)
] as const)
	specialV6.addSubnet(net, prefix, "ipv6");

const DOTTED_QUAD =
	/^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/;
/** A label a WHATWG parser would read as part of an IPv4 address (decimal, octal or hex). */
const NUMERIC_LABEL = /^(0x[0-9a-f]*|[0-9]+)$/i;
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
/** Names that only resolve inside a network (contract §4, plus RFC 8375's home.arpa). */
const LOCAL_SUFFIXES = ["localhost", "local", "internal", "home.arpa"];

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

const fail = (reason: string): DestinationResult => ({ ok: false, reason });
/** A C0 control, DEL or a C1 control (U+0000–U+001F, U+007F–U+009F). */
const hasControl = (text: string) =>
	[...text].some((c) => {
		const code = c.charCodeAt(0);
		return code < 0x20 || (code >= 0x7f && code <= 0x9f);
	});
const isAscii = (text: string) => [...text].every((c) => c.charCodeAt(0) < 0x80);

/** A host name checked as DNS labels, or an IP literal; `undefined` when acceptable. */
function hostProblem(host: string, originHost: string): string | undefined {
	const name = host.endsWith(".") ? host.slice(0, -1) : host;
	if (name === "") return "the host is empty";
	const labels = name.split(".");
	const last = labels[labels.length - 1] ?? "";
	if (NUMERIC_LABEL.test(last)) {
		if (!DOTTED_QUAD.test(name)) return "an IP address must be four decimal numbers";
		if (privateV4.check(name, "ipv4")) return "the address is not public";
		return name === originHost ? "the destination is this service" : undefined;
	}
	if (name.length > 253 || labels.length < 2) return "the host must be a fully qualified name";
	if (!labels.every((label) => LABEL.test(label))) return "the host is not a valid name";
	for (const suffix of LOCAL_SUFFIXES)
		if (name === suffix || name.endsWith(`.${suffix}`)) return "the host is a local name";
	if (name === originHost) return "the destination is this service";
	return undefined;
}

/**
 * Validates `input` as a destination and returns it normalized, or why it is refused. `originHost`
 * is the public origin's host name: a destination there would loop.
 */
export function normalizeDestination(input: unknown, originHost: string): DestinationResult {
	if (typeof input !== "string") return fail("the destination must be a string");
	if (LONE_SURROGATE.test(input)) return fail("the destination is not valid Unicode");
	if (Buffer.byteLength(input, "utf8") > MAX_DESTINATION_BYTES)
		return fail(`the destination is longer than ${MAX_DESTINATION_BYTES} bytes`);
	// C0 controls, DEL and C1 controls anywhere: a literal CR, LF, tab or NUL included.
	if (hasControl(input)) return fail("the destination contains a control character");

	const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(input);
	if (!scheme?.[1]) return fail("the destination must be an absolute http or https URL");
	const protocol = scheme[1].toLowerCase();
	if (protocol !== "http" && protocol !== "https")
		return fail("only http and https destinations are allowed");
	const afterScheme = input.slice(scheme[0].length);
	if (!afterScheme.startsWith("//"))
		return fail("the destination must be an absolute http or https URL");
	const rest = afterScheme.slice(2);
	const end = rest.search(/[/?#]/);
	const authority = end === -1 ? rest : rest.slice(0, end);
	const remainder = end === -1 ? "" : rest.slice(end);

	if (authority.includes("@")) return fail("credentials are not allowed in a destination");
	let rawHost: string;
	let port: string | undefined;
	if (authority.startsWith("[")) {
		const close = authority.indexOf("]");
		if (close === -1) return fail("the host is not a valid IPv6 address");
		rawHost = authority.slice(0, close + 1);
		const after = authority.slice(close + 1);
		if (after !== "") {
			if (!after.startsWith(":")) return fail("the host is not a valid IPv6 address");
			port = after.slice(1);
		}
	} else {
		const colon = authority.lastIndexOf(":");
		rawHost = colon === -1 ? authority : authority.slice(0, colon);
		if (colon !== -1) port = authority.slice(colon + 1);
	}
	if (port !== undefined && (!/^[1-9][0-9]{0,4}$/.test(port) || Number(port) > 65535))
		return fail("the port must be a number from 1 to 65535");
	if (port === DEFAULT_PORT[protocol]) port = undefined;

	let host: string;
	if (rawHost.startsWith("[")) {
		const inner = rawHost.slice(1, -1).toLowerCase();
		if (!isIPv6(inner) || inner.includes("%")) return fail("the host is not a valid IPv6 address");
		if (!globalV6.check(inner, "ipv6") || specialV6.check(inner, "ipv6"))
			return fail("the address is not public");
		host = `[${inner}]`;
	} else {
		// ASCII hosts are only lower-cased; an international one becomes its A-label (UTS #46).
		host = isAscii(rawHost) ? rawHost.toLowerCase() : domainToASCII(rawHost);
		if (host === "") return fail("the host is not a valid name");
		const problem = hostProblem(host, originHost);
		if (problem) return fail(problem);
	}

	// The rest is kept exactly; it may hold only visible ASCII (percent-encode anything else).
	if (!/^[!-~]*$/.test(remainder))
		return fail(
			"the path, query and fragment may hold only visible ASCII; percent-encode the rest",
		);
	const destination = `${protocol}://${host}${port === undefined ? "" : `:${port}`}${remainder}`;
	if (Buffer.byteLength(destination, "utf8") > MAX_DESTINATION_BYTES)
		return fail(`the destination is longer than ${MAX_DESTINATION_BYTES} bytes`);
	return { ok: true, destination, host };
}
