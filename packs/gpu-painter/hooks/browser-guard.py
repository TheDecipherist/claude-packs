#!/usr/bin/env python3
"""browser-guard: a natively drawn app never starts a browser. Its picture checks come from the app itself, drawn off-screen
by the same code as the window, never through a browser (the house law for
every GPU-painted synth).

From Tabula 1's browser-guard.py (main 8d5e8b30), made stricter: Tabula allowed one launch script for a batch; this allows
none. A PreToolUse hook on Bash, Write, Edit and MultiEdit. It exits 2 when the call starts Chrome or Chromium (the binary,
`open -a`, puppeteer or playwright launching or connecting to one), or writes code that would. Looking at processes (ps,
pgrep, grep) and words about a browser in .md, .txt, .json pass.

The refusal names the project's own picture command: .claude/layout.json "guards": { "browser": { "pictureCommand" } }.

Run `browser-guard.py --selftest` to see every rule fire on a planted call and every allowed call pass.
"""
import json, os, re, sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, "lib"), os.path.join(HERE, "..", "..", "base", "hooks", "lib")]   # installed; in the package
import house  # noqa: E402

DEFAULTS = {"pictureCommand": "the app's own off-screen render (the project's shot or picture program)"}


def way(cfg=None):
    c = {**DEFAULTS, **(cfg or {})}
    return ("This app is drawn natively and never starts a browser. A picture comes from the app's own off-screen render, drawn by "
            f"the same painter code as the window: {c['pictureCommand']}.")


WAY = way()

BIN = r"""(?:["']?[^\s"';|&]*(?:Google Chrome(?: for Testing)?(?:\.app/Contents/MacOS/Google Chrome(?: for Testing)?)?|google-chrome(?:-stable)?|chromium(?:-browser)?|chrome-headless-shell|headless_shell)["']?)"""
LAUNCH_BASH = [
    # the binary as the command of a segment (after env assignments, exec, nohup, timeout N, time)
    re.compile(r"^(?:\s*\w+=\S*\s+)*(?:exec\s+|nohup\s+|time\s+|timeout\s+\S+\s+|/usr/bin/time\s+(?:-p\s+)?)*" + BIN + r"(?:\s|$)", re.I),
    re.compile(r"\bopen\b[^|;&]*-a\s+[\"']?(?:Google Chrome|Chromium)", re.I),
    re.compile(r"\.launch(?:PersistentContext|Server)?\s*\(|\bchrome-launcher\b"),
    re.compile(r"\bnpx\s+(?:puppeteer|playwright)\b"),
]
LOOKING = re.compile(r"^\s*(?:ps|pgrep|pkill|kill|killall|grep|egrep|rg|ag|xargs\s+kill|which|ls|stat|file|mdls|defaults\s+read|echo|printf|cat|head|tail|wc|sed|awk)\b")
# code that starts Chrome: a process call or launcher near a Chrome name or a headless flag
CODE = [
    re.compile(r"(?:spawn|spawnSync|execFile|execFileSync|exec|execSync|fork)\s*\([^)]{0,200}(?:chrome|chromium|--headless)", re.I | re.S),
    re.compile(r"subprocess\.(?:run|Popen|call|check_call|check_output)\s*\([^)]{0,300}(?:chrome|chromium|--headless)", re.I | re.S),
    re.compile(r"os\.(?:system|popen)\s*\([^)]{0,300}(?:chrome|chromium|--headless)", re.I | re.S),
    # a driver launching or connecting to a browser
    re.compile(r"\b(?:chromium|firefox|webkit|puppeteer|browserType)\s*\.\s*launch(?:PersistentContext|Server)?\s*\("),
    re.compile(r"\bchrome-launcher\b"),
    re.compile(r"\bconnectOverCDP\b|\bpuppeteer\s*\.\s*connect\s*\("),
    re.compile(r"""['"]--headless(?:=new)?['"]"""),
    re.compile(r"""['"]--screenshot(?:=|['"])"""),
]

def segments(cmd):
    out, cur, q = [], "", None
    for ch in cmd:
        if q:
            cur += ch
            if ch == q: q = None
        elif ch in "'\"":
            q = ch; cur += ch
        elif ch in ";|&\n":
            out.append(cur); cur = ""
        else:
            cur += ch
    out.append(cur)
    return [s.strip() for s in out if s.strip()]

def blank_heredocs(cmd):
    """a heredoc's body is text handed to a program, not a command: blanked before the command scan (WB-20: C++ source
    with w.launch(...) in it, written to a file by cat, was read as a browser launch). A script given to an interpreter
    (node, python with a heredoc) is still read whole, below."""
    out, lines, i = [], cmd.split("\n"), 0
    while i < len(lines):
        out.append(lines[i]); m = re.search(r"<<-?\s*['\"]?(\w+)['\"]?", lines[i]); i += 1
        if m:
            while i < len(lines) and lines[i].strip() != m.group(1): i += 1
            if i < len(lines): out.append(lines[i]); i += 1
    return "\n".join(out)

def check_bash(cmd):
    for seg in segments(blank_heredocs(cmd)):
        if LOOKING.match(seg): continue
        for rx in LAUNCH_BASH:
            if rx.search(seg): return f"browser-guard: this starts Chrome directly (`{seg[:90]}`). {WAY}"
    # a script handed to an interpreter inline (node -e, python -c, a heredoc)
    if re.search(r"\b(?:node|python3?|deno|bun)\b", cmd):
        for rx in CODE:
            if rx.search(cmd): return f"browser-guard: this script starts Chrome itself. {WAY}"
    return None

def check_code(path, text):
    if not text: return None
    if str(path).endswith("browser-guard.py"): return None          # this file names what it catches
    if re.search(r"\.(md|txt|json|csv)$", str(path)): return None   # words about Chrome, not code that starts it
    for rx in CODE:
        m = rx.search(text)
        if m: return f"browser-guard: {path} would start Chrome itself (`{m.group(0)[:80]}`). {WAY}"
    return None

def inside(path, root):
    """Only this project's files are judged on a write (a worktree's are the project's); a script written in another
    project, a scratchpad or a test fixture starts nothing here (0.6.0: it refused a test that only names a launch)."""
    if root is None: return True
    p = house.main_root(os.path.abspath(os.path.join(root, str(path))))
    return p == root or p.startswith(root.rstrip("/") + "/")

def check(event, root=None):
    tool, inp = event.get("tool_name", ""), event.get("tool_input", {}) or {}
    if tool == "Bash": return check_bash(inp.get("command", ""))
    if not inside(inp.get("file_path", ""), root): return None
    if tool == "Write": return check_code(inp.get("file_path", ""), inp.get("content", ""))
    if tool == "Edit": return check_code(inp.get("file_path", ""), inp.get("new_string", ""))
    if tool == "MultiEdit": return next((r for e in inp.get("edits", []) if (r := check_code(inp.get("file_path", ""), e.get("new_string", "")))), None)
    return None

def selftest():
    G = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    blocked = [
        ("Bash", {"command": f'"{G}" --headless=new --screenshot=/tmp/a.png file:///tmp/a.html'}),
        ("Bash", {"command": f"cd /tmp && '{G}' --headless --dump-dom file:///x.html > x"}),
        ("Bash", {"command": "CHROME=1 google-chrome --headless --screenshot x"}),
        ("Bash", {"command": "timeout 30 chromium --headless --print-to-pdf a.html"}),
        ("Bash", {"command": 'open -a "Google Chrome" screenshots/a.png'}),
        ("Bash", {"command": "node -e \"const p = require('puppeteer'); p.launch()\""}),
        ("Bash", {"command": "node -e \"import('playwright').then(({chromium}) => chromium.launch())\""}),
        ("Bash", {"command": "python3 - <<'EOF'\nimport subprocess\nsubprocess.run(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless'])\nEOF"}),
        ("Write", {"file_path": "/x/tools/shot.mjs", "content": "import { execFile } from 'node:child_process';\nexecFile(chrome, ['--headless=new', '--screenshot=a.png'])"}),
        ("Edit", {"file_path": "/x/kit/synthpanel-creator/src/raster.js", "old_string": "a", "new_string": "execFileSync(chrome, ['--headless=new'])"}),
        ("Write", {"file_path": "/x/tools/a.py", "content": "import subprocess\nsubprocess.run([CHROME, '--headless', url])"}),
        ("Write", {"file_path": "/x/tools/b.js", "content": "import puppeteer from 'puppeteer';\nconst br = await puppeteer.launch();"}),
        ("Write", {"file_path": "/x/onechrome.js", "content": "spawn(chrome, ['--headless=new'])"}),
        ("Write", {"file_path": "/x/tools/d.mjs", "content": "const browser = await chromium.connectOverCDP(endpoint);"}),
        ("Write", {"file_path": "/x/tools/c.mjs", "content": "import { chromium } from 'playwright';\nconst browser = await chromium.launch();"}),
    ]
    allowed = [
        ("Bash", {"command": "ps -axo pid,command | grep -E 'Google Chrome.*--headless' | grep -v grep | awk '{print $1}' | xargs kill -KILL"}),
        ("Bash", {"command": "out/synth_shot --render build/pictures/s3/a.png --size 3584x2016"}),
        ("Bash", {"command": "grep -rn -- '--headless' kit/ | head"}),
        ("Bash", {"command": "git commit -m 'B-382: one Chrome (no more google-chrome --headless per sprite)' -- bugs.md"}),
        ("Write", {"file_path": "/x/bugs.md", "content": "one headless Chrome per sprite, execFile(chrome, ['--headless'])"}),
        ("Edit", {"file_path": "/x/lib/painter/src/draw.cpp", "old_string": "a", "new_string": "panel.setLit (\"expand\", open);"}),
        ("Bash", {"command": "cat > probes/reach/r.cpp <<'EOF'\n    w.launch(0, sim::Kind::head, kKey, 1, foot, vel, age);\nEOF\nbash tools/build.sh build r"}),   # WB-20
    ]
    blocked.append(("Bash", {"command": "node - <<'EOF'\nconst { chromium } = require('playwright'); await chromium.launch();\nEOF"}))   # WB-20: a heredoc node runs still counts
    blocked.append(("Write", {"file_path": "/x/.claude/worktrees/agent-a/tools/e.mjs", "content": "await puppeteer.launch();"}))   # a worktree is the project
    allowed.append(("Write", {"file_path": "/elsewhere/scratch/patch.py", "content": "s = 'await puppeteer.launch();'"}))     # another project's file
    bad = 0
    for tool, inp in blocked:
        r = check({"tool_name": tool, "tool_input": inp}, "/x")
        if not r: bad += 1; print(f"NOT BLOCKED: {tool} {json.dumps(inp)[:100]}")
    for tool, inp in allowed:
        r = check({"tool_name": tool, "tool_input": inp}, "/x")
        if r: bad += 1; print(f"WRONGLY BLOCKED: {tool} {json.dumps(inp)[:100]}\n   {r[:120]}")
    print(f"browser-guard selftest: {len(blocked)} launches blocked, {len(allowed)} other calls passed: {'PASS' if not bad else f'{bad} wrong'}")
    return 1 if bad else 0

if __name__ == "__main__":
    if "--selftest" in sys.argv: sys.exit(selftest())
    try: event = json.load(sys.stdin)
    except Exception: sys.exit(0)
    WAY = way(house.guard("browser", DEFAULTS))
    reason = check(event, house.main_root(house.project_root()))
    if reason:
        print(reason, file=sys.stderr)
        sys.exit(2)
    sys.exit(0)
