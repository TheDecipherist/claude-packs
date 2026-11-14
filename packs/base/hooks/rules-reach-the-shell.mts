// rules-reach-the-shell (PreToolUse, Bash; 2.0.0): a rule scoped by `paths:` reaches a session that touches its files through the shell.
// Claude Code loads a path-scoped rule when a tool touches a matching file, and for Bash only when its own reading of the command
// happens to match: supernova2_monitor's W0.2 task did all 21 calls in Bash (cat build.md, python heredoc edits, cat >> docs/versions.md)
// and plan-and-logs and commit-says-why never loaded, while the supervisor's `cat .../workorder.md` loaded 51 (KWB-next, 2026-11-14).
// For each project file a Bash command names or writes, every rule whose globs match it and that this session has not loaded yet is
// given to the model whole, as the call's additional context, and logged in rules.jsonl with why "shell_path_match", as rule-log logs
// a harness load. Refuses nothing.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { matchesAny } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { parseJson } from './lib/json.mts';
import { insideProject } from './lib/project.mts';
import { bashOf, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { RULES, logUsage } from './lib/usage-log.mts';
import { pass, say } from './lib/verdict.mts';
import { writesOf } from './lib/writes.mts';

/** A project rule with `paths:`: its name, its file (relative to the project), its globs and its text without the frontmatter. */
export interface PathRule { name: string; file: string; globs: string[]; body: string }

/** The globs of a rule's frontmatter `paths:` list; [] for a rule with none (it loads at session start). */
export function globsOf(text: string): string[] {
  const head = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  if (!head) return [];
  const at = head.split('\n').findIndex((l) => /^paths:\s*$/.test(l));
  if (at < 0) return [];
  const globs: string[] = [];
  for (const line of head.split('\n').slice(at + 1)) {
    const m = /^\s+-\s+["']?([^"']+?)["']?\s*$/.exec(line);
    if (!m) break;
    globs.push(m[1] ?? '');
  }
  return globs.filter(Boolean);
}

// A rule file read once, kept while its mtime holds: the resident runner keeps this module loaded, and re-reading all 85 rules
// of a project on every Bash call cost 6 ms of a 10 ms budget (KWB-next, WB-8 in supernova2_monitor).
const ruleCache = new Map<string, { mtime: number; rule: PathRule | null }>();

function ruleOf(dir: string, f: string): PathRule | null {
  const path = join(dir, f);
  let mtime: number;
  try { mtime = statSync(path).mtimeMs; } catch { return null; }
  const hit = ruleCache.get(path);
  if (hit && hit.mtime === mtime) return hit.rule;
  const text = readText(path) ?? '';
  const globs = globsOf(text);
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
  const rule = globs.length ? { name: basename(f, '.md'), file: `.claude/rules/${f}`, globs, body } : null;
  ruleCache.set(path, { mtime, rule });
  return rule;
}

/** Every rule of the project's .claude/rules/ that is scoped by paths. */
export function pathRules(projectDir: string): PathRule[] {
  const dir = join(projectDir, '.claude', 'rules');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).flatMap((f) => {
    const rule = ruleOf(dir, f);
    return rule ? [rule] : [];
  });
}

const isFile = (p: string): boolean => { try { return statSync(p).isFile(); } catch { return false; } };

/** The project files a command names (any word that resolves to a file, from the call's folder, the project or a `cd` target) or
 *  writes (as the write hooks read it), relative to the project. A heredoc body is searched too: a program's paths are in it. */
export function filesTouched(command: string, cwd: string, projectDir: string, written: readonly string[]): string[] {
  const bases = [cwd, projectDir, ...[...command.matchAll(/\bcd\s+["']?([^\s"';&|]+)/g)].map((m) => resolve(cwd, m[1] ?? '.'))];
  const named = [...command.matchAll(/[A-Za-z0-9_.~/+-]*[./][A-Za-z0-9_.~/+-]*/g)].map((m) => m[0]).filter((w) => w.length > 1 && !w.startsWith('~'));
  const found = new Set<string>();
  for (const w of named) for (const b of bases) { const p = resolve(b, w); if (isFile(p) && insideProject(projectDir, p, cwd)) found.add(p); }
  for (const p of written) if (insideProject(projectDir, p, cwd)) found.add(p);
  return [...found].map((p) => relative(projectDir, p)).filter((r) => r && !r.startsWith('..') && !r.startsWith('.claude/'));
}

// The rules each session is known to hold. A rule once loaded stays in the context, so the set only grows: the log is read again
// only when a matching rule is not in it yet (key: project and session).
const heldBySession = new Map<string, Set<string>>();

/** The rules this session already holds: every rules.jsonl line of this session, whatever loaded it. */
function loadedIn(projectDir: string, session: string | undefined): Set<string> {
  if (!session) return new Set();
  return new Set((readText(join(projectDir, RULES)) ?? '').split('\n').flatMap((l) => {
    const e = parseJson<{ session?: string; rule?: string }>(l);
    return e?.session === session && e.rule ? [e.rule] : [];
  }));
}

export const hook: Hook = (event, ctx) => {
  const command = event.tool_input?.command;
  if (event.hook_event_name !== 'PreToolUse' || event.tool_name !== 'Bash' || typeof command !== 'string') return pass;
  const cwd = event.cwd ?? ctx.projectDir;
  const written = writesOf(event, cwd, ctx.env).map((w) => w.path);
  const files = filesTouched(command, cwd, ctx.projectDir, written);
  if (!files.length) return pass;
  const matched = pathRules(ctx.projectDir).flatMap((rule) => {
    const trigger = files.find((f) => matchesAny(f, rule.globs));
    return trigger ? [{ rule, trigger }] : [];
  });
  if (!matched.length) return pass;
  const key = `${ctx.projectDir}\n${event.session_id ?? ''}`;
  let held = heldBySession.get(key) ?? new Set<string>();
  if (matched.some(({ rule }) => !held.has(rule.name))) held = new Set([...held, ...loadedIn(ctx.projectDir, event.session_id)]);
  if (event.session_id) heldBySession.set(key, held);
  const given: string[] = [];
  for (const { rule, trigger } of matched) {
    if (held.has(rule.name)) continue;
    held.add(rule.name);
    logUsage(ctx, event, RULES, { rule: rule.name, file: rule.file, why: 'shell_path_match', globs: rule.globs, trigger });
    given.push(`Contents of ${rule.file} (its paths match ${trigger}, which this command touches):\n\n${rule.body}`);
  }
  if (!given.length) return pass;
  return say({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: given.join('\n\n') } });
};

/** A rule reaches a shell call on a file in the worktree as in the main checkout; the log is the main checkout's. */
export const worktreeCase: WorktreeCase = {
  files: { '{here}/.claude/rules/notes.md': '---\npaths:\n  - "notes/**/*.md"\n---\n\n# notes rule\n', '{here}/notes/a.md': '# a\n', '{wt}/notes/a.md': '# a\n' },
  steps: [
    { label: 'cat of a matching file in the worktree', event: { tool_name: 'Bash', tool_input: { command: 'cat {wt}/notes/a.md' } }, want: 0 },
    { label: 'cat of a matching file in the main checkout', event: { tool_name: 'Bash', tool_input: { command: 'cat {here}/notes/a.md' } }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const rule = '---\n# concepts: notes\npaths:\n  - "build.md"\n  - "docs/**/*.md"\n---\n\n# Plan and logs\n\nAlways date a log line.\n';
  const dir = scratchProject({ '.claude/rules/plan.md': rule, '.claude/rules/always.md': '# loads at start\n', 'build.md': '# b\n', 'docs/x/v.md': '# v\n', 'src/a.txt': 'a\n' });
  const sh = (command: string, session = 's1') => runHook(hookFile, dir, { ...bashOf(command, dir), hook_event_name: 'PreToolUse', session_id: session });
  const logged = (): string[] => (readText(join(dir, RULES)) ?? '').split('\n').filter(Boolean);
  const first = sh('cat build.md 2>/dev/null | head -5');
  const again = sh('cat docs/x/v.md');
  const other = sh('cat src/a.txt', 's2');
  const heredoc = sh("python3 - <<'EOF'\np='docs/x/v.md'\nopen(p,'a').write('x')\nEOF", 's3');
  const appended = sh('cat >> docs/x/new.md <<EOF\nrow\nEOF', 's4');
  const cdRel = sh('cd docs && cat x/v.md', 's5');
  return verdicts('rules-reach-the-shell', [
    ['a cat of build.md passes', first.status, 0],
    ['and gives the rule whole', /Plan and logs[\s\S]*Always date a log line/.test(first.stdout) && first.stdout.includes('additionalContext') ? 1 : 0, 1],
    ['and logs it as shell_path_match with its trigger', /"rule":"plan".*"why":"shell_path_match".*"trigger":"build.md"/.test(logged()[0] ?? '') ? 1 : 0, 1],
    ['a rule this session holds is not given again', again.stdout, ''],
    ['a file no rule names gives nothing', other.stdout, ''],
    ['a rule with no paths is never given', /loads at start/.test(first.stdout + heredoc.stdout) ? 1 : 0, 0],
    ['a path inside a heredoc program reaches its rule', /Plan and logs/.test(heredoc.stdout) ? 1 : 0, 1],
    ['a new file appended through a redirect reaches its rule', /Plan and logs/.test(appended.stdout) ? 1 : 0, 1],
    ['a path relative to a cd target reaches its rule', /Plan and logs/.test(cdRel.stdout) ? 1 : 0, 1],
    ['each giving is one log line', logged().length, 4],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'rules-reach-the-shell', hook, selftest);
