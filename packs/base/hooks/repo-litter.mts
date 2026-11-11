// PreToolUse (Bash): what lands in git stays in its history for ever. `git add` of a file over the size limit, a working screenshot in the repo root or a debug
// dump is refused. One real repo carried 991 MB, with 22 screenshots in its root and 64 MB files. Limits are in layout.json "guards": { "repoLitter": { "maxFileMb": 10,
// "allow": ["<glob>"] } }. `--selftest` proves it.
// A judge on the hook contract (typescript order W4). The limit and the root-screenshot test live in lib/litter.mts, where the CLI
// reads them too; they are re-exported here so lib/repo-weight.mjs keeps its import until the CLI moves (wave 2).
import { statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gitAdds } from './lib/git-adds.mts';
import { gitLines } from './lib/git-run.mts';
import { matchesAny } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { readLayout } from './lib/layout.mts';
import { BIG_MB, isRootImage } from './lib/litter.mts';
import { checkoutRoot, claudeRoot } from './lib/project.mts';
import { bashOf, git, put, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext, Layout } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';
import { fileURLToPath } from 'node:url';

export { BIG_MB, isRootImage };

const MB = 1024 * 1024;
const DUMP = /\.(har|heapsnapshot|dmp|core|log)$/i;

/** layout.json `guards.repoLitter`: the size limit and the globs a project allows. */
export interface LitterConfig { maxFileMb?: number; allow?: readonly string[] }

/** The project's repoLitter settings, read from its layout (anything that is not the shape above is left out). */
export function litterConfig(layout: Layout): LitterConfig {
  const raw: unknown = layout.guards?.['repoLitter'];
  if (raw === null || typeof raw !== 'object') return {};
  const maxFileMb = 'maxFileMb' in raw ? raw.maxFileMb : undefined;
  const allow = 'allow' in raw ? raw.allow : undefined;
  return {
    ...(typeof maxFileMb === 'number' ? { maxFileMb } : {}),
    ...(Array.isArray(allow) ? { allow: allow.filter((g): g is string => typeof g === 'string') } : {}),
  };
}

function faultOf(rel: string, abs: string, cfg: LitterConfig): string | null {
  if (matchesAny(rel, cfg.allow ?? [])) return null;
  if (isRootImage(rel, [])) return `${rel} looks like a working screenshot in the repo root. Keep it out of git, or put an asset in its folder.`;
  if (/:Zone\.Identifier$/.test(rel)) return `${rel} is a browser download marker. It is an invalid path on Windows and breaks checkout. Add *:Zone.Identifier to .gitignore.`;
  if (DUMP.test(rel)) return `${rel} is a log or a debug dump. Add it to .gitignore.`;
  let mb = 0;
  try { mb = statSync(abs).size / MB; } catch { return null; }
  const limit = cfg.maxFileMb ?? BIG_MB;
  return mb > limit ? `${rel} is ${Math.round(mb)} MB (limit ${limit}). Git keeps it for ever: use object storage or a release.` : null;
}

// A named file, or what a folder would stage.
const staged = (dir: string, arg: string, env: HookContext['env']): string[] =>
  gitLines(['ls-files', '--others', '--modified', '--exclude-standard', '--', arg], { cwd: dir, env }).map((f) => resolve(dir, f));

function litterFault(command: string, cwd: string, ctx: HookContext): string | null {
  for (const { dir, args } of gitAdds(command, cwd)) {
    const root = checkoutRoot(ctx.projectDir, join(dir, 'x'), ctx.cwd);
    const cfg = litterConfig(readLayout(claudeRoot(ctx.projectDir, join(dir, 'x'), ctx.cwd)));
    for (const abs of args.filter((a) => !a.startsWith('-')).flatMap((a) => staged(dir, a, ctx.env))) {
      const fault = faultOf(relative(root, abs).replace(/\\/g, '/'), abs, cfg);
      if (fault) return `${fault}\nA real asset can be named in guards.repoLitter.allow.\n`;
    }
  }
  return null;
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, { name: 'repo-litter', command: (command, cwd) => litterFault(command, cwd, ctx) }, ctx);

/** A working screenshot in the root of a worktree is refused as in main when no layout allows it (the worktree's own `allow` is
 *  worktree-cases-commands.mjs's step, which writes a layout), and ordinary source is not. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/litter-shot.png': 'x', '{here}/litter-shot.png': 'x', '{wt}/src/litter-ok.ts': 'x' },
  steps: [
    { label: 'a screenshot in the root of the worktree', event: { tool_name: 'Bash', tool_input: { command: 'git add litter-shot.png' }, cwd: '{wt}' }, want: 2 },
    { label: 'a screenshot in the root of main', event: { tool_name: 'Bash', tool_input: { command: 'git add litter-shot.png' }, cwd: '{here}' }, want: 2 },
    { label: 'source in the worktree', event: { tool_name: 'Bash', tool_input: { command: 'git add src/litter-ok.ts' }, cwd: '{wt}' }, want: 0 },
  ],
};

const SELFTEST_FILES: Readonly<Record<string, string>> = {
  'src/a.pdf:Zone.Identifier': 'x', 'shot.png': 'x', 'favicon.png': 'x', 'src/a.ts': 'x', 'src/hero.png': 'x', 'trace.har': 'x', 'kept.png': 'x',
  '.claude/layout.json': JSON.stringify({ guards: { repoLitter: { maxFileMb: 1, allow: ['kept.png'] } } }),
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ ...SELFTEST_FILES });
  git(dir, 'init', '-q');
  put(join(dir, 'media/big.bin'), 'x'.repeat(2 * MB));
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const add = (paths: string): number | null => runHook(hookFile, dir, bashOf(`git add ${paths}`, dir)).status;
  return verdicts('repo-litter', [
    ['a screenshot in the root', add('shot.png'), 2],
    ['a big file', add('media/big.bin'), 2],
    ['a folder holding a big file', add('media'), 2],
    ['a debug dump', add('trace.har'), 2],
    ['a download marker', add('src/a.pdf:Zone.Identifier'), 2],
    ['source', add('src/a.ts'), 0],
    ['an image in its folder', add('src/hero.png'), 0],
    ['a favicon in the root', add('favicon.png'), 0],
    ['a file the layout allows', add('kept.png'), 0],
    ['something else entirely', runHook(hookFile, dir, bashOf('git status', dir)).status, 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'repo-litter', hook, selftest);
