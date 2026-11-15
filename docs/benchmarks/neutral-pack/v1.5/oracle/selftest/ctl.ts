// Adapter command for the self-test double: node selftest/ctl.ts <control URL> <action> [k=v ...]
// Prints the double's JSON answer; exits non-zero on failure, like an arm's adapter command.
const [url, action, ...pairs] = process.argv.slice(2);
const args: Record<string, string> = { action };
for (const pair of pairs) {
	const eq = pair.indexOf("=");
	if (eq > 0) args[pair.slice(0, eq)] = pair.slice(eq + 1);
}
const response = await fetch(url, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(args),
});
const text = await response.text();
process.stdout.write(`${text}\n`);
process.exit(response.ok ? 0 : 1);
