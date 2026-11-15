#!/usr/bin/env bash
# Q04 R01 matrix: every process x every forbidden setting, in one mode (profile | generated).
# Run from the export directory with the stack environment and QRWTY_EXPORT_DIR set.
set -uo pipefail
mode=${1:?profile|generated}
P=/home/ash/github/qrwty/infra/local/profile-check.mjs
settings="pubsub-emulator-host:emulator-endpoint metadata-detection-off:emulator-endpoint compose-database-host:emulator-endpoint emulator-pubsub-project:emulator-endpoint stripe-fixture-url:fake-provider local-issuer:fake-provider development-secret-dir:development-secret development-credential:development-secret node-tls-reject-off:tls-verification-disabled database-tls-disable:tls-verification-disabled require-tls-off:tls-verification-disabled missing-database-host:missing-required-value missing-secret-mount:missing-required-value placeholder-db-password:placeholder-credential oracle-edge-token:test-hook test-clock:test-hook"
for p in redirect-service analytics-worker session-api link-api account-api billing-api; do
  for s in $settings; do node "$P" check "$p" "${s%%:*}" "${s##*:}" "$mode"; done
done
