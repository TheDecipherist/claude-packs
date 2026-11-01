"""house: what the python hooks share: the project root, its .claude/layout.json and a guard's settings.

A hook imports it with its own folder's lib/ on sys.path and byte-code writing off, so no __pycache__ appears in a project:

    sys.dont_write_bytecode = True; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
    import house

A project's values for a guard live in layout.json under "guards": { "<guard>": { ... } }; a key it does not set takes the
hook's default, so a project with no "guards" gets the house defaults.
"""
import json, os, re


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


def folders_of_kind(lay, kind):
    """The paths of every layout folder of one kind ("copy": a read-only copy of another project's code)."""
    return [f["path"].rstrip("/") for f in (lay.get("folders") or {}).values() if isinstance(f, dict) and f.get("kind") == kind]
