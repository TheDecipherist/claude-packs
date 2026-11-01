#!/usr/bin/env python3
"""idle-wake: a proposed next step is started when Tim has gone quiet.

Tim, 2026-10-11: "a hook that reacts whenever you stop a turn with a summary where it usually says something like 'next I
would do this, or next I suggest that, or should I do this etc'. A hook that starts counting at the end of that turn. If I
havent said anything for 15min I am probably in bed. And unless there is no logical reason for you to not start the next
thing so you can finish what we started for when I wake up. then you obviously should start"; "you could just have a timer
running the entire time that you ignore if you are actually running?"

Tim, later the same night: "but its not just if you suggest you can continue. Sometimes you 'forget' certain things we had
discussed ... maybe you also need to check memory at this time?"

A Claude Code Stop hook with `asyncRewake` (see .claude/settings.json): it runs in the background after the main session
ends ANY turn, so the turn ends and Tim can type. It watches the session's transcript; anything written to it (Tim typing,
an agent reporting, the session working) ends the watch quietly. After WAIT_MIN minutes of silence it exits 2, which wakes
the session with the message below and EVERY ASK Tim made in the last day, word for word (tims-asks.py), to be checked one
by one. A turn that ends with the words NOTHING OPEN (the session went through his asks and the plan and found nothing it
can do without him) starts no watch, so a finished night does not wake itself every 15 minutes.

Run `idle-wake.py --selftest` to see it wake after silence, stay quiet after activity, and ignore a turn that proposes nothing.
"""
import json, os, re, sys, time

WAIT_MIN = float(os.environ.get("IDLE_WAKE_MIN", "15"))
LOOK_S = float(os.environ.get("IDLE_WAKE_LOOK_S", "10"))

PROPOSES = re.compile(r"""(?ix)
    \bnext,?\s+(?:I(?:'d|\s+would|\s+will|'ll)|is|up|step|on\s+my\s+list|comes?)\b
  | \b(?:shall|should|can|may)\s+I\b
  | \b(?:want|like)\s+me\s+to\b
  | \bwould\s+you\s+like\b | \bdo\s+you\s+want\b
  | \bI(?:'d|\s+would)?\s+(?:recommend|suggest|propose)\b | \bmy\s+recommendation\b
  | \bI'll\s+(?:start|begin|continue|carry\s+on|pick\s+up|move\s+on)\b
  | \bthen\s+I(?:'ll|\s+will)\b
  | \bready\s+to\s+(?:start|begin|go)\b
  """)

WAKE = ("idle-wake: Tim has said nothing for {m:.0f} minutes since you {what}. He is probably in bed. First go through his asks "
        "below and build.md's In progress: anything not done and proved is open work. Then, unless there is a logical reason not "
        "to (it needs his eyes, ears or hands, it is destructive or outward-facing, or it waits on something unfinished), START "
        "the next thing NOW, so what was started is finished when he wakes. If there is such a reason, say it in one line and "
        "take the next thing instead. If truly nothing is left that you can do, end your turn with the words NOTHING OPEN.")

def proposes(text):
    if not text: return False
    tail = text.strip()[-1500:]
    return bool(PROPOSES.search(tail)) or tail.rstrip().endswith("?")

def size_of(path):
    try: st = os.stat(path); return (st.st_size, st.st_mtime_ns)
    except Exception: return None

def watch(event, wait_s, look_s, sleep=time.sleep):
    """0: nothing to do or activity seen; 2: silence for wait_s."""
    if event.get("hook_event_name") not in (None, "Stop"): return 0, ""
    msg = event.get("last_assistant_message") or ""
    if "NOTHING OPEN" in msg: return 0, ""
    path = event.get("transcript_path")
    if not path: return 0, ""
    first = size_of(path)
    waited = 0.0
    while waited < wait_s:
        sleep(look_s); waited += look_s
        if size_of(path) != first: return 0, ""
    words = WAKE.format(m=wait_s / 60.0, what="proposed or asked about a next step" if proposes(msg) else "ended a turn")
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("tims_asks", os.path.join(os.path.dirname(os.path.abspath(__file__)), "tims-asks.py"))
        ta = importlib.util.module_from_spec(spec); spec.loader.exec_module(ta)
        listed = ta.render(ta.asks(path))
        if listed: words += "\n\n" + listed
    except Exception:
        pass
    return 2, words

def selftest():
    import tempfile
    bad = 0
    def expect(name, got, want):
        nonlocal bad
        ok = got == want
        if not ok: bad += 1
        print(f"{'ok  ' if ok else 'FAIL'}  {name}: exit {got}")
    with tempfile.TemporaryDirectory() as d:
        t = os.path.join(d, "t.jsonl"); open(t, "w").write("{}\n")
        ev = lambda m: {"hook_event_name": "Stop", "transcript_path": t, "last_assistant_message": m}
        expect("silence after 'Next I'd build P4'", watch(ev("Done. Next I'd build P4 PAD SETUP."), 3, 1, sleep=lambda s: None)[0], 2)
        expect("silence after 'Shall I start the bank?'", watch(ev("All green. Shall I start the bank?"), 3, 1, sleep=lambda s: None)[0], 2)
        expect("silence after 'I recommend the cache'", watch(ev("My recommendation: the cache first."), 3, 1, sleep=lambda s: None)[0], 2)
        def typed(s):
            with open(t, "a") as f: f.write('{"type":"user"}\n')
        expect("Tim types during the wait", watch(ev("Next I'd build P4."), 3, 1, sleep=typed)[0], 0)
        expect("silence after a plain report (every turn arms)", watch(ev("K10 is landed as fb67cbb3. 46 of 46 green."), 3, 1, sleep=lambda s: None)[0], 2)
        expect("a turn ending NOTHING OPEN", watch(ev("All asks done and proved. NOTHING OPEN"), 3, 1, sleep=lambda s: None)[0], 0)
        expect("another hook event", watch({"hook_event_name": "PostToolUse", "transcript_path": t, "last_assistant_message": "Shall I?"}, 3, 1, sleep=lambda s: None)[0], 0)
    print(f"idle-wake selftest: {'PASS' if not bad else f'{bad} wrong'}")
    return 1 if bad else 0

if __name__ == "__main__":
    if "--selftest" in sys.argv: sys.exit(selftest())
    try: event = json.load(sys.stdin)
    except Exception: sys.exit(0)
    code, words = watch(event, WAIT_MIN * 60.0, LOOK_S)
    if code == 2: print(words, file=sys.stderr)
    sys.exit(code)
