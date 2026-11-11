// PreToolUse (Bash): firmware stays out of git. ROM images, DSP blobs, disassemblies and vendor banks are other people's bytes, and git keeps them for ever, so `git add`
// of one is refused. A small test fixture is named in layout.json "guards": { "firmware": { "fixtures": ["<glob>"] } }. This is a house policy, not legal advice.
// `--selftest` proves it. On the hook contract (typescript order W4): `hook(event, ctx)` returns its Verdict.
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitAdds } from './lib/git-adds.mts';
import { gitLines } from './lib/git-run.mts';
import { matchesAny } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { readLayout } from './lib/layout.mts';
import { checkoutRoot, claudeRoot } from './lib/project.mts';
import { bashOf, git, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const FIRMWARE = /\.(bin|rom|eprom|epr|hex|srec|s19|mot|ic\d+|lod|syx|mid|dis|disasm|asm\.txt|lst|wiz|mfw|raf)$/i;
const OWN_BUILD = /(^|\/)(build|out|dist|target)\//;

const staged = (dir: string, arg: string, ctx: HookContext): string[] =>
  gitLines(['ls-files', '--others', '--modified', '--exclude-standard', '--', arg], { cwd: dir, env: ctx.env }).map((f) => resolve(dir, f));

/** The fixture globs a layout names under guards.firmware.fixtures. */
function fixturesOf(guards: Record<string, unknown> | undefined): string[] {
  const firmware = guards?.['firmware'];
  const fixtures = typeof firmware === 'object' && firmware !== null ? (firmware as Record<string, unknown>)['fixtures'] : undefined;
  return Array.isArray(fixtures) ? fixtures.filter((f): f is string => typeof f === 'string') : [];
}

const refusalFor = (rel: string): string => `${rel} looks like firmware, a disassembly or a sound bank, which stays out of git. ` +
  'Keep it local, and ship derived facts. A small test fixture is named in guards.firmware.fixtures.\n';

function judgeAdd(command: string, cwd: string, ctx: HookContext): string | null {
  for (const { dir, args } of gitAdds(command, cwd)) {
    const root = checkoutRoot(ctx.projectDir, join(dir, 'x'), ctx.cwd);
    const fixtures = fixturesOf(readLayout(claudeRoot(ctx.projectDir, join(dir, 'x'), ctx.cwd)).guards);
    for (const abs of args.filter((a) => !a.startsWith('-')).flatMap((a) => staged(dir, a, ctx))) {
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (FIRMWARE.test(rel) && !OWN_BUILD.test(rel) && !matchesAny(rel, fixtures)) return refusalFor(rel);
    }
  }
  return null;
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, { name: 'firmware-out-of-git', command: (command, cwd) => judgeAdd(command, cwd, ctx) }, ctx);

/** The worktree's layout names this fixture; main's does not: the same `git add` passes in the worktree and is refused in main.
 *  The layout file is merged into the worktree's own by the case runner, so `guards` is the one key it brings. */
export const worktreeCase: WorktreeCase = {
  files: {
    '{wt}/one.syx': 'x',
    '{here}/one.syx': 'x',
    '{wt}/.claude/layout.json': JSON.stringify({ guards: { firmware: { fixtures: ['one.syx'] } } }),
  },
  steps: [
    { label: 'a fixture the worktree names', event: { tool_name: 'Bash', tool_input: { command: 'git add one.syx' }, cwd: '{wt}' }, want: 0 },
    { label: 'the same file where main names none', event: { tool_name: 'Bash', tool_input: { command: 'git add one.syx' }, cwd: '{here}' }, want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const layout = JSON.stringify({ guards: { firmware: { fixtures: ['test/fixtures/**'] } } });
  const dir = scratchProject({ 'roms/os.bin': 'x', 'banks/factory.syx': 'x', 'test/fixtures/one.syx': 'x', 'src/a.cpp': 'x', '.claude/layout.json': layout });
  git(dir, 'init', '-q');
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const add = (p: string): number | null => runHook(hookFile, dir, bashOf(`git add ${p}`, dir)).status;
  return verdicts('firmware-out-of-git', [
    ['a ROM image', add('roms/os.bin'), 2],
    ['a folder holding one', add('roms'), 2],
    ['a sound bank', add('banks/factory.syx'), 2],
    ['a named fixture', add('test/fixtures/one.syx'), 0],
    ['source', add('src/a.cpp'), 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'firmware-out-of-git', hook, selftest);
