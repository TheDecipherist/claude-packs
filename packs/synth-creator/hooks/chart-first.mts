// chart-first: the Mermaid chart of every module and route is committed before any UI or engine code.
//   PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): a write under a source folder of the layout (any route, lib/writes.mts)
//   is refused while the file's own checkout has no committed chart: a file matching layout.json "chart" (a glob or a list;
//   default docs/**/*.mmd) that is in HEAD and not empty. The chart itself, docs, tools, tests and .claude are never judged.
//   --selftest: proves it.
// On the hook contract (typescript order W4): a judge; git is asked in the caller's environment and nothing is written.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './lib/glob.mts';
import { headFiles } from './lib/git-state.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { codeFolders, readLayout } from './lib/layout.mts';
import { checkoutRoot, claudeRoot, insideProject, relInCheckout } from './lib/project.mts';
import { bashOf, git, put, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Env, Hook, HookContext, HookEvent, Layout } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { writesOf } from './lib/writes.mts';

const DEFAULT_CHART: readonly string[] = ['docs/**/*.mmd'];
const TESTS = /(^|\/)tests?(\/|$)/;

const chartGlobs = (layout: Layout): string[] => [layout['chart'] ?? DEFAULT_CHART].flat().filter((g): g is string => typeof g === 'string');
// The folders whose code the chart draws: the layout's code folders, without its tests.
const sourceFolders = (layout: Layout): string[] => codeFolders(layout).filter((f) => !TESTS.test(f));

// Whether a checkout's HEAD holds a chart: a file matching the globs that is not empty. A checkout with no commit has none (not a
// refusal by itself: the source write is judged on that).
function hasChart(checkout: string, globs: readonly string[], env: Env): boolean {
  return headFiles(checkout, env).some(([path]) => matchesAny(path, globs)); // the runner's kept list while HEAD is the commit it was taken at (git-state.mts)
}

interface Uncharted { rel: string; globs: string[] }

// The source files a call writes whose checkout has no committed chart, with the glob that was looked for.
function unchartedWrites(event: HookEvent, ctx: HookContext): Uncharted[] {
  const out: Uncharted[] = [];
  const seen = new Map<string, boolean>();
  for (const w of writesOf(event, event.cwd ?? ctx.projectDir, ctx.env)) {
    if (w.op === 'delete' || !insideProject(ctx.projectDir, w.path, ctx.cwd)) continue;
    const rel = relInCheckout(ctx.projectDir, w.path, ctx.cwd);
    if (rel.startsWith('.claude/')) continue;
    const layout = readLayout(claudeRoot(ctx.projectDir, w.path, ctx.cwd));
    const globs = chartGlobs(layout);
    if (matchesAny(rel, globs) || !sourceFolders(layout).some((f) => rel.startsWith(`${f}/`))) continue;
    const checkout = checkoutRoot(ctx.projectDir, w.path, ctx.cwd);
    if (!seen.has(checkout)) seen.set(checkout, hasChart(checkout, globs, ctx.env));
    if (!seen.get(checkout)) out.push({ rel, globs });
  }
  return out;
}

export const hook: Hook = (event, ctx) => {
  const bad = unchartedWrites(event, ctx);
  const first = bad[0];
  if (!first) return pass;
  return refuse(
    `BLOCKED by chart-first: chart first. ${[...new Set(bad.map((b) => b.rel))].join(', ')} is source, and this checkout has no committed chart `
    + `(${first.globs.join(', ')}, not empty, in HEAD). Write the Mermaid chart of every module and route, commit it, then the code; `
    + 'a change to a route changes the chart first (rule chart-first). A project keeps its chart elsewhere with layout.json "chart".\n',
  );
};

/** No committed chart: a source write is refused in the worktree and in the main checkout (the layout step stays in the cases file). */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'no committed chart in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/dsp/Svf.cpp', content: '// x\n' } }, want: 2 },
    { label: 'main has no chart either', event: { tool_name: 'Write', tool_input: { file_path: '{here}/src/dsp/Svf.cpp', content: '// x\n' } }, want: 2 },
  ],
};

export async function selftest(): Promise<number> {
  const { headOf, plantFacts } = await import('./lib/git-state-selftest.mts'); // loads only under --selftest
  const me = fileURLToPath(import.meta.url);
  const layout = { folders: { docs: { path: 'docs' }, src: { path: 'src' }, tests: { path: 'tests' } }, concepts: {} };
  const dir = scratchProject({ 'README.md': 'x\n' }, layout);
  git(dir, 'init', '-q');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'start');
  const before = snapshot(dir);
  const w = (rel: string): number | null => runHook(me, dir, writeOf(join(dir, rel))).status;
  const cases: [string, number | null, number][] = [
    ['no chart: a source write refused', w('src/ui/Panel.cpp'), 2],
    ['no chart: by the shell too', runHook(me, dir, bashOf('cat > src/dsp/Svf.cpp <<EOF\nx\nEOF', dir)).status, 2],
    ['no chart: the chart itself may be written', w('docs/chart.mmd'), 0],
    ['no chart: a test passes', w('tests/panel_test.cpp'), 0],
    ['no chart: docs pass', w('docs/spec.md'), 0],
  ];
  const trap = writtenSince(dir, before).join(',');   // a judge, so far: nothing written
  put(join(dir, 'docs/chart.mmd'), '');
  git(dir, 'add', 'docs/chart.mmd');
  git(dir, 'commit', '-q', '-m', 'empty chart');
  cases.push(['an empty chart is no chart', w('src/ui/Panel.cpp'), 2]);
  put(join(dir, 'docs/chart.mmd'), 'flowchart LR\n  osc --> filter --> amp\n');
  cases.push(['a chart written but not committed', w('src/ui/Panel.cpp'), 2]);
  git(dir, 'commit', '-q', '-am', 'chart');
  cases.push(['chart committed: a source write passes', w('src/ui/Panel.cpp'), 0]);
  put(join(dir, '.claude/layout.json'), JSON.stringify({ ...layout, chart: 'design/*.mmd' }));
  cases.push(['layout.json "chart" names another place', w('src/ui/Panel.cpp'), 2]);
  // W8.3: the runner's kept list of HEAD's files is read while HEAD is the commit it was taken at, and git answers after
  plantFacts(dir, headOf(dir), [['design/planted.mmd', 9]]);
  cases.push(['the kept list names a chart git does not hold: it is the one read (the plant)', w('src/ui/Panel.cpp'), 0]);
  plantFacts(dir, 'not-this-commit', [['design/planted.mmd', 9]]);
  cases.push(['the kept list was taken at another commit: git answers, no chart', w('src/ui/Panel.cpp'), 2]);
  return verdicts('chart-first', [...cases, ['a judge writes no file (the write trap)', trap, '']]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'chart-first', hook, selftest);
