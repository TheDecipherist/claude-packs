#!/usr/bin/env python3
"""build-guard (global): no heavy job takes the whole machine.

Tim, 2026-10-11: "the agent launcher should also be a global thing because nothing should be able to take the entire
system". Five agents each compiling with -j18 at once put ~90 jobs on 18 cores and every build took hours. Every compile and
test run, in every project and session, goes through the machine-wide queue ~/.claude/bin/buildq (two at a time). This
refuses (exit 2) a heavy command started any other way, and refuses any build from an agent started as `KIND: light`
(at most 3 build agents run, raised from 2 on 2026-10-11; ~/.claude/hooks/agent-cap.py keeps the kinds).

Allowed: a command run as `buildq <cmd>` (or `~/.claude/bin/buildq <cmd>`), or through a project's own wrapper that calls
buildq (for example `bash tools/build.sh ...`, the `build` and `test` commands in .claude/layout.json). Configuring (`cmake -B build`) is light and allowed. Text that only MENTIONS a
command (inside a heredoc, a quoted string, a commit message) is never read as running it.

    build-guard.py --selftest
"""
import json, os, re, shlex, subprocess, sys

WRAPPERS = ("buildq", "build.sh")

def heavy(w):
    exe = w[0].rsplit("/", 1)[-1]
    # A PROGRAM RUN STRAIGHT FROM A BUILD FOLDER (a probe, a prototype, a test binary): measured 2026-10-11, one bank
    # render took ~8 cores by itself and six probes outside the queue filled all 18 (Tim: "the machine is literally
    # stalling itself using all cores at 100%")
    if re.search(r"(^|/)(build[^/]*|[^/]*_artefacts)/", w[0]) or re.match(r"^[A-Z]\w*(Probe|Proto|Tests?)$", exe): return True
    if exe == "cmake": return "--build" in w
    if exe == "ninja" and any(x in ("-t", "--version", "-n") or x.startswith("-t") for x in w[1:]): return False   # WB-36: a question to the build graph (or a dry run), not a build
    if exe == "ctest" and any(x in ("--version", "-N", "--show-only") or x.startswith("--show-only") for x in w[1:]): return False   # WB-36: listing tests, not running them
    if exe in ("ctest", "ninja", "xcodebuild", "msbuild", "gradle", "gradlew", "mvn"): return True
    if exe in ("make", "gmake"): return True
    if exe in ("cargo", "swift", "go", "bazel", "bazelisk"): return len(w) > 1 and w[1] in ("build", "test", "bench", "run", "install")
    return False

def strip_heredocs(cmd):
    """Drop the bodies of heredocs: they are text written to a file or fed to a program, never commands of this shell."""
    out, lines, i = [], cmd.split("\n"), 0
    while i < len(lines):
        line = lines[i]; out.append(line)
        m = re.search(r"<<-?\s*['\"]?([A-Za-z_][A-Za-z0-9_]*)['\"]?", line)
        if m:
            end = m.group(1); i += 1
            while i < len(lines) and lines[i].strip() != end: i += 1
        i += 1
    return "\n".join(out)

def offending(cmd):
    cmd = strip_heredocs(cmd)
    # quoted strings are arguments, not commands: blank them before splitting on shell operators
    blank = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "''", cmd)
    for part in re.split(r"&&|\|\||;|\||\n|\(|\)|`|\$\(", blank):
        try: w = shlex.split(part, comments=True)
        except ValueError: w = part.split()
        if len(w) >= 2 and w[0] in ("command", "type", "which", "whence", "hash") and w[1] in ("-v", "-V", "-p", "-a") or w[:1] in (["which"], ["type"], ["whence"]): continue   # looking a program up is not running it
        while w and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", w[0]) or w[0] in ("env", "time", "nice", "caffeinate", "exec", "nohup", "command", "sudo")):
            w = w[1:]
            while w and w[0].startswith("-"): w = w[1:]
        if not w: continue
        if w[0].rsplit("/", 1)[-1] in WRAPPERS or (w[0] in ("bash", "sh", "zsh") and len(w) > 1 and w[1].rsplit("/", 1)[-1] in WRAPPERS):
            continue
        if heavy(w): return " ".join(w[:3])
    return None

def polling(cmd):
    """A sleep loop or a long sleep, in the commands this shell runs (heredoc bodies and quoted text left out)."""
    body = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "''", strip_heredocs(cmd))
    if re.search(r"\b(until|while)\b[^\n]*\bdo\b[\s\S]*\bsleep\b", body) or re.search(r"\b(until|while)\b[\s\S]*;\s*do\b[\s\S]*\bsleep\b", body):
        return "a loop that sleeps"
    for m in re.finditer(r"(?:^|[;&|(\n]|\bdo\b|\bthen\b)\s*sleep\s+([0-9.]+)", body):
        if float(m.group(1)) > 5: return f"sleep {m.group(1)}"
    if re.search(r"for\s+\w+\s+in\s+\$\(seq[^)]*\)[\s\S]*\bsleep\b", body): return "a loop that sleeps"
    if re.search(r"\btail\s+(-\S*\s+)*-[a-zA-Z]*[fF]\b", body): return "tail -f on a log (watching, not working)"
    return None

def launches_app(cmd):
    """Opening an .app (`open X.app`, `open -a X`) or running the binary inside one, outside heredocs and quoted text."""
    body = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "''", strip_heredocs(cmd))
    return bool(re.search(r"(^|[;&|(\s])open\s+(-[a-zA-Z]+\s+)*[^\s;&|]*\.app\b|(^|[;&|(\s])open\s+-a\s|\.app/Contents/MacOS/", body))

def too_wide(cmd):
    """A build of everything, or a test run with no -R or one matching more than 30 tests. None when the scope is named."""
    body = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", lambda m: m.group(0), strip_heredocs(cmd))
    if re.search(r"(cmake\s+--build|tools/build\.sh\s+build)\b", body):
        if re.search(r"--target\s+all\b", body) or (re.search(r"cmake\s+--build", body) and "--target" not in body) \
           or re.search(r"tools/build\.sh\s+build\s+\S+\s*($|[;&|])", body):
            return "a build of every target is refused."
    m = re.search(r"(?:\bctest\b|tools/build\.sh\s+test)([^;&|\n]*)", body)
    if m:
        args = m.group(1)
        if "--full-gate" in args or "--changed" in args: return None   # --changed limits itself to what changed (tools/test_cache.py)
        r = re.search(r"-R\s+('([^']*)'|\"([^\"]*)\"|(\S+))", args)
        if not r: return "a test run with no -R pattern runs the whole suite."
        pat = r.group(2) or r.group(3) or r.group(4) or ""
        d = re.search(r"--test-dir\s+(\S+)", args); tdir = d.group(1) if d else "build"
        cwd = re.search(r"cd\s+(\S+)\s*&&", body)
        base = os.path.expanduser(cwd.group(1)) if cwd else os.getcwd()
        try:
            out = subprocess.run(["ctest", "--test-dir", os.path.join(base, tdir) if not os.path.isabs(tdir) else tdir, "-N", "-R", pat],
                                 capture_output=True, text=True, timeout=20).stdout
            n = int((re.search(r"Total Tests:\s*(\d+)", out) or [0, 0])[1])
        except Exception: n = 0
        if n > 30: return f"the -R pattern {pat!r} matches {n} tests."
    return None

def uses_queue(cmd):
    return re.search(r"(^|[\s/;&|(])(buildq|tools/build\.sh)\s", strip_heredocs(cmd)) is not None

def main():
    if sys.argv[1:] == ["--selftest"]: return selftest()
    try: ev = json.load(sys.stdin)
    except Exception: return 0
    if os.path.exists(os.path.join(os.environ.get("CLAUDE_PROJECT_DIR") or ev.get("cwd") or "", ".claude", "hooks", "pre.js")): return 0   # a project's own PreToolUse dispatcher wins (Tim, 2026-10-18)
    if ev.get("tool_name") != "Bash": return 0
    cmd = str((ev.get("tool_input") or {}).get("command", ""))
    aid = ev.get("agent_id")
    # NO POLLING (Tim, 2026-10-11: "what exactly is it doing for 10m?": agents ran `until grep -q done log; do sleep 10`
    # for minutes on end): a loop that sleeps, or a sleep over 5 s, is refused. Run the job in the foreground through the
    # queue, or with run_in_background and wait for its notification.
    # NO REAL APP FROM AN AGENT (Tim, 2026-10-11: "it opens. plays for 10s and closes", every ~30 s, through his speakers
    # while he worked: an agent's real-app check on repeat). An agent may not open an .app or run the binary inside one;
    # it asks the controller, who warns Tim first. Probes run offscreen and offline.
    # TIM'S YES FOR ONE RUN: the controller writes ~/.claude/app-ok/<agent id> after asking him; it lasts 15 minutes
    okf = os.path.expanduser(f"~/.claude/app-ok/{aid}") if aid else ""
    app_ok = bool(aid) and os.path.exists(okf) and (__import__("time").time() - os.path.getmtime(okf)) < 900
    if False and aid and launches_app(cmd) and not app_ok:   # OFF (Tim, 2026-10-11: agents may open the app): the fault was one agent opening it on repeat through his speakers, not opening it. The rule is in the agent-jobs skill: mute it, once, not in a loop
        print("build-guard: an agent may not open a real app: it plays through Tim's speakers and pops windows while he works "
              "(Tim, 2026-10-11). Do the check in a probe, offscreen and offline. If the real app is truly needed for one final "
              "proof, message the controller and wait: it warns Tim first.", file=sys.stderr)
        return 2
    poll = polling(cmd)
    # AN AGENT BUILDS AND TESTS ONLY WHAT ITS CHANGE NEEDS (Tim, 2026-10-11: "how is all these builds taking an 1hr. we are
    # doing something wrong": one agent ran all 425 tests on 1 core, another built `--target all` at -j1)
    if aid:
        scope = too_wide(cmd)
        if scope:
            print("build-guard: " + scope + " Build only the targets your change needs (`--target X --target Y`), and run only "
                  "its tests (`-R 'pattern'`, at most 30). The whole suite runs once, as the gate before landing, never while "
                  "working (Tim, 2026-10-11).", file=sys.stderr)
            return 2
    if poll:
        print(f"build-guard: polling refused ({poll}). Waiting in a sleep loop hides what you are doing and burns turns. Run "
              "the job in the FOREGROUND through the queue (buildq / tools/build.sh wait for a slot themselves; the Bash tool "
              "allows up to 10 minutes), or start it with run_in_background and you are notified when it ends.", file=sys.stderr)
        return 2
    # A light agent may RUN an already-built program through the queue (a render), never compile or run a test suite
    compiles = re.search(r"(cmake\s+--build|\bctest\b|\bmake\b|\bninja\b|xcodebuild|tools/build\.sh\s+(build|test))", strip_heredocs(cmd))
    if aid and compiles:
        try:
            st = json.load(open(os.path.expanduser("~/.claude/agent-cap-state.json")))
            kind = st.get(ev.get("session_id") or "default", {}).get("kinds", {}).get(aid)
        except Exception: kind = None
        if kind == "light":
            print("build-guard: this agent was started as KIND: light, and light agents do not build or run tests (at most 3 "
                  "build agents run at once, Tim 2026-10-11). Do the light part, and say in your report what needs building.", file=sys.stderr)
            return 2
    what = offending(cmd)
    if not what: return 0
    print(f"build-guard: `{what}` straight from the shell is refused. Nothing may take the whole machine (Tim, 2026-10-11). "
          "Run it through the machine-wide build queue, which runs two at a time and waits for a free slot by itself:\n"
          f"    buildq {what} ...        (~/.claude/bin/buildq; buildq --status shows the slots)\n"
          "or the project's own wrapper if it has one (the build and test commands in .claude/layout.json). Do not wrap it in a loop.", file=sys.stderr)
    return 2

def selftest():
    ok = True
    cases = [("cmake --build build --target X -j18", True), ("cd x && cmake --build build", True), ("ctest --test-dir build", True),
             ("make -j8", True), ("ninja -C out", True), ("cargo build --release", True), ("xcodebuild -scheme A", True),
             ("(cd w && ctest -j6)", True), ("FOO=1 time make", True),
             ("buildq cmake --build build -j18", False), ("~/.claude/bin/buildq ctest --test-dir b", False),
             ("bash tools/build.sh build build Synth_Standalone", False), ("cmake -B build -DX=1", False),
             ("./build/SynthBankProbe_artefacts/RelWithDebInfo/SynthBankProbe --starter", True),
             ("cd w && build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --pad", True),
             ("buildq ./build/SynthBankProbe_artefacts/RelWithDebInfo/SynthBankProbe --starter", False),
             ("ls build/", False), ("command -v ninja", False), ("ninja -C build -t inputs X", False), ("/opt/homebrew/bin/ninja --version", False), ("ninja -C build X", True), ("ctest --test-dir build -N", False), ("ctest --test-dir build --show-only=json-v1", False), ("ctest --version", False), ("which ninja", False), ("cargo fmt", False), ("go vet ./...", False), ("grep -n 'cmake --build' f.md", False), ("git commit -m 'make it'", False),
             ("cat > f.py <<'EOF'\ncases = [(\"cmake --build b\", True)]\nmake -j8\nEOF\npython3 f.py", False),
             ("python3 - <<EOF\nctest --test-dir b\nEOF", False), ('echo "run ctest later"', False)]
    polls = [("until grep -qE 'done' log; do sleep 10; done", True), ("for i in $(seq 1 55); do grep -q x f && break; sleep 20; done", True),
             ("while true; do\n  sleep 15\ndone", True), ("sleep 180", True), ("sleep 2 && ls", False), ("echo sleep 60", False),
             ("cat > f.sh <<'EOF'\nwhile true; do sleep 9; done\nEOF", False), ("grep -n 'sleep 30' x.sh", False)]
    for cmd, want in [("open build/Synth_artefacts/RelWithDebInfo/Standalone/Synth.app", True), ("open -a Synth", True),
                      ("python3 tools/record_app_probe.py build/x/Synth.app/Contents/MacOS/Synth", True),
                      ("cd w && build/T.app/Contents/MacOS/Synth --record /tmp/x.mov &", True),
                      ("ls build/Synth_artefacts", False), ("open docs/report.md", False), ("echo 'open X.app'", False)]:
        got = launches_app(cmd); print(("PASS " if got == want else "FAIL ") + ("refused app: " if want else "allowed: ") + cmd); ok &= got == want
    for cmd, want in [("cmake --build build --target all -j6", True), ("cd w && cmake --build build -j6", True), ("bash tools/build.sh build build", True),
                      ("bash tools/build.sh build build SynthFaceProbe Synth_Standalone", False), ("cmake --build build --target SynthBankProbe -j5", False),
                      ("bash tools/build.sh test build --output-on-failure", True), ("ctest --test-dir build -j3", True),
                      ("bash tools/build.sh test build -R 'record' --output-on-failure", False), ("bash tools/build.sh test build --full-gate", False), ("bash tools/build.sh test build --changed", False)]:
        got = too_wide(cmd) is not None; print(("PASS " if got == want else "FAIL ") + ("refused wide: " if want else "allowed: ") + cmd); ok &= got == want
    for cmd, want in [("timeout 585 tail -f /tmp/x.log", True), ("tail -F build.log", True), ("tail -20 build.log", False), ("tail -n 5 f", False)]:
        got = polling(cmd) is not None; print(("PASS " if got == want else "FAIL ") + ("refused poll: " if want else "allowed: ") + cmd); ok &= got == want
    for cmd, want in polls:
        got = polling(cmd) is not None
        print(("PASS " if got == want else "FAIL ") + ("refused poll: " if want else "allowed: ") + cmd.replace("\n", " / ")); ok &= got == want
    for cmd, want in cases:
        got = offending(cmd) is not None
        print(("PASS " if got == want else "FAIL ") + ("refused: " if want else "allowed: ") + cmd.replace("\n", " / ")); ok &= got == want
    return 0 if ok else 1

if __name__ == "__main__": sys.exit(main())
