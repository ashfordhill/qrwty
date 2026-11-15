#!/usr/bin/env bash
# Redeploy arm A behind https://qrwty.io (A2; A3-A7 run it after each feature).
#
#   infra/gcp/scripts/redeploy.sh <release> [--allow-dirty]
#
# <release> is a commit (SHA, tag or branch) whose app/ is built. The Worker is deployed from the
# working tree, which deploy/cloudflare/deploy.sh refuses when dirty unless --allow-dirty.
#
# 1. Image: `git archive <release> app` into a temporary directory, `docker build --target app`,
#    tag qrwtya-images/app:app-<first 12 of app/'s git tree hash>, push it and read its digest.
#    A tag already in Artifact Registry is reused, so a release that leaves app/ alone rolls
#    nothing.
# 2. Migrations: a saved plan of the migration job alone with the new digest, applied; then
#    `gcloud run jobs execute qrwtya-migrate --wait` (migrate.mjs holds a lock and skips what is
#    applied).
# 3. Services: a saved plan of the whole stack with the new digest, refused if it would destroy or
#    replace anything, then applied. Cloud Run moves traffic to each new revision once its startup
#    probe passes.
# 4. Worker: deploy/cloudflare/deploy.sh (the qrwty-edge Worker; it checks /build.json).
# 5. Smoke: https://qrwty.io/healthz is a ready Session API, /versions/ answers 200, and /api/* and
#    /auth/* are answered by Session API (501 until its stubs are written), not by the Worker.
#
# Idempotent: the same release reuses its image, both plans then have no changes, the
# migrations find nothing to do and the Worker uploads the same code.
#
# Needs: git, docker (with docker-credential-gcloud), gcloud signed in with Application Default
# Credentials, node 22+, pnpm, OpenTofu 1.13.2 and the google 8.8.1 mirror (scripts/tf.sh), and
# ~/.config/qrwty/auth0.env and cloudflare.env (read by tf.sh and deploy.sh; never printed).
# Plans and logs go to $QRWTY_REDEPLOY_DIR (default: a new temporary directory, kept).
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d; s/^# \{0,1\}//'; }
die() { echo "redeploy.sh: $*" >&2; exit 1; }
step() { printf '\n== %s (%s)\n' "$*" "$(date -u +%H:%M:%SZ)"; }

release="" allow_dirty=()
for arg in "$@"; do
	case "$arg" in
	--allow-dirty) allow_dirty=(--allow-dirty) ;;
	-h | --help) usage; exit 0 ;;
	-*) die "unknown option: $arg (see --help)" ;;
	*) [ -z "$release" ] || die "one release only"; release="$arg" ;;
	esac
done
[ -n "$release" ] || { usage >&2; exit 2; }

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../../.." && pwd)"
project=project-f46f6d6a-8e74-42a0-ab1
region=us-central1
registry="$region-docker.pkg.dev/$project/qrwtya-images/app"
site=https://qrwty.io

sha="$(git -C "$repo" rev-parse --verify "$release^{commit}")" || die "no commit $release"
tree="$(git -C "$repo" rev-parse --verify "$sha:app")" || die "$release has no app/"
tag="app-${tree:0:12}" # the image is named by app/'s content, so a release that leaves app/ alone reuses it
dir="${QRWTY_REDEPLOY_DIR:-$(mktemp -d -t qrwtya-redeploy-XXXXXX)}"
mkdir -p "$dir"
dir="$(cd "$dir" && pwd)"
export QRWTY_TF_WORK="$dir/tf"
tf() { "$here/tf.sh" "$@"; }
echo "release $sha; logs and plans in $dir"

# 1. Build and push, once per app/ tree: a tag already in Artifact Registry is reused, since a
#    rebuild of the same files gets a new digest (the image records its build time).
step "image $tag (app/ at ${sha:0:12})"
digest="$(gcloud artifacts docker images describe "$registry:$tag" --project="$project" \
	--format='value(image_summary.digest)' 2>/dev/null || true)"
if [ -n "$digest" ]; then
	echo "reusing $registry:$tag"
else
	rm -rf "$dir/src"
	mkdir -p "$dir/src"
	git -C "$repo" archive "$sha" app | tar -x -C "$dir/src"
	docker build --target app -t "$registry:$tag" "$dir/src/app" >"$dir/build.log" 2>&1 ||
		{ tail -30 "$dir/build.log" >&2; die "docker build failed (log: $dir/build.log)"; }
	mkdir -p "$dir/docker"
	printf '{"credHelpers":{"%s-docker.pkg.dev":"gcloud"}}\n' "$region" >"$dir/docker/config.json"
	DOCKER_CONFIG="$dir/docker" docker push "$registry:$tag" >"$dir/push.log" 2>&1 ||
		{ tail -20 "$dir/push.log" >&2; die "docker push failed (log: $dir/push.log)"; }
	digest="$(grep -oE 'digest: sha256:[0-9a-f]{64}' "$dir/push.log" | tail -1 | cut -d' ' -f2)"
fi
[[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || die "no image digest for $registry:$tag"
export TF_VAR_image="$registry@$digest"
echo "image $TF_VAR_image"

# plan <name> [tofu plan arguments]: a saved plan, refused if it destroys or replaces anything.
plan() {
	local name="$1"
	shift
	tf plan -input=false -no-color -out="$name.tfplan" "$@" >"$dir/$name.txt" 2>&1 ||
		{ tail -40 "$dir/$name.txt" >&2; die "plan $name failed (log: $dir/$name.txt)"; }
	grep -E '^(Plan:|No changes)' "$dir/$name.txt" || true
	tf show -json "$name.tfplan" >"$dir/$name.json"
	python3 -I -c '
import json, sys
plan = json.load(open(sys.argv[1]))
bad = [c["address"] for c in plan.get("resource_changes", []) if "delete" in c["change"]["actions"]]
if bad:
    sys.exit("refused: the plan would destroy or replace " + ", ".join(bad))
' "$dir/$name.json" || die "plan $name refused; nothing applied"
	tf apply -input=false -no-color "$name.tfplan" >"$dir/$name.apply.txt" 2>&1 ||
		{ tail -40 "$dir/$name.apply.txt" >&2; die "apply $name failed (log: $dir/$name.apply.txt)"; }
	grep -E '^Apply complete' "$dir/$name.apply.txt" || true
}

# 2. Migrations.
step "migration job"
plan migrate -target=google_cloud_run_v2_job.migrate
gcloud run jobs execute qrwtya-migrate --project="$project" --region="$region" --wait \
	--format='value(metadata.name)' >"$dir/migrate.txt" 2>&1 ||
	{ cat "$dir/migrate.txt" >&2; die "the migration job failed (gcloud run jobs executions list --job=qrwtya-migrate)"; }
echo "execution $(tail -1 "$dir/migrate.txt")"

# 3. Services, worker pool and everything else.
step "services"
plan stack
tf output -json service_urls >"$dir/service-urls.json"

# 4. The qrwty-edge Worker.
step "worker"
"$repo/deploy/cloudflare/deploy.sh" "${allow_dirty[@]}" >"$dir/worker.txt" 2>&1 ||
	{ tail -20 "$dir/worker.txt" >&2; die "the Worker deploy failed (log: $dir/worker.txt)"; }
grep -E '^(build|Current Version ID|Deployed|build ok)' "$dir/worker.txt" || true

# 5. Smoke.
step "smoke $site"
node --input-type=module - "$site" <<'EOF'
const site = process.argv[2];
const problems = [];
const get = async (path, init = {}) => {
	const response = await fetch(`${site}${path}`, { redirect: "manual", ...init });
	return { status: response.status, type: response.headers.get("content-type") ?? "", text: await response.text() };
};
// A cold Session API (minimum 0 instances) can take a few seconds to start.
let health;
for (let attempt = 0; attempt < 20; attempt += 1) {
	health = await get("/healthz");
	if (health.status === 200) break;
	await new Promise((resolve) => setTimeout(resolve, 3000));
}
let body = {};
try {
	body = JSON.parse(health.text);
} catch {}
const ready = health.status === 200 && body.service === "session-api" && body.application === "ready";
const line = (text) => text.replace(/\s+/g, " ").trim().slice(0, 160);
console.log(`${ready ? "PASS" : "FAIL"}  GET /healthz -> ${health.status} ${line(health.text)}`);
if (!ready) problems.push("healthz");
const versions = await get("/versions/");
console.log(`${versions.status === 200 ? "PASS" : "FAIL"}  GET /versions/ -> ${versions.status} ${versions.type}`);
if (versions.status !== 200) problems.push("versions");
// Session API answers JSON; the Worker's own 404 is HTML, and 502-504 mean it wasn't reached.
for (const [method, path] of [["POST", "/api/v1/links"], ["GET", "/auth/login"]]) {
	const init = method === "POST" ? { method, headers: { "content-type": "application/json" }, body: "{}" } : { method };
	const answer = await get(path, init);
	const reached = answer.type.startsWith("application/json") && ![502, 503, 504].includes(answer.status);
	const location = answer.status >= 300 && answer.status < 400;
	console.log(`${reached || location ? "PASS" : "FAIL"}  ${method} ${path} -> ${answer.status} ${line(answer.text)}`);
	if (!reached && !location) problems.push(path);
}
if (problems.length) {
	console.log(`smoke failed: ${problems.join(", ")}`);
	process.exit(1);
}
console.log("smoke passed");
EOF
echo "redeployed $sha ($TF_VAR_image)"
