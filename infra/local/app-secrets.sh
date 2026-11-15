#!/usr/bin/env bash
# QRWTY arm A, local test profile: the application's own credentials that the export does not
# provision, generated at run time into the directory given (outside the application tree; never
# committed). compose.override.yaml mounts them from QRWTY_LOCAL_APP_SECRET_DIR.
#   link-replay-keys  Link API's replay key ring (Q06): one line `<kid> <32 random bytes, base64url>`.
#
#   infra/local/app-secrets.sh <directory>
set -euo pipefail
dir=${1:?usage: app-secrets.sh <directory>}
if [ -e "$dir" ]; then
  echo "refusing: $dir exists; remove it by name first" >&2
  exit 1
fi
mkdir -p "$dir"
chmod 0700 "$dir"
# The container user (node, uid 1000) reads the bind-mounted file with the host owner's uid.
(umask 077 && printf 'k%s %s\n' "$(date -u +%Y%m%d)" "$(openssl rand 32 | basenc --base64url | tr -d '=\n')" \
  >"$dir/link-replay-keys")
echo "{\"ok\":true,\"dir\":\"$dir\",\"files\":[\"link-replay-keys\"]}"
