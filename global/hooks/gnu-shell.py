#!/usr/bin/env python3
"""gnu-shell: the Bash tool runs bash 5 with the GNU tools, not zsh with the BSD ones (bashfix.md).

Tim, 2026-10-11: "can you do a proper skill/hook for zsh because this seems to happen alot?"; "read bashfix.md".

Claude Code's Bash tool runs the login shell, which on this Mac is zsh (oh-my-zsh, powerlevel10k): `$VAR` holding several
words is not split, an unmatched glob is an error (`no matches found`), and `sed -i`, `date -d`, `stat -c` are the BSD
tools'. Three commands failed on that in one night. The fix has two halves (bashfix.md, measured there):
  1. THE SHELL: .claude/settings.json's `env` sets CLAUDE_CODE_SHELL and SHELL to /opt/homebrew/bin/bash (Homebrew's bash 5,
     never Apple's 3.2 at /bin/bash). It is read when a session starts, before the shell is chosen.
  2. THE TOOLS: this SessionStart hook writes one `export PATH=...` to the file CLAUDE_ENV_FILE names, which Claude Code
     sources before every Bash call: the `libexec/gnubin` folder of every GNU formula installed, first, so `sed`, `date`,
     `stat`, `awk`, `tar`, `find`, `xargs`, `which` are the GNU builds. Tim's own terminal is not touched.
It says so, at the session's start, when it cannot deliver: no Homebrew, a formula missing, the shell not bash 5.

    gnu-shell.py --selftest
"""
import json, os, re, subprocess, sys

FORMULAS = ["coreutils", "findutils", "gawk", "gnu-sed", "gnu-tar", "gnu-which", "grep"]
BASH = "/opt/homebrew/bin/bash"

def prefix():
    """Homebrew's prefix, found on the disk, not by asking brew (a hook started by an app may not have brew on PATH)."""
    for p in ("/opt/homebrew", "/usr/local"):
        if os.path.isdir(os.path.join(p, "opt")) and any(os.path.isdir(os.path.join(p, "opt", f, "libexec", "gnubin")) for f in FORMULAS):
            return p
    return None

def gnubins(pre):
    have, missing = [], []
    for f in FORMULAS:
        d = os.path.join(pre, "opt", f, "libexec", "gnubin") if pre else ""
        (have if pre and os.path.isdir(d) else missing).append(d if pre and os.path.isdir(d) else f)
    return have, missing

def bash_major(path):
    try: out = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5).stdout
    except Exception: return 0
    m = re.search(r"version (\d+)\.", out)
    return int(m.group(1)) if m else 0

def run(env_file, shell, pre=None):
    """Writes the PATH line; returns what must be said (empty when all is as it should be)."""
    said = []
    pre = pre if pre is not None else prefix()
    if not pre:
        return ["gnu-shell: no Homebrew found (/opt/homebrew or /usr/local): this session's sed, date, stat and awk are the macOS "
                "(BSD) builds, not GNU. Write BSD-safe commands (sed -i '' ..., no date -d)."]
    have, missing = gnubins(pre)
    if env_file and have:
        with open(env_file, "a") as f:
            # ~/.claude/bin first: buildq, the machine-wide build queue (Tim, 2026-10-11: "nothing should be able to take
            # the entire system"), is then a plain command in every session
            f.write('export PATH="$HOME/.claude/bin:' + ":".join(have) + ':${PATH}"\n')
            # WB-41: a session started before CLAUDE_CODE_SHELL was set runs zsh all day; say so on EVERY command, not once
            f.write('[ -n "$ZSH_VERSION" ] && echo "gnu-shell: THIS SESSION RUNS ZSH, not bash 5 (variables are not split into words, an unmatched glob is an error). Restart Claude Code to get bash 5." >&2\n')
    if missing:
        said.append(f"gnu-shell: GNU formula(s) not installed: {', '.join(missing)}; those tools are the macOS (BSD) builds this "
                    f"session. Tim installs them with: brew install {' '.join(missing)}")
    if not env_file:
        said.append("gnu-shell: CLAUDE_ENV_FILE is not set, so the GNU tools could not be put first on the Bash tool's PATH.")
    sh = shell or ""
    if os.path.basename(sh) != "bash" or bash_major(sh) < 5:
        said.append(f"gnu-shell: the Bash tool's shell is {sh or 'unknown'}, not Homebrew's bash 5 ({BASH}): `$VAR` lists do not split "
                    "(use ${=VAR} or an array) and an unmatched glob is an error. The env block in .claude/settings.json takes "
                    "effect from the next session.")
    return said

def selftest():
    import tempfile
    bad = 0
    def expect(name, ok):
        nonlocal bad
        bad += 0 if ok else 1
        print(f"{'ok  ' if ok else 'FAIL'}  {name}")
    with tempfile.TemporaryDirectory() as d:
        pre = os.path.join(d, "brew")
        for f in FORMULAS: os.makedirs(os.path.join(pre, "opt", f, "libexec", "gnubin"))
        envf = os.path.join(d, "env.sh")
        said = run(envf, BASH if os.path.exists(BASH) else "/bin/bash", pre)
        text = open(envf).read(); line = text.splitlines()[0]
        expect("every formula's gnubin written first on PATH", all(f"/opt/{f}/libexec/gnubin" in line for f in FORMULAS) and line.rstrip().endswith(':${PATH}"'))
        expect("a zsh session is warned on every command (WB-41)", '[ -n "$ZSH_VERSION" ]' in text and "RESTART" in text.upper())
        if os.path.exists(BASH): expect("bash 5 and every formula: nothing said", said == [])
        os.rmdir(os.path.join(pre, "opt", "gnu-sed", "libexec", "gnubin"))
        expect("a missing formula is said, by name", any("gnu-sed" in s for s in run(os.path.join(d, "e2.sh"), BASH, pre)))
        expect("zsh as the shell is said", any("not Homebrew's bash 5" in s for s in run(os.path.join(d, "e3.sh"), "/bin/zsh", pre)))
        expect("Apple's bash 3.2 is said", any("not Homebrew's bash 5" in s for s in run(os.path.join(d, "e4.sh"), "/bin/bash", pre)))
    print(f"gnu-shell selftest: {'PASS' if not bad else f'{bad} wrong'}")
    return 1 if bad else 0

if __name__ == "__main__":
    if "--selftest" in sys.argv: sys.exit(selftest())
    try: json.load(sys.stdin)
    except Exception: pass
    said = run(os.environ.get("CLAUDE_ENV_FILE"), os.environ.get("CLAUDE_CODE_SHELL") or os.environ.get("SHELL"))
    if said: print("\n".join(said))      # SessionStart: what is printed reaches the session's context
    sys.exit(0)
