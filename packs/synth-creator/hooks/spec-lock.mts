// Spec lock: while a build runs, the spec it builds from cannot change under it.
// State: .claude/spec-lock.json  { "locked": true, "globs": [...], "reason": "...", "since": "..." }
//   node spec-lock.mjs lock "<reason>" [glob ...]   lock (Claude may do this when a build starts)
//   node spec-lock.mjs unlock                       unlock (the USER runs this, e.g. `! node ...`)
//   node spec-lock.mjs status
//   node spec-lock.mjs --selftest                 proves the hook
// As a PreToolUse hook (Write|Edit|MultiEdit|NotebookEdit|Bash) it blocks writes to locked files by any route
// (lib/writes.mts: a tool, or the shell's >, >>, tee, sed -i, cp, mv, a heredoc), writes to the lock file itself,
// and Claude running "unlock". Words inside a heredoc body or quotes are text, never the unlock command.
// On the hook contract (typescript order W4): the hook is a judge and writes nothing; lock and unlock are the user's commands.
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './lib/glob.mts';
import { isMain, projectRoot, runAsHook } from './lib/hook-log.mts';
import type { FlagHandler } from './lib/hook-log.mts';
import { readJson, writeJson } from './lib/json.mts';
import { checkoutRoot, commandLeavesProject, insideProject, relInCheckout } from './lib/project.mts';
import { bashOf, put, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext, HookEvent, Verdict } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { writesOf } from './lib/writes.mts';

/** `.claude/spec-lock.json`. */
export interface SpecLockState { locked?: boolean; globs?: string[]; reason?: string; since?: string }

const LOCK_FILE = join('.claude', 'spec-lock.json');
export const DEFAULT_GLOBS: readonly string[] = ['spec/**', 'specs/**', 'docs/stellix-*.md', '**/*-spec.md', '**/*.mmd', '**/panel.json', '**/build.md', '**/decisions*.md'];
const WRITE_CMD = /(>|>>|\btee\b|\bsed\s+-i|\bperl\s+-i|\bmv\b|\bcp\b|\brm\b|\btruncate\b|\bgit\s+(checkout|restore)\b)/;
const HOW_TO = 'To change the spec, stop and ask the user. Only the user unlocks: `! node .claude/hooks/spec-lock.mjs unlock`.';

const readState = (root: string): SpecLockState => readJson<SpecLockState>(join(root, LOCK_FILE)) ?? { locked: false };

/** What `lock`, `unlock` and `status` print; lock and unlock write the state file (and throw when it cannot be written). */
export function cliText(root: string, args: readonly string[], now: Date): string {
  const [cmd, reason, ...globs] = args;
  if (cmd !== 'lock' && cmd !== 'unlock') return JSON.stringify(readState(root), null, 2);
  const next: SpecLockState = cmd === 'lock'
    ? { locked: true, globs: globs.length ? globs : [...DEFAULT_GLOBS], reason: reason ?? 'build in progress', since: now.toISOString() }
    : { ...readState(root), locked: false };
  if (!writeJson(join(root, LOCK_FILE), next, { pretty: true })) throw new Error(`spec-lock: could not write ${join(root, LOCK_FILE)}`);
  return cmd === 'lock' ? 'Spec locked.' : 'Spec unlocked.';
}

const block = (msg: string): Verdict => refuse(`BLOCKED by spec-lock: ${msg}\n`);

// Every file the call writes, whichever tool: the lock file never, a locked spec file not while locked.
function judgeWrites(event: HookEvent, state: SpecLockState, ctx: HookContext): Verdict | null {
  for (const w of writesOf(event, ctx.cwd, ctx.env)) {
    if (!insideProject(ctx.projectDir, w.path, ctx.cwd)) continue;
    const rel = relative(checkoutRoot(ctx.projectDir, w.path, ctx.cwd), w.path);
    if (rel === LOCK_FILE) return block(`the lock file can't be edited. ${HOW_TO}`);
    if (state.locked && matchesAny(rel, state.globs ?? [])) return block(`${rel} is locked since ${state.since} (${state.reason}). ${HOW_TO}`);
  }
  return null;
}

// A shell command: Claude unlocking, the lock file written, a locked path named by a command that writes.
function judgeShell(event: HookEvent, state: SpecLockState, ctx: HookContext): Verdict | null {
  const cmd = event.tool_input?.command ?? '';
  const bare = cmd.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?:\n|$)/g, '\n').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  if (/spec-lock/.test(bare) && /\bunlock\b/.test(bare)) return block(`Claude may not unlock the spec. ${HOW_TO}`);
  if (/spec-lock\.json/.test(bare) && WRITE_CMD.test(bare)) return block(`the lock file can't be edited. ${HOW_TO}`);
  const routed = judgeWrites(event, state, ctx);
  if (routed) return routed;
  if (!state.locked || commandLeavesProject(ctx.projectDir, cmd, ctx.cwd, ctx.env.HOME)) return null;
  // Each word as a path in its own checkout, so a worktree's spec/ is the spec too.
  const base = event.cwd ?? ctx.projectDir;
  const toRel = (t: string): string | null => {
    const abs = resolve(base, t.replace(/^['"]|['"]$/g, ''));
    return insideProject(ctx.projectDir, abs, ctx.cwd) ? relInCheckout(ctx.projectDir, abs, ctx.cwd) : null;
  };
  const touched = cmd.split(/\s+/).filter((t) => {
    const rel = t ? toRel(t) : null;
    return rel !== null && matchesAny(rel, state.globs ?? []);
  });
  return touched.length && WRITE_CMD.test(cmd) ? block(`${touched.join(', ')} locked (${state.reason}). ${HOW_TO}`) : null;
}

export const hook: Hook = (event, ctx) => {
  const state = readState(ctx.projectDir);
  return (event.tool_name === 'Bash' ? judgeShell(event, state, ctx) : judgeWrites(event, state, ctx)) ?? pass;
};

/** A locked spec file is refused in a worktree, by a tool and by the shell; the code beside it is not. */
export const worktreeCase: WorktreeCase = {
  files: { '{here}/.claude/spec-lock.json': JSON.stringify({ locked: true, globs: DEFAULT_GLOBS, reason: 'build running', since: 'now' }) },
  steps: [
    { label: 'a locked spec file by a tool', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/docs/stellix-spec.md', content: '// x\n' } }, want: 2 },
    { label: 'code while the spec is locked', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/dsp/Svf.cpp', content: '// x\n' } }, want: 0 },
    { label: 'a shell edit of the spec', event: { tool_name: 'Bash', tool_input: { command: "sed -i '' s/a/b/ {wt}/spec/plan.md" } }, want: 2 },
    { label: 'a shell edit of the code', event: { tool_name: 'Bash', tool_input: { command: "sed -i '' s/a/b/ {wt}/src/dsp/Svf.cpp" } }, want: 0 },
  ],
};

export function selftest(): number {
  const me = fileURLToPath(import.meta.url);
  const state = (locked: boolean): string => JSON.stringify({ locked, globs: DEFAULT_GLOBS, reason: 'build running', since: 'now' });
  const dir = scratchProject({ '.claude/spec-lock.json': state(true), 'spec/plan.md': 'x\n' });
  const open = scratchProject({ '.claude/spec-lock.json': state(false) });
  const before = snapshot(dir);
  const w = (root: string, file: string): number | null => runHook(me, root, writeOf(join(root, file))).status;
  const sh = (root: string, cmd: string): number | null => runHook(me, root, bashOf(cmd, root)).status;
  const rows: [string, number | string | null, number | string][] = [
    ['a locked spec file', w(dir, 'spec/plan.md'), 2],
    ['a panel.json anywhere', w(dir, 'panel/panel.json'), 2],
    ['code while the spec is locked', w(dir, 'src/dsp/Svf.cpp'), 0],
    ['the lock file', w(dir, '.claude/spec-lock.json'), 2],
    ['Claude running unlock', sh(dir, 'node .claude/hooks/spec-lock.mjs unlock'), 2],
    ['a shell edit of the spec', sh(dir, 'sed -i s/a/b/ spec/plan.md'), 2],
    ['reading the spec', sh(dir, 'cat spec/plan.md'), 0],
    ['the word unlock in a heredoc is text', sh(dir, "cat > notes.txt <<'EOF'\nnode .claude/hooks/spec-lock.mjs unlock\nEOF"), 0],
    ['a heredoc into the spec', sh(dir, "cat > spec/plan.md <<'EOF'\nnew\nEOF"), 2],
    ['an unlocked spec', w(open, 'spec/plan.md'), 0],
  ];
  const trapped = writtenSince(dir, before);   // only the hook ran in dir: the shell rows are judged, never run
  const mine = scratchProject();
  put(join(mine, '.claude/layout.json'), '{}');
  const lockRun = runHook(me, mine, null, ['lock', 'selftest', 'spec/**']);
  const locked = readState(mine);
  rows.push(['lock writes the lock file', `${lockRun.status}:${locked.locked}:${locked.globs?.join(',')}`, '0:true:spec/**']);
  rows.push(['unlock opens it', `${runHook(me, mine, null, ['unlock']).status}:${readState(mine).locked}`, '0:false']);
  rows.push(['a judge writes no file (the write trap)', trapped.join(','), '']);
  return verdicts('spec-lock', rows);
}

if (isMain(import.meta.url)) {
  const root = projectRoot();
  const cli: FlagHandler = (args) => { console.log(cliText(root, args, new Date())); return 0; };
  await runAsHook(import.meta.url, 'spec-lock', hook, selftest, { flags: { lock: cli, unlock: cli, status: cli } });
}
