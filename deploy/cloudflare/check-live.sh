#!/usr/bin/env bash
# Check the live qrwty.io edge from this machine: page, endpoints, headers, www redirect, TLS.
#
#   deploy/cloudflare/check-live.sh [expected-commit]
#
# Exits non-zero if any check fails. If the system resolver has no answer for a host yet
# (a negative cache right after a new record), the host is resolved through Cloudflare's
# DNS-over-HTTPS and curl/openssl connect to that address; the output says so.
set -uo pipefail

expected_commit="${1:-}"
apex="qrwty.io"
www="www.qrwty.io"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
failures=0

# HTML is fetched like a browser: Cloudflare injects scripts (Web Analytics) only into
# responses for browser-like requests, so a bare curl would miss them.
browser=(-A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
	-H "accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; failures=$((failures + 1)); }

# Prints the address to connect to for $1, or nothing when the system resolver answers.
doh_address() {
	if getent ahosts "$1" >/dev/null 2>&1; then return 0; fi
	curl -sS -H 'accept: application/dns-json' "https://cloudflare-dns.com/dns-query?name=$1&type=A" |
		node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=(JSON.parse(s).Answer||[]).find(r=>r.type===1);if(a)console.log(a.data)})'
}

declare -A addr
for host in "$apex" "$www"; do
	addr[$host]="$(doh_address "$host")"
	if [ -n "${addr[$host]}" ]; then
		echo "note  $host: system resolver has no answer yet; using DoH address ${addr[$host]}"
	fi
done

# fetch <name> <url> [curl args...]: writes $work/<name>.headers and $work/<name>.body
fetch() {
	local name="$1" url="$2" host
	shift 2
	host="$(echo "$url" | sed -E 's#^https?://([^/]+).*#\1#')"
	local resolve=()
	[ -n "${addr[$host]:-}" ] && resolve=(--resolve "$host:443:${addr[$host]}")
	curl -sS --max-time 20 "${resolve[@]}" -D "$work/$name.headers" -o "$work/$name.body" \
		-w '%{http_code}' "$@" "$url" >"$work/$name.status" 2>"$work/$name.err" ||
		echo "000" >"$work/$name.status"
}
status() { cat "$work/$1.status"; }
header() { grep -i "^$2:" "$work/$1.headers" | head -1 | sed -E 's/^[^:]+:[[:space:]]*//; s/\r$//'; }

expect_security_headers() {
	local name="$1" label="$2" ok=1
	local -A want=(
		[content-security-policy]="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'"
		[x-content-type-options]="nosniff"
		[referrer-policy]="no-referrer"
		[x-robots-tag]="noindex"
	)
	for h in "${!want[@]}"; do
		if [ "$(header "$name" "$h")" != "${want[$h]}" ]; then
			fail "$label: header $h is '$(header "$name" "$h")'"
			ok=0
		fi
	done
	if grep -qi '^strict-transport-security:' "$work/$name.headers"; then
		fail "$label: unexpected Strict-Transport-Security"
		ok=0
	fi
	[ "$ok" -eq 1 ] && pass "$label: security headers present, no HSTS"
}

# 1. The page.
fetch home "https://$apex/" "${browser[@]}"
if [ "$(status home)" = 200 ] && [ "$(header home content-type)" = "text/html; charset=utf-8" ] &&
	grep -q '<title>QRWTY</title>' "$work/home.body" &&
	grep -q 'Short links that never lose a click. In development.' "$work/home.body" &&
	grep -q 'class="build">build <code>' "$work/home.body"; then
	pass "https://$apex/ -> 200 text/html, QRWTY page with build line: $(grep -o '<code>[^<]*</code> · <time[^>]*>[^<]*' "$work/home.body" | sed -E 's/<[^>]+>//g')"
else
	fail "https://$apex/ -> $(status home) $(header home content-type)"
fi
expect_security_headers home "https://$apex/"
if grep -Eiq '<script|<link|@import|url\(|https?://' "$work/home.body"; then
	fail "https://$apex/: page references an external resource: $(grep -Eio '<script[^ >]*[^>]{0,80}' "$work/home.body" | head -1)"
else
	pass "https://$apex/ (browser request): no scripts, links, imports or absolute URLs in the page"
fi

# 2. /build.json (the Worker's build) and /healthz (arm A's Session API, since A2).
fetch healthz "https://$apex/healthz"
fetch build "https://$apex/build.json"
health_json="$(cat "$work/healthz.body")"
build_json="$(cat "$work/build.body")"
verdict="$(HEALTH="$health_json" BUILD="$build_json" EXPECT="$expected_commit" node -e '
	const problems = [];
	let h = {}, b = {};
	try { h = JSON.parse(process.env.HEALTH); } catch { problems.push("healthz is not JSON"); }
	try { b = JSON.parse(process.env.BUILD); } catch { problems.push("build.json is not JSON"); }
	const e = process.env.EXPECT;
	if (h.service !== "session-api" || h.application !== "ready") problems.push("healthz is not a ready Session API");
	if (Object.keys(b).join() !== "commit,builtAt") problems.push("build.json keys " + Object.keys(b));
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(b.builtAt)) problems.push("builtAt is not UTC ISO");
	if (e && b.commit !== e) problems.push("commit " + b.commit + " is not the expected " + e);
	console.log(problems.join("; "));
' 2>&1)"
if [ "$(status healthz)" = 200 ] && [ "$(status build)" = 200 ] &&
	[ "$(header build content-type)" = "application/json; charset=utf-8" ] && [ -z "$verdict" ]; then
	pass "https://$apex/healthz -> 200 $health_json"
	pass "https://$apex/build.json -> 200 $build_json"
else
	fail "/healthz -> $(status healthz) $health_json; /build.json -> $(status build) $build_json; $verdict"
fi
expect_security_headers healthz "https://$apex/healthz"
expect_security_headers build "https://$apex/build.json"

# 3. Any other path.
fetch missing "https://$apex/x" "${browser[@]}"
if [ "$(status missing)" = 404 ] && [ "$(header missing content-type)" = "text/html; charset=utf-8" ] &&
	grep -q '<h1>404</h1>' "$work/missing.body" && ! grep -qi '<script' "$work/missing.body"; then
	pass "https://$apex/x -> 404 text/html, no script ($(wc -c <"$work/missing.body") bytes)"
else
	fail "https://$apex/x -> $(status missing) $(header missing content-type)"
fi
expect_security_headers missing "https://$apex/x"

# 4. www redirects to the apex with the same path.
fetch wwwx "https://$www/x"
if [ "$(status wwwx)" = 301 ] && [ "$(header wwwx location)" = "https://$apex/x" ]; then
	pass "https://$www/x -> 301 Location: $(header wwwx location)"
else
	fail "https://$www/x -> $(status wwwx) Location: $(header wwwx location)"
fi
expect_security_headers wwwx "https://$www/x"
fetch wwwq "https://$www/a/b?c=1"
if [ "$(status wwwq)" = 301 ] && [ "$(header wwwq location)" = "https://$apex/a/b?c=1" ]; then
	pass "https://$www/a/b?c=1 -> 301 Location: $(header wwwq location)"
else
	fail "https://$www/a/b?c=1 -> $(status wwwq) Location: $(header wwwq location)"
fi

# 5. TLS: curl above verified chain and hostname; show the certificate and openssl's verdict.
for host in "$apex" "$www"; do
	target="${addr[$host]:-$host}"
	out="$(openssl s_client -connect "$target:443" -servername "$host" -verify_hostname "$host" \
		-verify_return_error </dev/null 2>"$work/tls.err")"
	cert="$(echo "$out" | openssl x509 -noout -subject -issuer -startdate -enddate -ext subjectAltName 2>/dev/null |
		tr '\n' ' ' | sed -E 's/  +/ /g; s/ +$//')"
	if echo "$out" | grep -q 'Verify return code: 0 (ok)'; then
		pass "TLS $host: verified; $cert"
	else
		fail "TLS $host: $(grep -m1 'Verify return code' <<<"$out" || head -1 "$work/tls.err")"
	fi
done

echo
if [ "$failures" -eq 0 ]; then
	echo "all checks passed"
else
	echo "$failures check(s) failed"
	exit 1
fi
