// Usage: node scripts/check-health.mjs <build.json> <healthz URL> [timeout seconds]
// Polls the live /healthz until it reports ok with the commit and build time of <build.json>.
import { readFileSync } from "node:fs";

const [buildPath, url, timeoutArg = "120"] = process.argv.slice(2);
if (!buildPath || !url) {
	console.error("usage: check-health.mjs <build.json> <healthz URL> [timeout seconds]");
	process.exit(2);
}
const expected = JSON.parse(readFileSync(buildPath, "utf8"));
const deadline = performance.now() + Number(timeoutArg) * 1000;
let last = "no response yet";

while (performance.now() < deadline) {
	try {
		const response = await fetch(`${url}?t=${Date.now()}`, {
			headers: { "cache-control": "no-cache" },
			redirect: "manual",
		});
		const text = await response.text();
		last = `HTTP ${response.status} ${text.trim()}`;
		if (response.status === 200) {
			const body = JSON.parse(text);
			if (
				body.ok === true &&
				body.commit === expected.commit &&
				body.builtAt === expected.builtAt
			) {
				console.log(`healthz ok: ${url} -> ${text.trim()}`);
				process.exit(0);
			}
		}
	} catch (error) {
		last = String(error);
	}
	await new Promise((resolve) => setTimeout(resolve, 3000));
}
console.error(`healthz check failed after ${timeoutArg}s: expected ${JSON.stringify(expected)}`);
console.error(`last answer: ${last}`);
process.exit(1);
