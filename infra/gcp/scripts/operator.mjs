#!/usr/bin/env node
// QRWTY arm A's operator CLI (A6, Q09): look up, block and unblock a short link on qrwty.io.
//
//   node infra/gcp/scripts/operator.mjs show    <slug or short URL>
//   node infra/gcp/scripts/operator.mjs block   <slug or short URL> --reason "<why>"
//   node infra/gcp/scripts/operator.mjs unblock <slug or short URL> --reason "<why>"
//
// Options: --actor <name> (default: the gcloud account), --origin <url> (default https://qrwty.io).
// A block answers 403 (the safety page) on every replica within 30 s (the Redirect service keeps a
// route at most 30 s past its read); an unblock returns the link to its state before the block.
//
// Each request is signed with the operator key, Secret Manager's qrwtya-operator-key, which only
// the project's owners and Link API can read: gcloud reads it into this process's memory; it is
// never printed, written or passed as an argument. Link API checks the signature (method, path,
// time within 120 s, a one-time nonce, the actor and the reason; app/src/modules/link-api/
// abuse-and-moderation/operator.ts) and records the actor (`cli:<actor>`), the reason and the time
// with the change. Without the key, or to anyone else, the operator routes answer 404.
import { execFileSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";

const PROJECT = "project-f46f6d6a-8e74-42a0-ab1";
const SECRET = "qrwtya-operator-key";

function usage(message) {
	if (message) console.error(`operator.mjs: ${message}`);
	console.error(
		"usage: operator.mjs show|block|unblock <slug or short URL> [--reason <why>] [--actor <name>] [--origin <url>]",
	);
	process.exit(2);
}

const [command, target, ...rest] = process.argv.slice(2);
if (!["show", "block", "unblock"].includes(command ?? "") || !target) usage();
const options = {};
for (let i = 0; i < rest.length; i += 2) {
	const name = rest[i];
	const value = rest[i + 1];
	if (!["--reason", "--actor", "--origin"].includes(name) || value === undefined)
		usage(`unknown option ${name}`);
	options[name.slice(2)] = value;
}
if (command !== "show" && !options.reason?.trim()) usage(`${command} needs --reason`);

const origin = new URL(options.origin ?? "https://qrwty.io").origin;
let slug = target;
if (!/^[0-9A-Za-z]{10}$/.test(slug)) {
	try {
		slug = new URL(target).pathname.slice(1);
	} catch {
		usage("the link must be a slug or a short URL");
	}
}
if (!/^[0-9A-Za-z]{10}$/.test(slug)) usage("the link must be a slug or a short URL");

const gcloud = (args) => execFileSync("gcloud", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const actor =
	options.actor ?? gcloud(["config", "get-value", "account", "--quiet"]).trim().slice(0, 200);
if (!/^[!-~]{1,200}$/.test(actor)) usage("the actor must be 1 to 200 visible ASCII characters");
const key = Buffer.from(
	gcloud(["secrets", "versions", "access", "latest", `--secret=${SECRET}`, `--project=${PROJECT}`]).trim(),
	"utf8",
);

/** One signed request to /api/v1/operator<path>. */
async function call(method, path, reason) {
	const time = String(Math.floor(Date.now() / 1000));
	const nonce = randomBytes(18).toString("base64url");
	const payload = ["qrwty-operator-v1", method, path, time, nonce, actor, reason ?? ""].join("\n");
	const signature = createHmac("sha256", key).update(payload).digest("base64url");
	const response = await fetch(`${origin}/api/v1/operator${path}`, {
		method,
		headers: {
			accept: "application/json",
			"qrwty-operator-actor": actor,
			"qrwty-operator-time": time,
			"qrwty-operator-nonce": nonce,
			"qrwty-operator-signature": signature,
			...(reason === undefined ? {} : { "content-type": "application/json" }),
		},
		...(reason === undefined ? {} : { body: JSON.stringify({ reason }) }),
		redirect: "manual",
	});
	const text = await response.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		body = text.slice(0, 200);
	}
	return { status: response.status, body };
}

const found = await call("GET", `/links/by-slug/${slug}`);
if (found.status !== 200 || command === "show") {
	console.log(JSON.stringify(found, null, 1));
	process.exit(found.status === 200 ? 0 : 1);
}
const done = await call("POST", `/links/${found.body.id}/${command}`, options.reason);
console.log(JSON.stringify({ at: new Date().toISOString(), ...done }, null, 1));
process.exit(done.status === 200 ? 0 : 1);
