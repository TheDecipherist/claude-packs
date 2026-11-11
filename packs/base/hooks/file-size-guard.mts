// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): no source file grows past the line limit, by any route
// (a tool, or the shell's >, >>, tee, sed -i, cp, mv, a heredoc; lib/writes.mts).
// A PostToolUse warning comes too late (the file has already grown and the extraction is rework),
// so this refuses the edit before it lands. Shrinking or keeping an already-long file is allowed,
// so splitting a big file is never blocked. Limit: layout.maxFileLines, default 300.
// A judge on the hook contract (typescript order W4): the limit is read from the layout of the file's own checkout.
// `--selftest` proves it.
import { extname, relative } from 'node:path';
import { matchesAny } from './lib/glob.mts';
import { isContent } from './lib/content.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { checkoutRoot } from './lib/project.mts';
import { runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { extsOf } from './lib/source-exts.mts';
import type { Hook } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { layoutOfWrite } from './lib/write-layout.mts';
import { writesOf } from './lib/writes.mts';
import { fileURLToPath } from 'node:url';

// Code, scripts, shaders and CMake files (Stellix's source rule counted scripts and CMake too); docs and data are not code.
const SOURCE = extsOf('c', 'cpp', 'objc', 'js', 'ts', 'python', 'shader', 'shell', 'cmake');
const isSource = (rel: string): boolean => SOURCE.has(extname(rel)) || /(^|\/)CMakeLists\.txt$/.test(rel);
const EXEMPT = ['**/*.generated.*', '**/generated/**', 'build/**', '_deps/**'];

const lines = (text: string): number => (text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0));

export function verdict(rel: string, before: string | null, after: string, limit: number): string | null {
  if (!isSource(rel) || matchesAny(rel, EXEMPT) || isContent(rel)) return null;
  const n = lines(after);
  if (n <= limit || n <= lines(before ?? '')) return null;
  return `BLOCKED by file-size-guard: ${rel} would be ${n} lines (limit ${limit}).\n` +
    'Split it before adding more: move a cohesive part (a class, a group of pure functions, a table) into its own file in the same folder, then make this edit.\n';
}

export const hook: Hook = (event, ctx) => {
  for (const w of writesOf(event, ctx.cwd, ctx.env)) {
    if (w.after === null || relative(ctx.projectDir, w.path).startsWith('..')) continue;
    const rel = relative(checkoutRoot(ctx.projectDir, w.path, ctx.cwd), w.path);
    const msg = verdict(rel, w.before, w.after, layoutOfWrite(ctx, w.path).maxFileLines ?? 300);
    if (msg) return refuse(msg);
  }
  return pass;
};

/** A worktree file is measured by its own checkout: a small file passes there, a 400-line one is refused. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a small file in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/core/Small.cpp', content: '// new\n' } }, want: 0 },
    { label: 'a 400-line file in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/core/Huge.cpp', content: 'x\n'.repeat(400) } }, want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const big = 'x\n'.repeat(300);
  const dir = scratchProject({ 'src/keep.cpp': '// keep\n' }, { folders: {}, concepts: {}, maxFileLines: 50 });
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const write = (file: string, content: string): number | null => runHook(hookFile, dir, writeOf(`${dir}/${file}`, content)).status;
  const cases: readonly (readonly [string, boolean])[] = [
    ['grows past the limit', verdict('src/core/Svf.cpp', big, `${big}y\n`, 300) !== null],
    ['at the limit is fine', verdict('src/core/Svf.cpp', '', big, 300) === null],
    ['shrinking a long file is allowed', verdict('src/core/Old.cpp', 'x\n'.repeat(500), 'x\n'.repeat(400), 300) === null],
    ['docs are not source', verdict('docs/spec.md', '', 'x\n'.repeat(900), 300) === null],
    ['generated code is exempt', verdict('src/gen/Tables.generated.h', '', 'x\n'.repeat(900), 300) === null],
    ['a shell script is code', verdict('tools/plants.sh', '', 'x\n'.repeat(301), 300) !== null],
    ['a CMakeLists.txt is code', verdict('lib/app/CMakeLists.txt', '', 'x\n'.repeat(301), 300) !== null],
    ['a .mts is code (W1.6)', verdict('lib/sync.mts', '', 'x\n'.repeat(301), 300) !== null],
    ['a .cts is code (W1.6)', verdict('lib/old.cts', '', 'x\n'.repeat(301), 300) !== null],
  ];
  return verdicts('file-size-guard', [
    ...cases.map(([label, ok]): readonly [string, boolean, boolean] => [label, ok, true]),
    ['the layout\'s maxFileLines is the limit (50): 51 lines refused', write('src/a.cpp', 'x\n'.repeat(51)), 2],
    ['the layout\'s limit holds at 50 lines', write('src/b.cpp', 'x\n'.repeat(50)), 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'file-size-guard', hook, selftest);
