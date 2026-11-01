#!/usr/bin/env python3
"""shell-traps (PreToolUse, Bash): refuses the shell traps that cost time on this Mac, with the right form.

Tim, 2026-10-11: "make a skill that triggers the moment you touch bash" (the skill: shell-rules). A skill is read only
when remembered; this hook sees every command. It refuses (exit 2):
  - BSD flags on the GNU tools first on PATH: `date -r <seconds>`, `stat -f`, `sed -i ''` (WB-23);
  - a `for` loop over an unquoted variable while the session runs zsh (the words are not split there, WB-41);
  - `;` chaining a destructive step (checkout --detach, rm -rf, kill) after another command (WB-19).
Text inside heredoc bodies and quoted strings is ignored.

    shell-traps.py --selftest
"""
import json, os, re, sys

def no_heredocs(cmd):
    out, lines, i = [], cmd.split("\n"), 0
    while i < len(lines):
        out.append(lines[i]); m = re.search(r"<<-?\s*['\"]?(\w+)['\"]?", lines[i])
        if m:
            i += 1
            while i < len(lines) and lines[i].strip() != m.group(1): i += 1
        i += 1
    return "\n".join(out)

def body_of(cmd):
    out, lines, i = [], cmd.split("\n"), 0
    while i < len(lines):
        out.append(lines[i]); m = re.search(r"<<-?\s*['\"]?(\w+)['\"]?", lines[i])
        if m:
            i += 1
            while i < len(lines) and lines[i].strip() != m.group(1): i += 1
        i += 1
    return re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "''", "\n".join(out))

def zsh_session():
    return "zsh" in os.path.basename(os.environ.get("SHELL", "")) and "bash" not in os.environ.get("CLAUDE_CODE_SHELL", "")

def verdict(cmd, zsh=None):
    b = body_of(cmd)
    zsh = zsh_session() if zsh is None else zsh
    if re.search(r"(^|[\s;&|(])date\s+(-\w*\s+)*-r\s+\$?\(?[\d@$]", b):
        return "`date -r <seconds>` is the BSD form; here date is GNU (-r means a FILE's time). Use: date -d @<seconds> '+%Y-%m-%d %H:%M %Z'"
    if re.search(r"(^|[\s;&|(])stat\s+(-\w+\s+)*-f\s", b):
        return "`stat -f` is the BSD form; here stat is GNU (-f is file-SYSTEM info). Use `stat -c %Y file`, or better Python os.stat for a measurement (WB-23)."
    if re.search(r"(^|[\s;&|(])sed\s+-i\s+(''|\"\")(\s|$)", no_heredocs(cmd)):   # on the real quotes: blanked text looks like ''
        return "`sed -i ''` is the BSD form; here sed is GNU: `sed -i 's/a/b/' file`."
    # apprack B-135: an in-place perl substitution on code twice wrote its replacement at the top of the file
    if re.search(r"(^|[\s;&|(])perl\s+(-\w+\s+)*-\w*i\w*\b[^;&|]*\.(ts|tsx|js|mjs|cpp|cc|c|h|hpp|py|cmake)\b", b):
        return ("an in-place perl edit of a code file: twice it wrote its text at the top of the file instead of in place "
                "(apprack B-135). Change code with the Edit tool; perl -pi stays for data files.")
    if zsh and re.search(r"\bfor\s+\w+\s+in\s+\$\w+\s*;", b):
        return ("this session runs zsh: `for x in $VAR` does not split words. Use `${=VAR}`, an explicit list, or a script "
                "file run with bash. Restart Claude Code to get bash 5 (WB-41).")
    if re.search(r";\s*(GUARD_OK=1\s+)?git\s+checkout\s+-q?\s*--detach|;\s*rm\s+-rf\s|;\s*kill\s", b):
        return ("a destructive step chained with `;` runs even when the step before it failed (WB-19). Chain with `&&`, or "
                "run it as its own command after checking the first.")
    return None

def main():
    if sys.argv[1:] == ["--selftest"]: return selftest()
    try: ev = json.load(sys.stdin)
    except Exception: return 0
    if ev.get("tool_name") != "Bash": return 0
    v = verdict(str((ev.get("tool_input") or {}).get("command", "")))
    if v: print("shell-traps: " + v, file=sys.stderr); return 2
    return 0

def selftest():
    ok = True
    cases = [("TZ=America/New_York date -r 1797000000 '+%F'", False, True), ("date -d @1797000000 '+%F'", False, False),
             ("stat -f '%m %N' x", False, True), ("stat -c %Y x", False, False), ("sed -i '' 's/a/b/' f", False, True),
             ("sed -i 's/a/b/' f", False, False), ("for t in $LIST; do echo $t; done", True, True),
             ("for t in $LIST; do echo $t; done", False, False), ("for t in a b; do echo $t; done", True, False),
             ("python3 x.py; GUARD_OK=1 git checkout -q --detach", False, True), ("python3 x.py && git checkout -q --detach", False, False),
             ("echo 'date -r 5 and stat -f'", False, False), ("cat <<'EOF'\nsed -i '' x\nEOF", False, False),
             ("perl -0pi -e 's|a|b|' src/readonly.ts", False, True), ("cd x && perl -pi -e 's/a/b/' lib/a.cpp", False, True),
             ("perl -pi -e 's/a/b/' docs/not-carried.md", False, False), ("perl -0pi -e 's/a/b/' build.json", False, False),
             ("perl -ne 'print' src/a.ts", False, False)]
    for cmd, zsh, want in cases:
        got = verdict(cmd, zsh) is not None
        print(("PASS " if got == want else "FAIL ") + ("refused: " if want else "allowed: ") + cmd.replace("\n", " / ") + (" (zsh)" if zsh else ""))
        ok &= got == want
    return 0 if ok else 1

if __name__ == "__main__": sys.exit(main())
