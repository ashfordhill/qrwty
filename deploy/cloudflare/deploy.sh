#!/usr/bin/env bash
# Deploy the qrwty.io edge Worker and confirm the live build. Safe to rerun: every run
# uploads the current source, keeps the same Custom Domains and checks /build.json.
#
#   deploy/cloudflare/deploy.sh [--allow-dirty]
#
# 1. Writes .build/build.json from `git rev-parse HEAD` and the current UTC time. A dirty
#    tree (tracked changes anywhere, or untracked files under deploy/cloudflare) is refused
#    unless --allow-dirty is passed; the commit is then recorded as "<sha>-dirty".
# 2. Runs `wrangler deploy` with the build as plain-text variables.
# 3. Polls https://qrwty.io/build.json from this machine until it reports that build
#    (/healthz is arm A's Session API since A2).
#
# Credentials: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from the environment, or else
# from ~/.config/qrwty/cloudflare.env. They are never printed: wrangler's output and its
# debug log are scrubbed.
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d; s/^# \{0,1\}//'; }
die() { echo "deploy.sh: $*" >&2; exit 1; }

allow_dirty=0
for arg in "$@"; do
	case "$arg" in
	--allow-dirty) allow_dirty=1 ;;
	-h | --help) usage; exit 0 ;;
	*) die "unknown argument: $arg (see --help)" ;;
	esac
done

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here"
build_url="https://qrwty.io/build.json"

# Node.js: wrangler needs 22 or newer; package.json pins 24.21.0. Fall back to nvm's copy.
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_major)" -lt 22 ] && [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
	# shellcheck disable=SC1091
	. "${NVM_DIR:-$HOME/.nvm}/nvm.sh" >/dev/null
	nvm use --silent 24.21.0 >/dev/null 2>&1 || true
fi
[ "$(node_major)" -ge 22 ] || die "Node.js 22+ is required (24.21.0 is pinned); found $(node --version 2>/dev/null || echo none)"
command -v pnpm >/dev/null || die "pnpm is required (12.16.1 is pinned)"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
	env_file="$HOME/.config/qrwty/cloudflare.env"
	[ -r "$env_file" ] || die "CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID are unset and $env_file is missing"
	set -a
	# shellcheck disable=SC1090
	. "$env_file"
	set +a
fi
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] ||
	die "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must both be set"
export WRANGLER_SEND_METRICS=false

# Wrangler always writes a debug log, and it holds API URLs with the account ID. Send it to a
# private temp file and keep only a scrubbed copy, .wrangler/logs/last-deploy.log (gitignored).
mkdir -p .wrangler/logs
raw_log="$(mktemp --suffix=.log -t qrwty-wrangler-XXXXXX)"
export WRANGLER_LOG_PATH="$raw_log"
trap 'node scripts/scrub.mjs <"$raw_log" >.wrangler/logs/last-deploy.log 2>/dev/null; rm -f "$raw_log"' EXIT

# 1. The build object.
commit="$(git rev-parse HEAD)"
dirty="$(git status --porcelain --untracked-files=no; git status --porcelain --untracked-files=all -- . | grep '^??' || true)"
if [ -n "$dirty" ]; then
	[ "$allow_dirty" -eq 1 ] || die "the working tree is dirty; commit first or pass --allow-dirty:
$dirty"
	commit="$commit-dirty"
	echo "deploy.sh: warning: deploying a dirty tree as $commit" >&2
fi
built_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p .build
printf '{"commit":"%s","builtAt":"%s"}\n' "$commit" "$built_at" >.build/build.json
echo "build: $(cat .build/build.json)"

# 2. Deploy (dependencies first, from the lockfile).
pnpm install --frozen-lockfile --reporter=silent
pnpm exec wrangler --version
pnpm exec wrangler deploy --var "BUILD_COMMIT:$commit" --var "BUILT_AT:$built_at" 2>&1 |
	node scripts/scrub.mjs

# 3. Confirm the live build from this machine.
node scripts/check-health.mjs .build/build.json "$build_url" 120
