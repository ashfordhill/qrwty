// Usage: node scripts/stage-assets.mjs [out dir, default .build/site]
// Builds the Worker's static assets (wrangler.toml [assets] directory) from two sources:
//   public/         the /versions/ pages, byte copies (S02)
//   ../../web/      the app (A5): web/index.html becomes /app/index.html (the Worker serves it at
//                   / and /app/*), web/assets/ becomes /assets/
// and checks the app on the way: no inline script or event handler, no external origin in any
// page, script or stylesheet, every /assets/ reference present, and every script parses.
// Writes nothing outside the out dir; reruns replace it.
import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const web = resolve(here, "../../web");
const out = resolve(here, process.argv[2] ?? ".build/site");
const problems = [];

function files(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : [path];
	});
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(here, "public"), out, { recursive: true });
if (existsSync(join(out, "app")) || existsSync(join(out, "assets")))
	problems.push("public/ must not hold app/ or assets/: they are the app's (web/)");
mkdirSync(join(out, "app"), { recursive: true });
cpSync(join(web, "index.html"), join(out, "app", "index.html"));
cpSync(join(web, "assets"), join(out, "assets"), { recursive: true });

const page = readFileSync(join(web, "index.html"), "utf8");
for (const match of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
	if (!/\bsrc=/.test(match[1] ?? "") || (match[2] ?? "").trim())
		problems.push("index.html: inline script");
}
if (/\son[a-z]+\s*=/i.test(page)) problems.push("index.html: inline event handler");
const references = [...page.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1] ?? "");
for (const ref of references) {
	if (/^(https?:)?\/\//i.test(ref)) problems.push(`index.html: external reference ${ref}`);
	else if (ref.startsWith("/assets/") && !existsSync(join(out, ref.split("?")[0] ?? "")))
		problems.push(`index.html: missing ${ref}`);
}
for (const path of files(join(web, "assets"))) {
	const name = relative(web, path);
	if (/\.(js|css)$/.test(path)) {
		const text = readFileSync(path, "utf8");
		// Origins in comments and SVG namespaces are not requests.
		const code = text
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/http:\/\/www\.w3\.org\/[^"'\s]+/g, "");
		if (/@import|url\((?!["']?\/assets\/|["']?\.\/|["']?fonts\/)/.test(code))
			problems.push(`${name}: an @import or url() outside /assets/`);
		if (/\bfetch\(\s*["'`]https?:/.test(code)) problems.push(`${name}: fetch to another origin`);
	}
	if (path.endsWith(".js")) {
		try {
			execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
		} catch (error) {
			problems.push(
				`${name}: ${
					String(error.stderr ?? error)
						.trim()
						.split("\n")[0]
				}`,
			);
		}
	}
}

if (problems.length) {
	console.error(`stage-assets: ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
	process.exit(1);
}
console.log(`stage-assets: ${files(out).length} files in ${relative(here, out)} (app from web/)`);
