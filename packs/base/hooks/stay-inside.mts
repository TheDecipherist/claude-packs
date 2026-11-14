// stay-inside: a write outside the project stops the session. The kit's laws judge only what is inside the project, so a write
// anywhere else is work that left them: supernova2's overnight run wrote 260 times under /tmp (scripts, lists, results), judged by
// nothing (KWB-next, 2026-11-14). The user: "a write outside the project means that claude decided it didnt want to follow our rules
// and somehow escaped". A write into another project (a folder inside another git repository: the kit, the reference library, the
// machine catalog) is updating that project and passes; inside-the-project judges another checkout of this same repository. Anything
// else, /tmp included, halts: Claude Code stops the session and hands it to the user (`continue: false`), and the call never runs.
// Writes are a write tool's path, and every file a shell command writes (lib/shell-writes.mts: redirects, heredocs, cp, mv, tee, rm,
// touch, sed -i ...). /dev/* is no file.
//   node stay-inside.mjs --selftest
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { insideProject } from './lib/project.mts';
import { git, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { shellWrites } from './lib/shell-writes.mts';
import type { Hook, HookEvent, VerdictRow } from './lib/types.d.mts';
import { halt, pass } from './lib/verdict.mts';

const WRITERS: ReadonlySet<string> = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const real = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };

/** The root of the git repository a path lies in (its nearest folder holding .git), or null when it lies in none. */
export function repoOf(path: string): string | null {
  for (let dir = dirname(resolve(path)); ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

/** The files a call writes: a write tool's path, or every file its shell command writes. */
export function writtenBy(event: HookEvent, cwd: string, env: Record<string, string | undefined>): string[] {
  const input = event.tool_input ?? {};
  if (WRITERS.has(event.tool_name ?? '')) return [input.file_path, input.notebook_path].filter((p): p is string => typeof p === 'string');
  if (event.tool_name === 'Bash' && typeof input.command === 'string') return shellWrites(input.command, cwd, env).map((w) => w.path);
  return [];
}

/** The written paths that are neither inside the project nor inside another project. */
export function escapes(paths: readonly string[], root: string, cwd: string): string[] {
  const home = real(root);
  return paths.map((p) => resolve(cwd, p)).filter((p) => {
    if (p.startsWith('/dev/')) return false;
    if (insideProject(root, p, cwd) || insideProject(home, real(dirname(p)), cwd)) return false;
    const repo = repoOf(p);
    return repo === null || real(repo) === home;   // no project at all; this project itself through another path is judged as inside
  });
}

export const hook: Hook = (event, ctx) => {
  if (event.hook_event_name !== 'PreToolUse') return pass;
  const cwd = event.cwd ?? ctx.cwd;
  const out = escapes(writtenBy(event, cwd, ctx.env), ctx.projectDir, cwd);
  if (!out.length) return pass;
  return halt(
    `STOPPED by stay-inside: this call writes outside the project, to ${out.slice(0, 3).join(', ')}${out.length > 3 ? ` and ${out.length - 3} more` : ''}, `
    + 'which is no other project. Every law of the kit judges only what is inside the project, so a write elsewhere is work that left them. '
    + 'The session stops here for the user. Scratch work belongs inside the project (an ignored folder such as scratch/), where every hook sees it.',
  );
};

/** A write in the worktree, and one in the main checkout, pass: both are inside the project. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a write in the worktree', event: { hook_event_name: 'PreToolUse', cwd: '{wt}', tool_name: 'Write', tool_input: { file_path: '{wt}/src/a.cpp', content: 'x' } }, want: 0 },
    { label: 'a write in the main checkout', event: { hook_event_name: 'PreToolUse', cwd: '{here}', tool_name: 'Write', tool_input: { file_path: '{here}/src/a.cpp', content: 'x' } }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/a.cpp': 'a\n' });
  const other = scratchProject({ 'README.md': '# other\n' });
  git(other, 'init', '-q');
  const loose = scratchProject({});   // a folder in no repository, like /tmp
  const stops = (ev: Record<string, unknown>): boolean => {
    const v = hook({ hook_event_name: 'PreToolUse', cwd: dir, ...ev }, contextOf({ projectDir: dir, cwd: dir, env: { CLAUDE_PROJECT_DIR: dir } }));
    return !(v instanceof Promise) && v.code === 0 && v.stdout.includes('"continue":false');
  };
  const write = (file_path: string): Record<string, unknown> => ({ tool_name: 'Write', tool_input: { file_path, content: 'x\n' } });
  const bash = (command: string): Record<string, unknown> => ({ tool_name: 'Bash', tool_input: { command } });
  const runner = runHook(hookFile, dir, { hook_event_name: 'PreToolUse', cwd: dir, ...write('/tmp/stay-inside-probe.py') });
  const rows: VerdictRow[] = [
    ['a write inside the project', stops(write(join(dir, 'src/b.cpp'))), false],
    ['a write to /tmp stops the session', stops(write('/tmp/stay-inside-probe.py')), true],
    ['a write to a folder in no repository stops it', stops(write(join(loose, 'x.py'))), true],
    ['a write into another project (another git repository) passes', stops(write(join(other, 'notes.md'))), false],
    ['a heredoc into /tmp stops it', stops(bash("cat > /tmp/scan.py <<'E'\nprint(1)\nE")), true],
    ['a redirect into /tmp stops it', stops(bash('python3 tools/x.py > /tmp/out.csv')), true],
    ['a copy to /tmp stops it', stops(bash('cp src/a.cpp /tmp/a.cpp')), true],
    ['a redirect inside the project passes', stops(bash('python3 tools/x.py > build/out.csv')), false],
    ['output to /dev/null passes', stops(bash('make 2>/dev/null')), false],
    ['a read of /tmp passes', stops(bash('cat /tmp/anything')), false],
    ['the runner gets the halt as JSON on exit 0', runner.status === 0 && runner.stdout.includes('"continue":false'), true],
  ];
  return verdicts('stay-inside', rows);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'stay-inside', hook, selftest);
