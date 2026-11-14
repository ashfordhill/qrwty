// Copies stdin to stdout, replacing the Cloudflare token and account ID with placeholders
// and dropping trailing spaces (wrangler pads its tables).
// The values are read from the environment, so they never appear on a command line.
import { createInterface } from "node:readline";

const secrets = [
	[process.env.CLOUDFLARE_API_TOKEN, "<cloudflare-api-token>"],
	[process.env.CLOUDFLARE_ACCOUNT_ID, "<cloudflare-account-id>"],
].filter(([value]) => typeof value === "string" && value.length >= 8);

for await (const line of createInterface({
	input: process.stdin,
	crlfDelay: Number.POSITIVE_INFINITY,
})) {
	let text = line;
	for (const [value, label] of secrets) text = text.split(value).join(label);
	process.stdout.write(`${text.trimEnd()}\n`);
}
