#!/usr/bin/env bash
# Q00 checks. Run from the QRWTY repository root: bash docs/evidence/q00/run_checks.sh
# Each check's command, output and exit status go to docs/evidence/q00/<name>.txt.
set -u
E=docs/evidence/q00
R=docs/benchmarks/runs/qrwty-r1-20261114
P=docs/benchmarks/neutral-pack/v1
FAILED=0

run() {
  local name=$1
  shift
  {
    echo "\$ $*"
    "$@"
    echo "exit=$?"
  } >"$E/$name.txt" 2>&1
  local status
  status=$(tail -1 "$E/$name.txt")
  echo "$name: $status"
  [ "$status" = "exit=0" ] || FAILED=1
}

unit_paths() {
  git status --porcelain --untracked-files=all -- . ':!.docs' | cut -c4- | grep -v '__pycache__'
}

whitespace() {
  # New files: no trailing whitespace, final newline present. Changed tracked files: git diff
  # --check (only the changed lines; the owner's README keeps two pre-existing trailing spaces).
  local bad=0
  while read -r path; do
    case "$path" in *.png) continue ;; esac
    [ -f "$path" ] || continue
    git ls-files --error-unmatch "$path" >/dev/null 2>&1 && continue
    if grep -nI '[[:space:]]$' "$path" | grep -v '^$' >/dev/null; then
      echo "trailing whitespace: $path"; bad=1
    fi
    if [ -s "$path" ] && [ "$(tail -c1 "$path" | od -An -c | tr -d ' ')" != '\n' ]; then
      echo "no final newline: $path"; bad=1
    fi
  done < <(unit_paths)
  git diff --check || bad=1
  [ $bad -eq 0 ] && echo "no whitespace errors in $(unit_paths | wc -l) unit paths"
  return $bad
}

no_runtime_change() {
  local bad=0
  while read -r path; do
    case "$path" in
      README.md | docs/benchmarks/* | docs/evidence/q00/* | docs/handoff.md | docs/plans/production-build/README.md)
        echo "ok   $path" ;;
      *) echo "OUTSIDE ALLOWED WRITES: $path"; bad=1 ;;
    esac
  done < <(unit_paths)
  for dir in app web infra; do
    [ -e "$dir" ] && { echo "unexpected runtime directory $dir"; bad=1; }
  done
  [ -e package.json ] && { echo "unexpected package.json"; bad=1; }
  [ $bad -eq 0 ] && echo "no runtime, package, app, web or infra change"
  return $bad
}

run pack-verify python3 "$P/verify_pack.py" --against-git .
run pack-sha256sum bash -c "cd $P && sha256sum -c SHA256SUMS"
run pack-negative python3 "$E/pack_negative.py"
run pack-ledger-copies bash -c "for f in README.md events.schema.json ledger.py; do cmp $R/\$f $P/ledger/\$f && echo \"identical: \$f\"; done"
run ledger-validate python3 "$R/ledger.py" validate
run ledger-self-test python3 "$R/ledger.py" self-test
run ledger-workflow python3 "$E/ledger_workflow.py"
run json-parse python3 -c "import json,sys; [json.load(open(p)) for p in sys.argv[1:]]; print('parsed', len(sys.argv)-1, 'JSON files')" \
  docs/benchmarks/status.json "$P/MANIFEST.json" "$R/events.schema.json"
run links python3 "$E/check_links.py"
run whitespace whitespace
run no-runtime-change no_runtime_change
echo "overall: $([ $FAILED -eq 0 ] && echo PASS || echo FAIL)"
exit $FAILED
