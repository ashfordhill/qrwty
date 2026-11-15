#!/usr/bin/env bash
# Q04: after the last change to the application overlay, reinstall it, rebuild the production
# image, restart the stack on it (pnpm start), and rerun the R01 matrix (both modes) and the
# oracle's R01-R03 from the pack v1.6 copy. Run from the export with the stack environment.
set -euo pipefail
repo=/home/ash/github/qrwty
ev=$repo/docs/evidence/q04
t() { cut -d' ' -f1 /proc/uptime; }
s=$(t)
python3 "$repo/infra/local/install-overlay.py" . "$repo/infra/app-overlay" "$ev/probe-app" >"$ev/records/overlay-install.json"
pnpm start >"$ev/logs/final-start.log" 2>&1
echo "{\"step\":\"start\",\"seconds\":$(python3 -c "print(round($(t)-$s,1))")}"
python3 "$repo/infra/local/verify-generated.py" . >"$ev/records/verify-generated.json"
docker image inspect -f '{{json .}}' "$COMPOSE_PROJECT_NAME-app" |
  python3 -c 'import json,sys,hashlib;d=json.load(sys.stdin);print(json.dumps({"id":d["Id"],"user":d["Config"]["User"],"labels":d["Config"]["Labels"],"layers":len(d["RootFS"]["Layers"]),"layersSha256":hashlib.sha256(json.dumps(d["RootFS"]["Layers"]).encode()).hexdigest(),"cmd":d["Config"]["Cmd"]}))' >"$ev/records/image.json"
node "$repo/infra/local/profile-check.mjs" prepare >/dev/null
for m in profile generated; do
  bash "$ev/commands/r01-matrix.sh" "$m" >"$ev/records/r01-matrix-$m.jsonl"
done
echo "{\"step\":\"matrix\",\"seconds\":$(python3 -c "print(round($(t)-$s,1))")}"
node "$repo/infra/local/oracle-commands.mjs" adapter "$ev/oracle/oracle-adapter.json" >/dev/null
rm -rf "$ev/oracle/results"
cd "$repo/.scratch/Q04/pack/v1.6/oracle"
node src/cli.ts validate-adapter "$ev/oracle/oracle-adapter.json" >"$ev/oracle/validate-adapter.json"
set +e
node src/cli.ts run --adapter "$ev/oracle/oracle-adapter.json" --out "$ev/oracle/results" \
  --rows R01,R02,R03 --scope local --no-reset >"$ev/logs/oracle-run.log" 2>&1
echo "{\"step\":\"oracle\",\"exit\":$?,\"seconds\":$(python3 -c "print(round($(t)-$s,1))")}"
