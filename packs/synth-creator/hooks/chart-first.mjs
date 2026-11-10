#!/usr/bin/env node
// chart-first: the Mermaid chart of every module and route is committed before any UI or engine code.
//   PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): a write under a source folder of the layout (any route, lib/writes.mjs)
//   is refused while the file's own checkout has no committed chart: a file matching layout.json "chart" (a glob or a list;
//   default docs/**/*.mmd) that is in HEAD and not empty. The chart itself, docs, tools, tests and .claude are never judged.
//   --selftest: proves it.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './lib/glob.mjs';
import { codeFolders, readLayout } from './lib/layout.mjs';
import { claudeRoot, checkoutRoot, insideProject, relInCheckout } from './lib/project.mjs';
import { writesOf } from './lib/writes.mjs';
import { bashOf, git, put, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const DEFAULT_CHART = ['docs/**/*.mmd'];
const TESTS = /(^|\/)tests?(\/|$)/;

const chartGlobs = (layout) => [layout.chart ?? DEFAULT_CHART].flat();
// The folders whose code the chart draws: the layout's code folders, without its tests.
const sourceFolders = (layout) => codeFolders(layout).filter((f) => !TESTS.test(f));

// The committed files of a checkout with their sizes, from HEAD; none when it has no commit yet.
function committed(checkout) {
  try {
    const out = execFileSync('git', ['ls-tree', '-r', '-l', 'HEAD'], { cwd: checkout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean).map((l) => {
      const [meta, path] = l.split('\t');
      return { path, size: Number(meta.trim().split(/\s+/)[3]) || 0 };
    });
  } catch {
    return []; // not a refusal by itself: no commit means no committed chart, and the source write is judged on that
  }
}

const hasChart = (checkout, globs) => committed(checkout).some((f) => f.size > 0 && matchesAny(f.path, globs));

// The source files a call writes whose checkout has no committed chart, with the glob that was looked for.
function unchartedWrites(payload) {
  const out = [];
  const seen = new Map();
  for (const w of writesOf(payload, payload.cwd ?? ROOT)) {
    if (w.op === 'delete' || !insideProject(w.path)) continue;
    const rel = relInCheckout(w.path);
    if (rel.startsWith('.claude/')) continue;
    const layout = readLayout(claudeRoot(w.path));
    const globs = chartGlobs(layout);
    if (matchesAny(rel, globs) || !sourceFolders(layout).some((f) => rel.startsWith(`${f}/`))) continue;
    const checkout = checkoutRoot(w.path);
    if (!seen.has(checkout)) seen.set(checkout, hasChart(checkout, globs));
    if (!seen.get(checkout)) out.push({ rel, globs });
  }
  return out;
}

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; } // not a refusal: an event that cannot be parsed has nothing to judge
  const bad = unchartedWrites(payload);
  if (!bad.length) return 0;
  process.stderr.write(
    `BLOCKED by chart-first: chart first. ${[...new Set(bad.map((b) => b.rel))].join(', ')} is source, and this checkout has no committed chart `
    + `(${bad[0].globs.join(', ')}, not empty, in HEAD). Write the Mermaid chart of every module and route, commit it, then the code; `
    + 'a change to a route changes the chart first (rule chart-first). A project keeps its chart elsewhere with layout.json "chart".\n',
  );
  return 2;
}

function selftest() {
  const me = fileURLToPath(import.meta.url);
  const layout = { folders: { docs: { path: 'docs' }, src: { path: 'src' }, tests: { path: 'tests' } }, concepts: {} };
  const dir = scratchProject({ 'README.md': 'x\n' }, layout);
  git(dir, 'init', '-q');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'start');
  const w = (rel) => runHook(me, dir, writeOf(join(dir, rel)));
  const cases = [
    ['no chart: a source write refused', w('src/ui/Panel.cpp'), 2],
    ['no chart: by the shell too', runHook(me, dir, bashOf('cat > src/dsp/Svf.cpp <<EOF\nx\nEOF', dir)), 2],
    ['no chart: the chart itself may be written', w('docs/chart.mmd'), 0],
    ['no chart: a test passes', w('tests/panel_test.cpp'), 0],
    ['no chart: docs pass', w('docs/spec.md'), 0],
  ];
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
  return verdicts('chart-first', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('chart-first', main));
