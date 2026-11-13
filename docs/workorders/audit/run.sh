#!/usr/bin/env bash
# Runs work order audit to its end with nobody there: one fresh Claude Code session after another, each resuming from progress.md.
# It ends on the DONE file the work order writes, or after three sessions in a row that move nothing. A session the account's usage
# limit refused ran nothing: the runner waits LIMIT_WAIT seconds (15 min) and tries again, and the refusal is never a session (KWB-125).
#
# This runs Claude with permission prompts off, so nothing stops to ask. Read PROMPT.md and workorder.md first, and run it only on a project you trust,
# in a repo you can roll back. The kit's hooks still judge every write, but a permission prompt no longer stands between a command and your machine.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
order="$root/docs/workorders/audit"
logs="$order/logs"
max_sessions="${MAX_SESSIONS:-30}"
limit_wait="${LIMIT_WAIT:-900}"
# nobody is there: the kit's agents-held hook keeps every agent in the foreground, since the session's end stops a background one (KWB-124)
export CLAUDE_PACKS_UNATTENDED=1
mkdir -p "$logs"
# each session's transcript holds this machine's paths and the user's name: it never reaches git (KWB-98)
[[ -f "$logs/.gitignore" ]] || printf '*\n' > "$logs/.gitignore"
cd "$root"

# before the first commit and the first progress.md there is nothing to read, and nothing is said (KWB-100)
moved() {
  git rev-parse -q --verify HEAD || true
  if [[ -f "$order/progress.md" ]]; then wc -c < "$order/progress.md"; fi
}

# the last line of a session refused for the usage limit is its result, with this error
refused() { tail -n 1 "$1" | grep -q '"api_error":"usage_limit_reached"'; }

# the pre-flight: a run never starts on an order that cannot finish (a placeholder left, a step with no measured Done when, a skill
# not installed, a red doctor). The order is fixed first, by the person, never by the run. A run already started (progress.md) goes on.
if [[ ! -f "$order/progress.md" ]] && ! node "$root/bin/claude-packs.mjs" workorder check audit --dir "$root"; then
  echo "$(date +%Y-%m-%dT%H:%M:%S%z) workorder check refused the order: fix what it names, then start again" | tee -a "$logs/runner.log"
  exit 5
fi

still=0
session=1
while [[ "$session" -le "$max_sessions" ]]; do
  if [[ -f "$order/DONE" ]]; then
    echo "done before session $session"
    exit 0
  fi
  # before every session, not only the first: a session never starts on an outdated kit (KWB-156). kit-fresh says what is older
  # and exits 2 while nobody is there (CLAUDE_PACKS_UNATTENDED); offline it says what it could not check and lets the run go on
  if [[ -f "$root/.claude/hooks/kit-fresh.mjs" ]] && ! node "$root/.claude/hooks/kit-fresh.mjs" --check 2>&1 | tee -a "$logs/runner.log"; then
    echo "$(date +%Y-%m-%dT%H:%M:%S%z) kit-fresh: the kit is older than npm's; update it, then start again" | tee -a "$logs/runner.log"
    exit 6
  fi
  before="$(moved)"
  echo "$(date +%Y-%m-%dT%H:%M:%S%z) session $session starts" | tee -a "$logs/runner.log"
  claude -p "Run docs/workorders/audit/PROMPT.md; this session runs the whole suite where a step's Done when names it" --model claude-opus-5-5 --permission-mode bypassPermissions --output-format stream-json --verbose \
    < /dev/null > "$logs/session-$session.jsonl" 2> "$logs/session-$session.err" || true
  if [[ "$(moved)" == "$before" ]] && refused "$logs/session-$session.jsonl"; then
    echo "$(date +%Y-%m-%dT%H:%M:%S%z) session $session refused for the usage limit: trying again in ${limit_wait}s" | tee -a "$logs/runner.log"
    sleep "$limit_wait"
    continue
  fi
  if [[ "$(moved)" == "$before" ]]; then still=$((still + 1)); else still=0; fi
  if [[ "$still" -ge 3 ]]; then
    echo "three sessions moved nothing: stopping" | tee -a "$logs/runner.log"
    exit 4
  fi
  session=$((session + 1))
done
[[ -f "$order/DONE" ]] && exit 0
echo "stopped after $max_sessions sessions, not finished" | tee -a "$logs/runner.log"
exit 3
