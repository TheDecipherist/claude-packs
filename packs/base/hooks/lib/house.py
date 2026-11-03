"""house: what the python hooks share: the project root, its .claude/layout.json and a guard's settings.

A hook imports it with its own folder's lib/ on sys.path and byte-code writing off, so no __pycache__ appears in a project:

    sys.dont_write_bytecode = True; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
    import house

A project's values for a guard live in layout.json under "guards": { "<guard>": { ... } }; a key it does not set takes the
hook's default, so a project with no "guards" gets the house defaults.
"""
import json, os, re, time

LOG = os.path.join(".claude", "hooks.log")
LOG_MAX_BYTES = 256 * 1024


def project_root():
    """The project the session runs in (CLAUDE_PROJECT_DIR), else the current folder."""
    return os.path.abspath(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())


def main_root(path):
    """A path inside <project>/.claude/worktrees/<name>/ belongs to <project>; any other path is returned as it is."""
    m = re.match(r"^(.*?)/\.claude/worktrees/[^/]+(?:/|$)", path.replace(os.sep, "/"))
    return m.group(1) if m else path


def layout(root=None):
    try:
        with open(os.path.join(root or project_root(), ".claude", "layout.json"), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def guard(name, defaults, root=None):
    """The guard's settings: its defaults, overridden key by key by layout.json's guards.<name>."""
    got = (layout(root).get("guards") or {}).get(name) or {}
    return {**defaults, **got}


def shell_writes(command, cwd):
    """The files a shell command writes, with their text before and after: [{path, op, before, after}] (after None when it
    cannot be known). One reader of the shell for every hook: lib/shell-writes.mjs, run by node (WB-69)."""
    import subprocess
    lib = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shell-writes.mjs")
    try:
        r = subprocess.run(["node", lib, "--json"], input=json.dumps({"command": command, "cwd": cwd}), capture_output=True, text=True, timeout=15)
        return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else []
    except Exception:
        return []


def folders_of_kind(lay, kind):
    """The paths of every layout folder of one kind ("copy": a read-only copy of another project's code)."""
    return [f["path"].rstrip("/") for f in (lay.get("folders") or {}).values() if isinstance(f, dict) and f.get("kind") == kind]


def log_hook(hook, event, ms, code, tool="-", root=None):
    """One timing line per call in <project>/.claude/hooks.log, the same line lib/hook-log.mjs writes (KWB-24): ISO time,
    event, hook, ms, exit code, tool, tab-separated; past LOG_MAX_BYTES cut to its newest half at a line. Never raises,
    never creates .claude. ms is from the hook's own start (python's start-up before it is not counted)."""
    try:
        base = root or project_root()
        if not os.path.isdir(os.path.join(base, ".claude")):
            return
        path = os.path.join(base, LOG)
        clean = lambda v: (str(v if v is not None else "-").replace("\t", " ").replace("\n", " ") or "-")
        now = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + ".%03dZ" % int((time.time() % 1) * 1000)
        with open(path, "a", encoding="utf-8") as f:
            f.write(f"{now}\t{clean(event)}\t{clean(hook)}\t{round(ms)}\t{code}\t{clean(tool)}\n")
        if os.path.getsize(path) > LOG_MAX_BYTES:
            with open(path, encoding="utf-8") as f:
                keep = f.read()[-(LOG_MAX_BYTES // 2):]
            with open(path, "w", encoding="utf-8") as f:
                f.write(keep[keep.find("\n") + 1:])
    except Exception:
        pass
