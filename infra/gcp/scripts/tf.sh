#!/usr/bin/env bash
# OpenTofu for arm A's live stack (A2): the pinned binary, the google provider from the local
# mirror, state in gs://qrwtya-tfstate-523800841789 (prefix infra/gcp).
#
#   QRWTY_TF_WORK=<dir> infra/gcp/scripts/tf.sh <tofu arguments>
#   e.g. QRWTY_TF_WORK=/tmp/w infra/gcp/scripts/tf.sh plan -out=w.tfplan
#        QRWTY_TF_WORK=/tmp/w infra/gcp/scripts/tf.sh apply w.tfplan
#
# Every run copies infra/gcp/*.tf and qrwtya.tfvars (as qrwtya.auto.tfvars) into <dir>, so a plan
# saved there is applied from there. It writes <dir>/tofurc (the provider mirror) and runs
# `tofu init` when <dir> has none. Apply only a saved plan.
#
# Environment:
#   TF_VAR_image         the image by digest; when unset, the one the migration job runs now.
#   TF_VAR_auth0_domain  when unset, AUTH0_DOMAIN from ~/.config/qrwty/auth0.env, read in a
#                        subshell so no other value of that file reaches tofu.
#   QRWTY_TOOLS          default <repo>/.scratch/tools (tofu-1.13.2/ and providers/).
#   QRWTY_TF_TEARDOWN=1  the working copy of pubsub.tf drops its prevent_destroy guards.
# Credentials: the gcloud user's Application Default Credentials. Nothing is printed but tofu's
# own output.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
gcp="$(dirname "$here")"
repo="$(cd "$gcp/../.." && pwd)"
tools="${QRWTY_TOOLS:-$repo/.scratch/tools}"
tofu="$tools/tofu-1.13.2/tofu"
work="${QRWTY_TF_WORK:?set QRWTY_TF_WORK to a working directory}"
project=project-f46f6d6a-8e74-42a0-ab1
region=us-central1
bucket=qrwtya-tfstate-523800841789

[ -x "$tofu" ] || { echo "tf.sh: $tofu is missing" >&2; exit 2; }
[ -d "$tools/providers" ] || { echo "tf.sh: $tools/providers is missing" >&2; exit 2; }
mkdir -p "$work"
work="$(cd "$work" && pwd)"
rm -f "$work"/*.tf
cp "$gcp"/*.tf "$work"/
cp "$gcp/qrwtya.tfvars" "$work/qrwtya.auto.tfvars"
# Teardown only: the working copy drops pubsub.tf's prevent_destroy guards (the committed file
# keeps them), as Q13 did.
if [ "${QRWTY_TF_TEARDOWN:-}" = 1 ]; then
	sed -i 's/prevent_destroy = true/prevent_destroy = false/' "$work/pubsub.tf"
fi
cat >"$work/tofurc" <<EOF
provider_installation {
  filesystem_mirror {
    path    = "$tools/providers"
    include = ["registry.opentofu.org/hashicorp/google"]
  }
  direct {
    exclude = ["registry.opentofu.org/hashicorp/google"]
  }
}
EOF
export TF_CLI_CONFIG_FILE="$work/tofurc" TF_IN_AUTOMATION=1

if [ -z "${TF_VAR_auth0_domain:-}" ]; then
	TF_VAR_auth0_domain="$(
		set -a
		# shellcheck disable=SC1090,SC1091
		. "$HOME/.config/qrwty/auth0.env"
		set +a
		printf '%s' "${AUTH0_DOMAIN#https://}" | sed 's#/*$##'
	)"
	export TF_VAR_auth0_domain
fi
if [ -z "${TF_VAR_image:-}" ]; then
	TF_VAR_image="$(gcloud run jobs describe qrwtya-migrate --project="$project" --region="$region" \
		--format='value(spec.template.spec.template.spec.containers[0].image)' 2>/dev/null || true)"
	[ -n "$TF_VAR_image" ] || { echo "tf.sh: TF_VAR_image is unset and qrwtya-migrate has no image" >&2; exit 2; }
	export TF_VAR_image
fi

if [ ! -d "$work/.terraform" ]; then
	"$tofu" -chdir="$work" init -input=false -no-color \
		-backend-config="bucket=$bucket" -backend-config="prefix=infra/gcp" >"$work/init.log" ||
		{ cat "$work/init.log" >&2; exit 1; }
fi
exec "$tofu" -chdir="$work" "$@"
