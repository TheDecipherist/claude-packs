#!/usr/bin/env python3
"""time-guard: nothing is slow without someone being told (bugs.md B-382).

Tim, 2026-10-11, after a night of two-hour panel exports that every agent, and the session watching them, took for normal:
"how can we make a hook that checks agents if they run more than x min to verify we dont waste time like this again?"

A Claude Code PreToolUse + PostToolUse hook on every tool (see .claude/settings.json). It fires for this session and for
every agent it starts, after each of their tool calls, and tells the caller (exit 2 on PostToolUse: the call has already
run, nothing is blocked, the words reach the agent) when:
  1. THE CALL ITSELF TOOK LONG: a tool call that ran more than SLOW_CALL_MIN minutes;
  2. SOMETHING ON THE MACHINE IS SLOW, whoever started it (looked at once a minute at most): a panel export older than
     EXPORT_MIN, more than CHROME_MAX headless Chromes at once or one older than CHROME_MIN, a build older than BUILD_MIN,
     a ctest run older than CTEST_MIN, a single probe older than PROBE_MIN (guards.time.probePattern says what a probe is);
  3. THE CALLER'S WORK HAS NOT MOVED: its worktree's last commit is more than QUIET_MIN minutes old.
  4. A WAIT LOOP HAS RUN FOR HOURS: a shell looping `until ...; do sleep` older than WAIT_LOOP_MIN (Tim, 2026-10-11, seeing "22
     shells": eighteen were loops left waiting for days on things long finished);
and it REFUSES, before it runs (PreToolUse, exit 2), a wait that can never end: `until ! pgrep -f "<words>"`, whose pgrep finds
the loop's own command line, which holds the same words, so it waits for ever.
The same finding is said again only after REPEAT_MIN minutes. What to do is part of every message: find what is slow before
running it again, never wait on it as normal.

The project's values come from .claude/layout.json "guards": { "time": { "probePattern", "saveCommand" } }: the regex a
probe's command line starts with, and how an agent saves its work. Worktrees are the project's .claude/worktrees/*.

Run `time-guard.py --selftest` to see each rule fire on planted numbers and stay quiet on healthy ones.
"""
import json, os, re, subprocess, sys, time, pathlib

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import house  # noqa: E402

DEFAULTS = {
    # the probe binary itself (a path ending in a name with Probe or _probe), never a shell that names one
    "probePattern": r"\S*/\w*(?:Probe|_probe)\b",
    "saveCommand": "git add <paths> && git commit -m \"<note>\" -- <paths>",
}
CFG = dict(DEFAULTS)

SLOW_CALL_MIN = 10
EXPORT_MIN = 5
CHROME_MAX, CHROME_MIN = 6, 5
BUILD_MIN, CTEST_MIN, PROBE_MIN = 30, 45, 20
QUIET_MIN = 60
SAVE_MIN = 30
SCAN_MIN = 15
WAIT_LOOP_MIN = 60
REPEAT_MIN = 10
LOOK_EVERY_S = 60

ROOT = house.main_root(house.project_root())
STATE = pathlib.Path(os.environ.get("TMPDIR", "/tmp")) / ("time-guard-" + re.sub(r"[^\w.-]", "-", os.path.basename(ROOT) or "project"))

def etime_s(s):
    """ps etime ([[dd-]hh:]mm:ss) in seconds."""
    d, _, rest = s.strip().rpartition("-")
    parts = [int(x) for x in rest.split(":")]
    while len(parts) < 3: parts.insert(0, 0)
    return (int(d) if d else 0) * 86400 + parts[0] * 3600 + parts[1] * 60 + parts[2]

def processes():
    try: out = subprocess.run(["ps", "-axo", "pid=,etime=,command="], capture_output=True, text=True, timeout=10).stdout
    except Exception: return []
    rows = []
    for line in out.splitlines():
        m = re.match(r"\s*(\d+)\s+(\S+)\s+(.*)", line)
        if m: rows.append((int(m.group(1)), etime_s(m.group(2)), m.group(3)))
    return rows

def machine_findings(rows):
    f = []
    mins = lambda s: s / 60.0
    chromes = [r for r in rows if re.search(r"Google Chrome(?: for Testing)?(?:\.app/Contents/MacOS/\S+)?\s.*--headless", r[2]) and "Helper" not in r[2]]
    if len(chromes) > CHROME_MAX:
        f.append(("chrome-count", f"{len(chromes)} headless Chromes are running at once (more than {CHROME_MAX}): something is starting "
                  "one per picture again. Find it (ps -axo pid,etime,command | grep -- --headless) and stop it; Chrome is started only "
                  "by kit/synthpanel-creator/src/onechrome.js, for a whole batch"))
    for pid, age, cmd in chromes:
        if mins(age) > CHROME_MIN:
            f.append((f"chrome-old-{pid}", f"a headless Chrome (pid {pid}) has run {mins(age):.0f} min: it is stuck or leaked. Find "
                      "who started it and why it never finished; stop it by its pid"))
    for pid, age, cmd in rows:
        what = None
        if re.search(r"node \S*synthpanel\S*\.js export-native", cmd) and mins(age) > EXPORT_MIN:
            what = (f"export-{pid}", f"a panel export (pid {pid}) has run {mins(age):.0f} min; one takes seconds since B-382 (one "
                    "Chrome, a cache of every picture). It is stuck: find why before waiting longer")
        elif re.match(r"\S*ctest\b", cmd) and mins(age) > CTEST_MIN:
            what = (f"ctest-{pid}", f"a ctest run (pid {pid}) has run {mins(age):.0f} min (more than {CTEST_MIN}): find the slow test "
                    "(ctest prints each as it ends) instead of waiting for all of them")
        elif re.match(r"\S*(?:cmake\s+--build|/make|make|ninja)\b", cmd) and mins(age) > BUILD_MIN:   # the build itself, not a shell naming it
            what = (f"build-{pid}", f"a build (pid {pid}) has run {mins(age):.0f} min (more than {BUILD_MIN}): look at the load "
                    "(uptime) and what else is building")
        elif re.match(CFG["probePattern"], cmd) and mins(age) > PROBE_MIN:   # the probe itself, not a shell naming it
            what = (f"probe-{pid}", f"a probe (pid {pid}: {cmd.split()[0].rsplit('/', 1)[-1]}) has run {mins(age):.0f} min (more "
                    f"than {PROBE_MIN}): every probe has a time limit; find what it is waiting on")
        elif re.search(r"\buntil\b.*;\s*do\s+sleep\b", cmd) and mins(age) > WAIT_LOOP_MIN:
            what = (f"waitloop-{pid}", f"a wait loop (pid {pid}) has run {mins(age):.0f} min: whatever it waits for is finished or dead. "
                    f"Stop it (kill {pid}); wait on a background command's own notification instead of a loop")
        if what: f.append(what)
    return f

def last_commit_min(cwd):
    try:
        r = subprocess.run(["git", "log", "-1", "--format=%ct"], cwd=cwd, capture_output=True, text=True, timeout=10)
        return (time.time() - int(r.stdout.strip())) / 60.0 if r.returncode == 0 and r.stdout.strip() else None
    except Exception:
        return None

def unsaved_min(wt):
    """Minutes since the OLDEST change not yet committed in a worktree (build folders left out); None when it is clean."""
    try:
        out = subprocess.run(["git", "--no-optional-locks", "-C", wt, "status", "--porcelain", "--untracked-files=all"], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return None
    oldest = None
    for line in out.splitlines():
        f = line[3:].strip().strip('"')
        if not f or f.startswith(("build", "listen/", "screenshots/")) or "/build" in f: continue
        try: m = os.path.getmtime(os.path.join(wt, f))
        except OSError: continue
        oldest = m if oldest is None else min(oldest, m)
    return None if oldest is None else (time.time() - oldest) / 60.0

def list_worktrees():
    root = os.path.join(ROOT, ".claude", "worktrees")
    try: return [os.path.join(root, d) for d in sorted(os.listdir(root)) if os.path.isdir(os.path.join(root, d, ".git")) or os.path.isfile(os.path.join(root, d, ".git"))]
    except OSError: return []

def agent_running(aid):
    """Is this agent still running, by the cap hook's count? Unknown state counts as running (the safe side)."""
    try:
        st = json.load(open(os.path.expanduser("~/.claude/agent-cap-state.json")))
    except Exception:
        return True
    sessions = [sess for sess in st.values() if isinstance(sess, dict)]
    if any(aid in (sess.get("running") or {}) for sess in sessions): return True
    # stopped only when the cap hook KNOWS it and no longer counts it; an agent it never saw stays the owner
    return not any(aid in (sess.get("known") or {}) for sess in sessions)

def say_once(key, msg, now, state):
    if now - state.get(key, 0) < REPEAT_MIN * 60: return None
    state[key] = now
    return msg

def run(event, now=None, rows=None, commit_min=None, state=None, worktrees=None):
    now = now or time.time()
    st = state if state is not None else load_state()
    said = []
    hook = event.get("hook_event_name", "")
    tid = event.get("tool_use_id") or ""
    if hook == "PreToolUse":
        cmd = (event.get("tool_input") or {}).get("command", "") if event.get("tool_name") == "Bash" else ""
        # a heredoc's body is text handed to a program (a test, a patch script), never a loop this shell runs: blanked first
        # (0.6.0: the wait-loop refusal fired on a patch script that only held the words)
        cmd = re.sub(r"<<-?\s*['\"]?(\w+)['\"]?[^\n]*\n[\s\S]*?\n\s*\1\s*(?:\n|$)", "\n", cmd)
        if re.search(r"until\s+!\s*pgrep\s+-[a-z]*f\s+(['\"])(?!\[)", cmd):
            return ["REFUSED: `until ! pgrep -f \"...\"` never ends: pgrep -f finds the loop's own command line, which holds the same "
                    "words. Run the work with run_in_background and wait for its notification; or, if you must poll, make the "
                    "pattern unable to match itself: pgrep -f '[T]abulaFaceProbe --x'"]
        if tid: st.setdefault("starts", {})[tid] = now
        save_state(st) if state is None else None
        return []
    # 1. the call itself
    started = st.get("starts", {}).pop(tid, None) if tid else None
    waits = event.get("tool_name", "") in ("AskUserQuestion",)   # a question waits on Tim by its nature: never a slow call (WB-22)
    if started is not None and not waits and (now - started) / 60.0 > SLOW_CALL_MIN:
        cmd = (event.get("tool_input") or {}).get("command", event.get("tool_name", ""))
        said.append(f"this call took {(now - started) / 60.0:.0f} min (more than {SLOW_CALL_MIN}): `{str(cmd)[:80]}`. Find what made it "
                    "slow before running it again; never wait on it as normal")
    # 2. the machine, once a minute at most
    if now - st.get("looked", 0) >= LOOK_EVERY_S or rows is not None:
        st["looked"] = now
        for key, msg in machine_findings(rows if rows is not None else processes()):
            m = say_once(key, msg, now, st)
            if m: said.append(m)
    # 3. EACH AGENT'S OWN WORKTREE (Tim, 2026-10-11: "make a hook that catches things like that so they dont stall for no dumb
    #    reason. and how come our own hooks didnt cover this already?"). A hook runs in the session's folder, the main checkout,
    #    whose commits move all the time, so this rule once looked there and never fired for an agent in its own worktree. Now an
    #    agent's worktree is learned from the commands it runs (`.claude/worktrees/<name>`), and checked: work left unsaved, no
    #    commit for long, and two agents in one worktree.
    who = event.get("agent_id") or "main"
    cmd = str((event.get("tool_input") or {}).get("command", "")) + " " + str((event.get("tool_input") or {}).get("file_path", ""))
    for m_ in re.finditer(r"(/[^\s'\"]*?/\.claude/worktrees/([\w.-]+))", cmd):
        if who != "main":
            prev = st.setdefault("owner", {}).get(m_.group(2))
            # A CLAIM LAPSES WITH ITS AGENT (2026-10-11: a stopped agent's claim refused its own replacement): only an agent
            # the cap hook still counts as running (~/.claude/agent-cap-state.json) holds a worktree
            if prev and prev != who and not agent_running(prev):
                prev = None
            if prev and prev != who:
                m = say_once(f"shared-{m_.group(2)}", f"the worktree .claude/worktrees/{m_.group(2)} is already used by another agent "
                             f"({prev}). Each agent works only in its own: make yours (git worktree add --detach "
                             ".claude/worktrees/<yours> main) and move your files there", now, st)
                if m: said.append(m)
            else:
                st.setdefault("owner", {})[m_.group(2)] = who
                st.setdefault("wt", {})[who] = m_.group(1)
    mine = st.get("wt", {}).get(who) if who != "main" else None
    if mine:
        u = unsaved_min(mine) if rows is None else None      # a selftest case (rows given): never git on a made-up path
        cmn = commit_min if commit_min is not None else last_commit_min(mine)
        if u is not None and u > SAVE_MIN:
            m = say_once(f"unsaved-{mine}", f"your worktree ({mine.split('/')[-1]}) holds work unsaved for {u:.0f} min (more than "
                         f"{SAVE_MIN}). Save it now: {CFG['saveCommand']}", now, st)
            if m: said.append(m)
        elif cmn is not None and cmn > QUIET_MIN:
            m = say_once(f"quiet-{mine}", f"your worktree's last commit was {cmn:.0f} min ago (more than {QUIET_MIN}). If you are "
                         "waiting on something slow, find why it is slow; if the work moved, save it", now, st)
            if m: said.append(m)
    # 4. THE CONTROLLER SEES EVERY WORKTREE, every SCAN_MIN minutes: the ones holding work unsaved for long
    if worktrees is None and rows is not None: worktrees = {}      # a selftest case: never the real worktrees on disk
    if who == "main" and (now - st.get("scanned", 0) >= SCAN_MIN * 60 or worktrees is not None):
        st["scanned"] = now
        late = []
        for wt in (worktrees if worktrees is not None else list_worktrees()):
            u = unsaved_min(wt) if worktrees is None else worktrees[wt]
            if u is not None and u > SAVE_MIN: late.append(f"{wt.split('/')[-1]} ({u:.0f} min)")
        if late:
            said.append("worktrees holding work unsaved for more than " + str(SAVE_MIN) + " min: " + ", ".join(late)
                        + f". Ask their agents to save ({CFG['saveCommand']}), or find why they stall")
    # stale starts (a call that never reported back) are dropped after a day
    st["starts"] = {k: v for k, v in st.get("starts", {}).items() if now - v < 86400}
    if state is None: save_state(st)
    return said

def load_state():
    try: return json.loads((STATE / "state.json").read_text())
    except Exception: return {}
def save_state(st):
    try:
        STATE.mkdir(parents=True, exist_ok=True)
        tmp = STATE / f"state.{os.getpid()}.json"; tmp.write_text(json.dumps(st)); tmp.replace(STATE / "state.json")
    except Exception: pass

def selftest():
    bad = 0
    def expect(name, said, want):
        nonlocal bad
        ok = bool(said) == want
        if not ok: bad += 1
        print(f"{'ok  ' if ok else 'FAIL'}  {name}: {'said' if said else 'quiet'}" + (f" ({said[0][:70]}...)" if said else ""))
    G = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --disable-gpu"
    st = {}
    run({"hook_event_name": "PreToolUse", "tool_use_id": "a"}, now=1000, state=st, rows=[], commit_min=1)
    expect("a call of 12 min", run({"hook_event_name": "PostToolUse", "tool_use_id": "a", "tool_input": {"command": "bash tools/build-panel.sh"}}, now=1000 + 720, state=st, rows=[], commit_min=1), True)
    run({"hook_event_name": "PreToolUse", "tool_use_id": "b"}, now=2000, state=st, rows=[], commit_min=1)
    expect("a call of 2 min", run({"hook_event_name": "PostToolUse", "tool_use_id": "b"}, now=2120, state=st, rows=[], commit_min=1), False)
    expect("an export of 7 min", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(1, 420, "node /x/kit/synthpanel-creator/bin/synthpanel.js export-native design/export-spec.json")], commit_min=1), True)
    expect("an export of 30 s", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(1, 30, "node /x/kit/synthpanel-creator/bin/synthpanel.js export-native design/export-spec.json")], commit_min=1), False)
    expect("12 headless Chromes", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(i, 10, G) for i in range(12)], commit_min=1), True)
    expect("2 headless Chromes of 10 s", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(i, 10, G) for i in range(2)], commit_min=1), False)
    expect("a headless Chrome of a day", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(9, 93600, G)], commit_min=1), True)
    expect("a ctest of an hour", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(3, 3600, "ctest --test-dir build -j4")], commit_min=1), True)
    expect("a probe of 25 min", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(4, 1500, "/x/build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --press-all")], commit_min=1), True)
    A = lambda cmd, who="a1": {"hook_event_name": "PostToolUse", "agent_id": who, "tool_input": {"command": cmd}}
    expect("an agent's worktree quiet for 90 min", run(A("cd /x/.claude/worktrees/k2 && make"), now=5000, state={}, rows=[], commit_min=90), True)
    s2 = {}
    run(A("cd /x/.claude/worktrees/k2 && make"), now=5000, state=s2, rows=[], commit_min=90)
    expect("the same said again a minute later", run(A("ls"), now=5060, state=s2, rows=[], commit_min=90), False)
    s3 = {}
    run(A("cd /x/.claude/worktrees/onechrome && ls", "main-ish"), now=5000, state=s3, rows=[], commit_min=1)
    expect("a second agent in the same worktree", run(A("cd /x/.claude/worktrees/onechrome && vi", "a2"), now=5001, state=s3, rows=[], commit_min=1), True)
    expect("the controller told of a worktree unsaved for 45 min", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[], commit_min=1, worktrees={"/x/.claude/worktrees/guide": 45.0}), True)
    expect("the controller, nothing unsaved", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[], commit_min=1, worktrees={"/x/.claude/worktrees/guide": 5.0}), False)
    loop = 'until ! pgrep -f "cmake --build" >/dev/null; do sleep 5; done'
    expect("the endless wait loop inside a heredoc (text for a program) passes", run({"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {"command": f"python3 - <<'EOF'\nprint('{loop}')\nEOF\necho ok"}}, now=5000, state={}), False)
    expect("the same loop after a heredoc is still refused", run({"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {"command": f"cat > a.txt <<EOF\nx\nEOF\n{loop}"}}, now=5000, state={}), True)
    expect("a shell that names a build is not a build", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(8, 3600, "/bin/zsh -c cmake --build build -j6 && ctest")], commit_min=1), False)
    expect("a build of 40 min", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(8, 2400, "cmake --build build -j6")], commit_min=1), True)
    expect("a shell that names a probe is not a probe", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(9, 3000, "/bin/zsh -c ./build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --walk x")], commit_min=1), False)
    expect("a quiet machine", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(5, 4000, "/bin/zsh"), (6, 20, "cmake --build build -j4")], commit_min=5, worktrees={}), False)
    expect("a wait loop of a day", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(7, 90000, "/bin/zsh -c eval 'until grep -q exit /tmp/x.log; do sleep 15; done'")], commit_min=1), True)
    expect("a wait loop of 5 min", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(7, 300, "/bin/zsh -c eval 'until grep -q exit /tmp/x.log; do sleep 15; done'")], commit_min=1), False)
    expect("REFUSED: until ! pgrep -f \"cmake --build\"", run({"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {"command": 'until ! pgrep -f "cmake --build build -j6" >/dev/null; do sleep 15; done'}}, now=5000, state={}), True)
    expect("a pgrep that cannot match itself passes", run({"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {"command": "until ! pgrep -f '[c]make --build' >/dev/null; do sleep 15; done"}}, now=5000, state={}), False)
    expect("a question answered after 12 min is not a slow call (WB-22)", run({"hook_event_name": "PostToolUse", "tool_name": "AskUserQuestion", "tool_use_id": "q1"}, now=5000 + 720, state={"starts": {"q1": 5000}}, rows=[]), False)
    expect("a Bash call of 12 min still is", run({"hook_event_name": "PostToolUse", "tool_name": "Bash", "tool_use_id": "b1", "tool_input": {"command": "x"}}, now=5000 + 720, state={"starts": {"b1": 5000}}, rows=[]), True)
    expect("a snake-case probe of 25 min", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(4, 1500, "/x/out/probes/engines/synth_engines_probe --only FIRESAW")], commit_min=1), True)
    CFG["probePattern"] = r"\S*/bench_\w+"      # a project's own probe pattern (guards.time.probePattern)
    expect("a project's own probe pattern: its bench of 25 min", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(4, 1500, "/x/out/bench_voices --all")], commit_min=1), True)
    expect("a project's own probe pattern: another program is no probe", run({"hook_event_name": "PostToolUse"}, now=5000, state={}, rows=[(4, 1500, "/x/out/synth_engines_probe")], commit_min=1), False)
    CFG.update(DEFAULTS)
    print(f"time-guard selftest: {'PASS' if not bad else f'{bad} wrong'}")
    return 1 if bad else 0

if __name__ == "__main__":
    if "--selftest" in sys.argv: sys.exit(selftest())
    try: event = json.load(sys.stdin)
    except Exception: sys.exit(0)
    CFG.update(house.guard("time", DEFAULTS, ROOT))
    try: said = run(event)
    except Exception: sys.exit(0)            # the guard never stops work by failing itself
    if said:
        print("time-guard: " + "\n time-guard: ".join(said), file=sys.stderr)
        sys.exit(2)
    sys.exit(0)
