#!/usr/bin/env bash
# Deploy (or update) a temporary qrwtya- probe job on the product image with the probe body in an
# environment variable, execute it once and save its log lines.
#   run-probe.sh <job> <service account short name> <env yaml> <out jsonl> [extra gcloud deploy flags...]
set -uo pipefail
P=project-f46f6d6a-8e74-42a0-ab1; REGION=us-central1
job=$1 sa=$2 envfile=$3 outfile=$4; shift 4
[[ $job == qrwtya-* ]] || { echo "refusing $job"; exit 2; }
image=$(cat /home/ash/github/qrwty/.scratch/Q13/current-image)
s=$(cut -d' ' -f1 /proc/uptime)
gcloud run jobs deploy "$job" --project=$P --region=$REGION --image="$image" \
  --service-account="$sa@$P.iam.gserviceaccount.com" --network=qrwtya-vpc --subnet=qrwtya-run --vpc-egress=all-traffic \
  --command=/bin/sh --args='^~^-c~cd /app && exec node --input-type=module -e "$(printf %s "$QRWTY_PROBE_B64" | base64 -d)"' \
  --env-vars-file="$envfile" --cpu=1 --memory=512Mi --max-retries=0 --task-timeout=300s --tasks=1 \
  --labels=arm=a,unit=q13,purpose=probe "$@" --quiet >/dev/null 2>"$outfile.deploy.err" || { tail -5 "$outfile.deploy.err"; exit 1; }
exe=$(gcloud run jobs execute "$job" --project=$P --region=$REGION --wait --format='value(metadata.name)' 2>"$outfile.exec.err")
rc=$?
[ -n "$exe" ] || exe=$(gcloud run jobs executions list --job="$job" --project=$P --region=$REGION --limit=1 --sort-by=~metadata.creationTimestamp --format='value(metadata.name)')
e=$(cut -d' ' -f1 /proc/uptime)
echo "{\"job\":\"$job\",\"execution\":\"$exe\",\"rc\":$rc,\"wallS\":$(python3 -c "print(round($e-$s,1))")}"
for i in 1 2 3 4 5; do
  sleep_s=$((i*5)); sleep $sleep_s
  gcloud logging read "resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"$job\" AND labels.\"run.googleapis.com/execution_name\"=\"$exe\"" \
    --project=$P --order=asc --limit=500 --format=json > "$outfile.raw.json" 2>/dev/null
  python3 - "$outfile.raw.json" "$outfile" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
out = []
for r in rows:
    line = r.get("jsonPayload") or {"text": r.get("textPayload")}
    out.append({"timestamp": r["timestamp"], "severity": r.get("severity"), **line})
with open(sys.argv[2], "w") as f:
    for o in out: f.write(json.dumps(o) + "\n")
print(len(out), "log lines;", sum(1 for o in out if o.get("step") == "done"), "done")
PY
  grep -q '"step": "done"' "$outfile" && break
  [ "$rc" != 0 ] && grep -q 'Container called exit' "$outfile" && break
done
