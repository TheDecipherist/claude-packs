#!/usr/bin/env bash
# Runs work order {{name}} to its end with nobody there: one fresh Claude Code session after another, each resuming from progress.md.
# It ends on the DONE file the work order writes, or after three sessions in a row that move nothing.
#
# This runs Claude with permission prompts off, so nothing stops to ask. Read PROMPT.md and workorder.md first, and run it only on a project you trust,
# in a repo you can roll back. The kit's hooks still judge every write, but a permission prompt no longer stands between a command and your machine.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
order="$root/docs/workorders/{{name}}"
logs="$order/logs"
max_sessions="${MAX_SESSIONS:-30}"
mkdir -p "$logs"
cd "$root"

moved() { git rev-parse HEAD; wc -c < "$order/progress.md" 2> /dev/null || true; }

still=0
for session in $(seq 1 "$max_sessions"); do
  if [[ -f "$order/DONE" ]]; then
    echo "done before session $session"
    exit 0
  fi
  before="$(moved)"
  echo "$(date -Is) session $session starts" | tee -a "$logs/runner.log"
  claude -p "Run docs/workorders/{{name}}/PROMPT.md" --permission-mode bypassPermissions --output-format stream-json --verbose \
    < /dev/null > "$logs/session-$session.jsonl" 2> "$logs/session-$session.err" || true
  if [[ "$(moved)" == "$before" ]]; then still=$((still + 1)); else still=0; fi
  if [[ "$still" -ge 3 ]]; then
    echo "three sessions moved nothing: stopping" | tee -a "$logs/runner.log"
    exit 4
  fi
done
[[ -f "$order/DONE" ]] && exit 0
echo "stopped after $max_sessions sessions, not finished" | tee -a "$logs/runner.log"
exit 3
