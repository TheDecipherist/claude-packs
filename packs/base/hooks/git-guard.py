#!/usr/bin/env python3
"""git-guard: stop the git mistakes that have cost days, before the command runs (the house git laws).

A Claude Code PreToolUse hook on Bash. It reads the command about to run and exits 2 with the reason when it breaks a law:
  1. No `git add -A`, `git add .`, `git add --all`, `git commit -a`. Stage by path.
  2. No checkout / restore / stash / reset --hard / clean on a dirty tree, and no override lets one through ("a guard is
     never worked around"). `git restore --staged` (unstage only) is harmless and passes. The project's safe form, when it
     has one, is named in the refusal (guards.git.safeRestore).
  3. A push names https://...github.com/<owner>/<repo>.git with the token variable, and never forces.
  4. Every `gh` names the token: GH_TOKEN=$<tokenVar>. A repo is created as <owner>/<name> --private.
  5. A token is never written into a remote URL or a config file, and never pasted literally.
  6. Nothing under a never-staged folder (~/firmware) is staged.
  7. No commit straight onto a trunk (main, master): work lives on a branch (guards.git.branchStart says how). OFF unless the
     project switches it on (guards.git.refuseTrunk: true): a project whose history is on main moves to the branch flow
     first (a work/ branch per step), then enables it.
  8. No branch is deleted; nothing is rebased or amended; no hook is skipped (--no-verify).
Only a real git or gh call is judged: heredoc bodies and quoted text are blanked, and a part counts only when its first
word is git or gh. A `cd` or `git -C` moves the folder the dirty-tree and trunk checks look at. The laws hold in every
repo a command reaches, the project's siblings too.

The project's values come from .claude/layout.json "guards": { "git": { "owner", "tokenVar", "trunks", "neverStage",
"safeRestore", "branchStart", "accountNote", "refuseTrunk" } }; unset keys take the defaults below.

    python3 .claude/hooks/git-guard.py --selftest
"""
import json, os, re, subprocess, sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import house  # noqa: E402

DEFAULTS = {
    "owner": "TheDecipherist",
    "tokenVar": "PERSONAL_GITHUB_TOKEN",
    "trunks": ["main", "master"],
    "neverStage": ["~/firmware"],
    "safeRestore": None,
    "branchStart": "git switch -c work/<name>",
    "accountNote": "The default account on this machine is the MongoDB one.",
    "refuseTrunk": False,
}


def dirty(cwd):
    try:
        out = subprocess.run(["git", "--no-optional-locks", "status", "--porcelain"], cwd=cwd, capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return []
    return [l for l in out.splitlines() if l.strip()]


def cur_branch(cwd):
    try: return subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd, capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception: return ""


def has_head(cwd):
    try: return subprocess.run(["git", "rev-parse", "-q", "--verify", "HEAD"], cwd=cwd, capture_output=True, timeout=10).returncode == 0
    except Exception: return False


def _never_rx(entry):
    rest = re.escape(entry[2:] if entry.startswith("~/") else entry.lstrip("/"))
    return r"(~|\$HOME|/Users/[^/\s]+|/home/[^/\s]+)/" + rest if entry.startswith("~/") else rest


def check(cmd, cwd=".", dirty_fn=dirty, branch_fn=cur_branch, has_head_fn=has_head, cfg=None):
    """Return a reason string when the command must not run, else None."""
    c = {**DEFAULTS, **(cfg or {})}
    owner, tok = c["owner"], c["tokenVar"]
    body = re.sub(r"<<-?\s*['\"]?(\w+)['\"]?[\s\S]*?\n\1\b", "", cmd)
    body = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "''", body)
    here = cwd
    for part in re.split(r"&&|\|\||;|\||\n|\(|\)|`|\$\(", body):
        w = part.strip().split()
        if len(w) >= 2 and w[0] == "cd" and w[1] != "''":
            here = os.path.normpath(os.path.join(here, os.path.expanduser(w[1].replace("$HOME", "~"))))
            continue
        if len(w) >= 3 and w[0].rsplit("/", 1)[-1] == "git" and w[1] == "-C" and w[2] != "''":
            here = os.path.normpath(os.path.join(here, os.path.expanduser(w[2])))
        while w and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", w[0]) or w[0] in ("env", "command", "time", "nohup", "exec")): w = w[1:]
        if not w or w[0].rsplit("/", 1)[-1] not in ("git", "gh"): continue
        p = " ".join(w)
        if re.search(r"\bgit\b.*\badd\b.*(\s-A\b|\s--all\b|\s\.(\s|$))", p) or \
           re.search(r"\bgit\b.*\bcommit\b.*\s-[a-zA-Z]*a[a-zA-Z]*\b(?!\S)", p) and "--amend" not in p:
            return ("Stage by explicit path: `git add <paths>` and `git commit -- <paths>`. "
                    "`add -A`, `add .` and `commit -a` sweep in other work.")
        for never in c["neverStage"] or []:
            if re.search(r"\bgit\b.*\badd\b", p) and re.search(_never_rx(never), p):
                return f"Nothing under {never} is ever committed."
        undo = re.search(r"\bgit\b\s+(?:-C\s+\S+\s+)?(checkout|restore|stash|clean|reset)\b(.*)", p)
        if undo:
            verb, rest = undo.group(1), undo.group(2)
            harmless = (verb == "stash" and re.search(r"\b(list|show|pop|apply)\b", rest)) or \
                       (verb == "restore" and re.search(r"\s--staged\b", rest) and not re.search(r"\s(--worktree|-W)\b", rest)) or \
                       (verb == "reset" and "--hard" not in rest) or \
                       (verb == "checkout" and re.search(r"\s-b\b", rest)) or \
                       (verb == "clean" and re.search(r"\s-[a-zA-Z]*n", rest))
            if not harmless:
                d = dirty_fn(here)
                if d:
                    shown = "\n    ".join(d[:12])
                    safe = (f"Commit it, or use the safe form: {c['safeRestore']} (git status, every dirty file copied aside and "
                            "checked, then only those paths restored).") if c["safeRestore"] else \
                           "Commit it first (a work-in-progress commit on a branch), then undo what you meant to."
                    return (f"`git {verb}` on a tree with uncommitted work. Two days of panel work were lost this way. "
                            f"Uncommitted now:\n    {shown}\n{safe} No override exists.")
        if re.search(r"\bgit\b.*\bbranch\b.*\s(-D|-d|--delete)\b", p) or re.search(r"\bgit\b.*\bpush\b.*(\s--delete\b|\s:[\w/.-]+)", p):
            return "A branch is never deleted. Branches are the record of the build; they stay, here and on GitHub."
        if re.search(r"\bgit\b.*\b(rebase|filter-branch)\b", p) or re.search(r"\bgit\b.*\bcommit\b.*--amend", p):
            return "Nothing is rebased or amended. Make a new commit."
        if re.search(r"\bgit\b.*\s(--no-verify|-n)(\s|$)", p) and re.search(r"\bgit\b.*\b(commit|push|merge|am)\b", p):
            return ("Never --no-verify (or -n): the pre-commit hook is the gate. When it refuses, fix what it names; if a commit "
                    "must hold something that fails the gates (a planted fault for a test), do not commit it: work on an "
                    "uncommitted copy.")
        if c["refuseTrunk"] and re.search(r"\bgit\b.*\bcommit\b", p) and branch_fn(here) in (c["trunks"] or []) and has_head_fn(here):
            return f"This is the trunk. Every task is built on its own branch and merged when complete: {c['branchStart']}."
        if re.search(r"\bgit\b.*\bpush\b", p):
            if re.search(r"\s(-f|--force|--force-with-lease)\b", p):
                return "Never force a push. Nothing pushed is rebased or amended."
            if not re.search(rf"github\.com/{re.escape(owner)}/[\w.-]+", p):
                return (f"A push must name the repo: git push https://x-access-token:${tok}@github.com/{owner}/<repo>.git "
                        f"<branch>. {c['accountNote']}")
            if f"${tok}" not in p and f"${{{tok}}}" not in p:
                return f"A push names the token as ${tok}, never a pasted one."
        if re.search(r"(^|\s)gh\s", p) and f"GH_TOKEN=${tok}" not in cmd:
            return f"Every `gh` names the token: source ~/.env && GH_TOKEN=${tok} gh ... {c['accountNote']}"
        if re.search(r"\bgh\s+repo\s+create\b", p) and (f"{owner}/" not in p or "--private" not in p):
            return f"A repo is created as {owner}/<name> --private."
        if re.search(r"\bgit\b.*\b(remote\s+(add|set-url)|config)\b", p) and \
           re.search(rf"x-access-token|ghp_|github_pat_|{re.escape(tok)}", p):
            return "The token is never stored in a remote URL or a config file. Name it on the push only."
    if re.search(r"\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})", cmd):
        return f"A literal GitHub token is in this command. Use ${tok} from ~/.env."
    return None


def selftest():
    is_dirty = lambda cwd: [" M design/gen_panel.py"]
    clean = lambda cwd: []
    push = "git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/TheDecipherist/synth.git main"
    must_block = [
        ("git add -A", clean), ("git add .", clean), ("git commit -am 'x'", clean),
        ("git add ~/firmware/korg/m1.bin", clean),
        ("git -C /Users/someone/projects/other add -A", clean), ("cd ~/projects/other && git add -A", clean),
        ("cd ~/projects/other && git checkout -- tools/bank/kept.json", is_dirty),
        ("git checkout -- design/gen_panel.py", is_dirty), ("git stash", is_dirty),
        ("git restore .", is_dirty), ("git reset --hard HEAD~1", is_dirty), ("git clean -fd", is_dirty),
        ("GUARD_OK=1 git checkout -- x.h", is_dirty), ("GUARD_OK=1 git restore build/Testing/Temporary/LastTest.log", is_dirty),
        ("GUARD_OK=1 git restore --staged --worktree a.md", is_dirty), ("git restore --staged --worktree a.md", is_dirty),
        ("git push", clean), ("git push origin main", clean), (push + " --force", clean),
        ("git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/mongodb/synth.git main", clean),
        ("gh repo create TheDecipherist/synth --private", clean),
        ("source ~/.env && GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh repo create synth --private", clean),
        ("git remote add origin https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/TheDecipherist/synth.git", clean),
        ("git push https://x-access-token:" + "ghp_" + "a" * 30 + "@github.com/TheDecipherist/synth.git main", clean),
        ("git branch -D step/C1-x", clean), ("git push origin --delete step/C1-x", clean),
        ("git rebase main", clean), ("git commit --amend -m x", clean),
        ("git commit -q -m 'bench' --no-verify", clean), ("GUARD_OK=1 git commit --no-verify -m x -- a.h", clean),
        ("git push --no-verify https://x@github.com/TheDecipherist/synth.git main", clean),
    ]
    must_pass = [
        ("git add build.md src/Row.h", is_dirty), ("git commit -m 'C1: row clock' -- build.md src/Row.h", is_dirty),
        ("cd ~/projects/other && git add tools/bank/kept.json", is_dirty),
        ("git status", is_dirty), ("git checkout -- x.h", clean), ("git restore --staged x.h", is_dirty),
        ("python3 tools/safe_restore.py x.h", is_dirty),
        ("git stash list", is_dirty), ("git checkout -b c2-filter", is_dirty), (push, is_dirty),
        ("source ~/.env && GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh repo create TheDecipherist/synth --private", clean),
        ("cmake --build build --target Synth_Standalone -j8", is_dirty),
        ("git log --oneline -6 | sed -n 1,3p", is_dirty), ("git branch --list 'step/U5*' | tr -d ' *'", is_dirty),
        ("grep -n 'def push' tools/step.py", is_dirty), ("echo 'git push origin main'", is_dirty),
        ("python3 - <<'EOF'\nprint('git add -A')\nEOF", is_dirty),
    ]
    on_step = lambda cwd: "step/C1-the-ribbon"; on_trunk = lambda cwd: "main"; yes = lambda cwd: True
    TRUNK = {"refuseTrunk": True}
    bad = 0; n_block = len(must_block)
    for cmd, fn in must_block:
        if check(cmd, ".", fn, on_step, yes) is None: bad += 1; print("NOT BLOCKED:", cmd)
    for cmd in ("git commit -m 'x' -- a.h", "GUARD_OK=1 git commit -m 'x' -- a.h"):
        n_block += 1
        if check(cmd, ".", clean, on_trunk, yes, TRUNK) is None: bad += 1; print("NOT BLOCKED on trunk:", cmd)
    if check("git commit -m 'x' -- a.h", ".", clean, on_trunk, yes) is not None: bad += 1; print("WRONGLY BLOCKED: a commit on main with the trunk refusal off (the default)")
    if check("git commit -m 'first' -- a.h", ".", clean, on_trunk, lambda c: False, TRUNK) is not None: bad += 1; print("WRONGLY BLOCKED: first commit")
    by_dir = lambda c: "work/x" if c.endswith("wt") else "main"
    if check("cd /r/wt && git commit --no-edit", "/r", clean, by_dir, yes, TRUNK) is not None: bad += 1; print("WRONGLY BLOCKED: commit after cd into a worktree on a branch")
    if check("git -C /r/wt commit --no-edit", "/r", clean, by_dir, yes, TRUNK) is not None: bad += 1; print("WRONGLY BLOCKED: git -C a worktree on a branch")
    if check("cd /r && git commit --no-edit", "/r/wt", clean, by_dir, yes, TRUNK) is None: bad += 1; print("NOT BLOCKED: cd onto the trunk then commit")
    for cmd, fn in must_pass:
        r = check(cmd, ".", fn, on_step, yes)
        if r is not None: bad += 1; print("WRONGLY BLOCKED:", cmd, "->", r)
    # a project's own values (layout.json guards.git): another owner, token and trunk, its safe-restore and branch command
    other = {"owner": "Acme", "tokenVar": "ACME_TOKEN", "trunks": ["trunk"], "safeRestore": "python3 tools/safe_restore.py <paths>",
             "branchStart": "python3 tools/step.py start <STEP> \"task\"", "refuseTrunk": True}
    acme = "git push https://x-access-token:$ACME_TOKEN@github.com/Acme/app.git b"
    for cmd, fn, br, want in [(acme, clean, on_step, None), (push, clean, on_step, "Acme"), ("git commit -m x -- a", clean, lambda c: "trunk", "tools/step.py"),
                              ("git commit -m x -- a", clean, on_trunk, None), ("git stash", is_dirty, on_step, "safe_restore.py")]:
        r = check(cmd, ".", fn, br, yes, other)
        n_block += want is not None
        if (r is None) != (want is None) or (want and want not in r): bad += 1; print("WRONG with a project's own values:", cmd, "->", r)
    print(f"git-guard selftest: {n_block} blocked, {len(must_pass) + 2} passed, {bad} wrong")
    return 1 if bad else 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    cmd = (data.get("tool_input") or {}).get("command", "")
    if "git" not in cmd and "gh " not in cmd and "ghp_" not in cmd and "github_pat_" not in cmd:
        sys.exit(0)
    reason = check(cmd, data.get("cwd") or os.getcwd(), cfg=house.guard("git", DEFAULTS))
    if reason:
        print("git-guard: " + reason, file=sys.stderr)
        sys.exit(2)
    sys.exit(0)
