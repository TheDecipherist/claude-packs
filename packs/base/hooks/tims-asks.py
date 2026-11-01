#!/usr/bin/env python3
"""tims-asks: everything Tim asked, back in front of the session, so nothing discussed is forgotten.

Tim, 2026-10-11: "Sometimes you 'forget' certain things we had discussed 'not sure if its from compaction' but as soon as I
ask you why you didnt finish what we discussed you say 'oh yeah' and then you do it so maybe you also need to check memory
at this time?"

Every message Tim sends is in the session's transcript, word for word: a turn of his own (type `user`, his text) or a
message sent while the session was working (a `queue-operation` enqueue). This reads them back, with their times, and is
used two ways:
  - a SessionStart hook on `compact` (see .claude/settings.json): after a compaction, his asks of the last HOURS hours are
    put back into the session's context, verbatim, with the order to check each one is done;
  - idle-wake.py: the wake after his silence carries the same list.
THE LEDGER (Tim: "what you just did should obviously be a check in the hook so you dont repeat work"): each ask has a
status and its evidence in LEDGER, outside git beside the session's memory, so compaction cannot touch it. Only what is
OPEN comes back word for word; what is done or answered is a count; what needs Tim or is planned is one line each. An ask
not in the ledger is open. Marking it takes evidence (a commit, a bug number, a build.md step, or where it is planned):

    tims-asks.py --transcript <path> [--hours 24] [--all]     the list (open ones; --all: every one with its status)
    tims-asks.py --mark <id> done|answered|planned|needs-tim|not-an-ask "<evidence>"
    tims-asks.py --selftest
"""
import hashlib, json, os, re, sys, time
from datetime import datetime, timezone

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import house  # noqa: E402


def ledger_for(root):
    """The project's ledger beside Claude Code's own memory for it: ~/.claude/projects/<the project's path, every character
    that is not a letter or a digit made a dash>/asks-ledger.json. A worktree's session uses its project's ledger."""
    return os.path.join(os.path.expanduser("~/.claude/projects"), re.sub(r"[^A-Za-z0-9]", "-", house.main_root(os.path.abspath(root))), "asks-ledger.json")


HOURS = float(os.environ.get("TIMS_ASKS_HOURS", "24"))
LEDGER = os.environ.get("TIMS_ASKS_LEDGER") or ledger_for(house.project_root())
STATUSES = {"done", "answered", "planned", "needs-tim", "not-an-ask", "open"}
QUIET = {"done", "answered", "not-an-ask"}
HEAD = ("TIM'S ASKS from the last {h:.0f} hours ({n} messages). Compaction may have dropped some of them from what you remember; "
        "the ledger below holds which are done, with evidence. Every OPEN one is work: check it is not already done (then mark "
        "it with the evidence), finish it, or if it needs Tim say so in one line and mark it needs-tim. Do not wait to be reminded.")

def _text_of(entry):
    """Tim's own words in a transcript entry, or None (a tool's result, a hook's or the system's text, an agent's report)."""
    t = entry.get("type")
    if t == "queue-operation" and entry.get("operation") == "enqueue":
        c = entry.get("content")
        return c if isinstance(c, str) else None
    if t == "user" and not entry.get("isMeta") and not entry.get("isSidechain"):
        m = entry.get("message") or {}
        c = m.get("content")
        if isinstance(c, list):
            c = "\n".join(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text")
        return c if isinstance(c, str) else None
    return None

def _system(text):
    s = text.lstrip()
    return (not s) or s.startswith("<") or s.startswith("[SYSTEM") or s.startswith("[Subagent") or s.startswith("idle-wake:") \
        or s.startswith("This session is being continued") or s.startswith("Caveat:")

def asks(transcript, hours=HOURS, now=None):
    now = now or time.time()
    out, seen = [], set()
    try:
        with open(transcript, encoding="utf-8", errors="replace") as f:
            for line in f:
                if '"queue-operation"' not in line and '"type":"user"' not in line and '"type": "user"' not in line: continue
                try: e = json.loads(line)
                except Exception: continue
                text = _text_of(e)
                if not text or _system(text): continue
                ts = e.get("timestamp")
                try: when = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp() if ts else None
                except Exception: when = None
                if when is not None and now - when > hours * 3600: continue
                key = " ".join(text.split())
                if key in seen: continue
                seen.add(key)
                out.append((when, text.strip()))
    except OSError:
        return []
    return out

def ask_id(text):
    return hashlib.sha1(" ".join(text.split()).encode()).hexdigest()[:8]

def load_ledger(path=None):
    try: return json.load(open(path or LEDGER))
    except Exception: return {}

def mark(aid, status, evidence, path=None):
    if status not in STATUSES: raise SystemExit(f"status is one of {sorted(STATUSES)}")
    if status != "open" and not evidence.strip(): raise SystemExit("evidence is required: a commit, a bug number, a build.md step, or where it is planned")
    led = load_ledger(path)
    led[aid] = {"status": status, "evidence": evidence.strip(), "marked": datetime.now().isoformat(timespec="seconds")}
    tmp = (path or LEDGER) + ".tmp"
    os.makedirs(os.path.dirname(path or LEDGER), exist_ok=True)
    json.dump(led, open(tmp, "w"), indent=1, ensure_ascii=False); os.replace(tmp, path or LEDGER)

def render(items, hours=HOURS, ledger=None, every=False):
    if not items: return ""
    led = load_ledger() if ledger is None else ledger
    stamp = lambda w: datetime.fromtimestamp(w).strftime("%m-%d %H:%M") if w else "     ?     "
    rows = [(w, t, ask_id(t), (led.get(ask_id(t)) or {}).get("status", "open"), (led.get(ask_id(t)) or {}).get("evidence", "")) for w, t in items]
    openr = [r for r in rows if r[3] == "open"]
    waits = [r for r in rows if r[3] in ("needs-tim", "planned")]
    quiet = [r for r in rows if r[3] in QUIET]
    lines = [HEAD.format(h=hours, n=len(items)),
             f"LEDGER ({LEDGER}): {len(quiet)} done or answered, {len(waits)} waiting on Tim or planned, {len(openr)} OPEN. "
             "Only the open ones are work; do not redo a done one. When one is done, mark it with its evidence: "
             "python3 .claude/hooks/tims-asks.py --mark <id> done \"<commit / bug / step>\" (or answered, planned, needs-tim, not-an-ask)."]
    if openr:
        lines.append("OPEN, word for word:")
        for w, t, i, st, ev in openr: lines.append(f"- {i} [{stamp(w)}] " + " ".join(t.split())[:1200])
    if waits:
        lines.append("WAITING (one line each):")
        for w, t, i, st, ev in waits: lines.append(f"- {i} [{stamp(w)}] {st}: {ev[:160]} <- " + " ".join(t.split())[:90])
    if every and quiet:
        lines.append("DONE / ANSWERED:")
        for w, t, i, st, ev in quiet: lines.append(f"- {i} [{stamp(w)}] {st}: {ev[:120]} <- " + " ".join(t.split())[:90])
    return "\n".join(lines)

def selftest():
    import tempfile
    now = time.time()
    iso = lambda dt: datetime.fromtimestamp(now - dt, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    rows = [
        {"type": "user", "timestamp": iso(3600), "message": {"content": "add 20 80s bass arps"}},
        {"type": "queue-operation", "operation": "enqueue", "timestamp": iso(1800), "content": "and make a hook for chrome"},
        {"type": "queue-operation", "operation": "remove", "timestamp": iso(1799), "content": "and make a hook for chrome"},
        {"type": "user", "timestamp": iso(1700), "message": {"content": [{"type": "tool_result", "content": "ok"}]}},
        {"type": "user", "timestamp": iso(1600), "message": {"content": "<task-notification>done</task-notification>"}},
        {"type": "user", "timestamp": iso(1500), "isMeta": True, "message": {"content": "a meta line"}},
        {"type": "user", "timestamp": iso(90000), "message": {"content": "an ask from two days ago"}},
        {"type": "user", "timestamp": iso(60), "message": {"content": [{"type": "text", "text": "is it correct the agents still run?"}]}},
        {"type": "assistant", "timestamp": iso(30), "message": {"content": "Next I'd build P4."}},
    ]
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as f:
        for r in rows: f.write(json.dumps(r) + "\n")
    items = asks(f.name, 24, now)
    got = [t for _, t in items]
    os.unlink(f.name)
    led_path = f.name + ".ledger.json"
    mark(ask_id("add 20 80s bass arps"), "done", "commit abc123", led_path)
    out = render(items, 24, load_ledger(led_path))
    os.unlink(led_path)
    ok2 = "1 done or answered" in out and "2 OPEN" in out and "add 20 80s bass arps" not in out and "and make a hook for chrome" in out
    print(("ok  " if ok2 else "FAIL") + "  a done ask is counted, not listed; the open ones are listed word for word")
    try: mark("x", "done", "", led_path); ok3 = False
    except SystemExit: ok3 = True
    print(("ok  " if ok3 else "FAIL") + "  done without evidence is refused")
    want = ["add 20 80s bass arps", "and make a hook for chrome", "is it correct the agents still run?"]
    ok = got == want
    print(("ok  " if ok else "FAIL") + f"  Tim's own words, mid-turn ones too, no tool results, system text, meta lines, his old asks or the assistant: {got}")
    ok = ok and ok2 and ok3
    want_ledger = os.path.expanduser("~/.claude/projects/-Users-tim-projects-my-synth/asks-ledger.json")
    ok4 = ledger_for("/Users/tim/projects/my_synth") == want_ledger and ledger_for("/Users/tim/projects/my_synth/.claude/worktrees/agent-x") == want_ledger
    print(("ok  " if ok4 else "FAIL") + "  the ledger is the project's own, beside its memory, and a worktree's is its project's")
    ok = ok and ok4
    print(f"tims-asks selftest: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1

if __name__ == "__main__":
    if "--selftest" in sys.argv: sys.exit(selftest())
    if "--mark" in sys.argv:
        i = sys.argv.index("--mark"); mark(sys.argv[i + 1], sys.argv[i + 2], sys.argv[i + 3] if len(sys.argv) > i + 3 else "")
        print(f"marked {sys.argv[i + 1]} {sys.argv[i + 2]}"); sys.exit(0)
    if "--transcript" in sys.argv:
        p = sys.argv[sys.argv.index("--transcript") + 1]
        h = float(sys.argv[sys.argv.index("--hours") + 1]) if "--hours" in sys.argv else HOURS
        print(render(asks(p, h), h, every="--all" in sys.argv)); sys.exit(0)
    # A HOOK (SessionStart on compact): what it prints is added to the session's context
    try: event = json.load(sys.stdin)
    except Exception: sys.exit(0)
    text = render(asks(event.get("transcript_path") or ""))
    if text: print(text)
    sys.exit(0)
