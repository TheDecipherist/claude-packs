// rules-reach-the-shell (PreToolUse, Bash; 2.0.0): a rule scoped by `paths:` reaches a session that touches its files through the shell.
// Claude Code loads a path-scoped rule when a tool touches a matching file, and for Bash only when its own reading of the command
// happens to match: supernova2_monitor's W0.2 task did all 21 calls in Bash (cat build.md, python heredoc edits, cat >> docs/versions.md)
// and plan-and-logs and commit-says-why never loaded, while the supervisor's `cat .../workorder.md` loaded 51 (KWB-next, 2026-11-14).
// For each project file a Bash command reads through a content reader (cat, head, sed ...) or writes, outside .claude/, every rule whose globs match it and that this session has not loaded yet is
// given to the model whole, as the call's additional context, and logged in rules.jsonl with why "shell_path_match", as rule-log logs
// a harness load. Refuses nothing.
import { appendFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { matchesAny } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { toJson } from './lib/json.mts';
import { insideProject } from './lib/project.mts';
import { heldNow, lawOf } from './lib/rules-held.mts';
import { bashOf, put, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { cutHeredocs, lex, splitCommand } from './lib/shell-lex.mts';
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

/** The programs that print a file's text, so a file given to one enters the context. A script run (`node tools/x.mjs`,
 *  `bash run.sh`) is none of them: the script's own text never reaches the model (KWB-228: supernova2_monitor's supervisor was
 *  given 23 pack rules for `head tools/run-task.sh` and 38 more for `node tools/fired.mjs`, none of them about either file). */
export const READERS: ReadonlySet<string> = new Set(['cat', 'head', 'tail', 'sed', 'awk', 'grep', 'egrep', 'fgrep', 'rg', 'nl',
  'less', 'more', 'bat', 'tac', 'cut', 'sort', 'uniq', 'diff', 'jq', 'column', 'paste']);

/** The words a command gives its readers as files: in each simple command led by a reader (past `VAR=x` and `sudo`, `env`,
 *  `command`, `time`), each word that is no option and no redirect's target. A heredoc's body is never a reader's argument. */
export function readerArgs(command: string): string[] {
  const args: string[] = [];
  for (const part of splitCommand(cutHeredocs(command).text, { newline: true, subshell: true })) {
    const toks = lex(part);
    let i = 0;
    while (i < toks.length) {
      const t = toks[i];
      if (!t || !('w' in t) || !(/^\w+=/.test(t.w) || ['sudo', 'env', 'command', 'time'].includes(t.w))) break;
      i += 1;
    }
    const lead = toks[i];
    if (!lead || !('w' in lead) || !READERS.has(basename(lead.w))) continue;
    for (let j = i + 1; j < toks.length; j += 1) {
      const t = toks[j];
      if (!t) continue;
      if (!('w' in t)) { j += 1; continue; }
      if (!t.w.startsWith('-') && !t.w.startsWith('~')) args.push(t.w);
    }
  }
  return args;
}

/** The project files a command reads through a reader (each argument resolved from the call's folder, the project or a `cd`
 *  target) or writes (as the write hooks read it, an inline program's writes among them), relative to the project. Nothing under
 *  `.claude/` counts: the kit's own files, its logs and the installed rules are no rule's subject in the project. */
export function filesTouched(command: string, cwd: string, projectDir: string, written: readonly string[]): string[] {
  const bases = [cwd, projectDir, ...[...command.matchAll(/\bcd\s+["']?([^\s"';&|]+)/g)].map((m) => resolve(cwd, m[1] ?? '.'))];
  const found = new Set<string>();
  for (const w of readerArgs(command)) for (const b of bases) { const p = resolve(b, w); if (isFile(p) && insideProject(projectDir, p, cwd)) found.add(p); }
  for (const p of written) if (insideProject(projectDir, p, cwd)) found.add(p);
  return [...found].map((p) => relative(projectDir, p)).filter((r) => r && !r.startsWith('..') && !r.startsWith('.claude/'));
}

/** The most this hook gives in one call. Claude Code cuts a hook event's output at 10,000 characters, and the runner merges every
 *  hook's context under that one cut: a rule past it is lost though logged as given (55,113 characters were cut once). */
export const GIVE_BUDGET = 6000;

interface Match { rule: PathRule; trigger: string }
// The rules a session matched and has not been given yet, because the budget was spent: they go first on its next Bash call.
const pendingBySession = new Map<string, Match[]>();

/** As many of `todo` as fit the budget (one at least, so a long rule is never held for ever), and the rest. */
export function withinBudget(todo: readonly Match[], text: (m: Match) => string, budget = GIVE_BUDGET): { give: Match[]; rest: Match[] } {
  const give: Match[] = [];
  let size = 0;
  for (const [i, m] of todo.entries()) {
    const n = text(m).length;
    if (give.length > 0 && size + n > budget) return { give, rest: todo.slice(i) };
    give.push(m);
    size += n;
  }
  return { give, rest: [] };
}

/** A rule as given: whole the first time, its law alone when the session held it before a compaction (KWB-231). */
const contentsOf = (before: ReadonlySet<string>) => ({ rule, trigger }: Match): string => (before.has(rule.name)
  ? `The law of ${rule.file} again, after a compaction (its paths match ${trigger}; the whole file: Read it):\n\n${lawOf(rule.body)}`
  : `Contents of ${rule.file} (its paths match ${trigger}, which this command touches):\n\n${rule.body}`);

export const hook: Hook = (event, ctx) => {
  const command = event.tool_input?.command;
  if (event.hook_event_name !== 'PreToolUse' || event.tool_name !== 'Bash' || typeof command !== 'string') return pass;
  const key = `${ctx.projectDir}\n${event.session_id ?? ''}`;
  const pending = pendingBySession.get(key) ?? [];
  const cwd = event.cwd ?? ctx.projectDir;
  const written = writesOf(event, cwd, ctx.env).map((w) => w.path);
  const files = filesTouched(command, cwd, ctx.projectDir, written);
  if (!files.length && !pending.length) return pass;
  const matched = files.length ? pathRules(ctx.projectDir).flatMap((rule) => {
    const trigger = files.find((f) => matchesAny(f, rule.globs));
    return trigger ? [{ rule, trigger }] : [];
  }) : [];
  const all = [...pending, ...matched.filter((m) => !pending.some((p) => p.rule.name === m.rule.name))];
  if (!all.length) return pass;
  const state = heldNow(ctx.projectDir, event.session_id, key);
  const held = state.rules;
  const contents = contentsOf(state.before);
  const { give, rest } = withinBudget(all.filter(({ rule }) => !held.has(rule.name)), contents);
  if (event.session_id) pendingBySession.set(key, rest);
  for (const { rule, trigger } of give) {
    held.add(rule.name);
    logUsage(ctx, event, RULES, { rule: rule.name, file: rule.file, why: 'shell_path_match', globs: rule.globs, trigger });
  }
  if (!give.length) return pass;
  const more = rest.length ? `\n\n${rest.length} more rule(s) match the files this session touches and come with its next Bash call: ${rest.map((m) => m.rule.name).join(', ')}.` : '';
  return say({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: give.map(contents).join('\n\n') + more } });
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
  put(join(dir, '.claude/rules/hooks.md'), '---\npaths:\n  - ".claude/hooks/**"\n---\n\n# Hooks are seen red\n');
  put(join(dir, '.claude/hooks/guard.mjs'), '// a guard\n');
  const ownHooks = sh('cat .claude/hooks/guard.mjs', 's6');
  const scriptRun = sh('node docs/x/v.md --selftest && wc -l build.md', 's7');
  const before = sh('head -3 build.md', 's8');
  const heldStill = sh('tail -1 build.md', 's8');
  appendFileSync(join(dir, RULES), `${toJson({ session: 's8', rule: 'always', why: 'compact' })}\n`);
  const afterCompact = sh('sed -n 1p build.md', 's8');
  put(join(dir, '.claude/rules/law.md'), '---\npaths:\n  - "law/**"\n---\n\n# Law\n\nWhy it exists, at length.\n\n<constraints>\nAlways do:\n- Keep the law.\n</constraints>\n');
  put(join(dir, 'law/a.md'), '# a\n');
  const lawFirst = sh('cat law/a.md', 's9');
  appendFileSync(join(dir, RULES), `${toJson({ session: 's9', rule: 'always', why: 'compact' })}\n`);
  const lawAgain = sh('head -1 law/a.md', 's9');
  const long = (n: string): string => `---\npaths:\n  - "notes/**"\n---\n\n# Long ${n}\n\n${'Keep it. '.repeat(280)}\n`;
  const big = scratchProject({ '.claude/rules/l1.md': long('one'), '.claude/rules/l2.md': long('two'), '.claude/rules/l3.md': long('three'), 'notes/n.md': '# n\n' });
  const budgeted = runHook(hookFile, big, { ...bashOf('cat notes/n.md', big), hook_event_name: 'PreToolUse', session_id: 'b1' });
  const bigLogged = (readText(join(big, RULES)) ?? '').split('\n').filter(Boolean);
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
    ['a file under .claude/ reaches no rule, whatever its globs', /Hooks are seen red/.test(ownHooks.stdout) ? 1 : 0, 0],
    ['a script run, or a count of lines, is no read of the file', scriptRun.stdout, ''],
    ['a session given a rule', /Plan and logs/.test(before.stdout) ? 1 : 0, 1],
    ['is not given it again before a compaction', heldStill.stdout, ''],
    ['and is given it again after one', /Plan and logs/.test(afterCompact.stdout) ? 1 : 0, 1],
    ['a rule given the first time comes whole', /Why it exists[\s\S]*Keep the law/.test(lawFirst.stdout) ? 1 : 0, 1],
    ['given again after a compaction, its law alone', /The law of[\s\S]*Keep the law/.test(lawAgain.stdout) && !/Why it exists/.test(lawAgain.stdout) ? 1 : 0, 1],
    ['each giving is one log line', logged().filter((l) => l.includes('shell_path_match')).length, 8],
    ['three long rules: the output stays within the budget', budgeted.stdout.length <= GIVE_BUDGET + 600 ? 1 : 0, 1],
    ['and the one held back is named, not given', /Long two/.test(budgeted.stdout) && !/# Long three/.test(budgeted.stdout) && /1 more rule\(s\).*l3/.test(budgeted.stdout) ? 1 : 0, 1],
    ['only the rules given are logged', bigLogged.length, 2],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'rules-reach-the-shell', hook, selftest);
