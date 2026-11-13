// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): a step naming a reverse-engineered module is not ticked in build.md until the module has its catalog entry.
// A step line `- [x] ... module: <category>/<entry>` (category one of filters, oscillators, envelopes, lfos, effects; entry the path under it, no extension, as the
// category's SCHEMA.md lays it out) needs `<catalog>/<category>/<entry>.md` (the evidence) and `.h` (the runnable code). The catalog is the path in
// layout.json "catalog"; with none named the hook passes (the `file-into-the-catalog` skill says the same). `--selftest` proves it.
// On the hook contract (typescript order W4): a judge; nothing is written.
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { toJson } from './lib/json.mts';
import { readLayout } from './lib/layout.mts';
import { checkoutRoot, claudeRoot } from './lib/project.mts';
import { editOf, put, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const CATEGORIES = ['filters', 'oscillators', 'envelopes', 'lfos', 'effects'];
const TICKED = /^\s*[-*]\s+\[[xX]\]/;
const MODULE = /\bmodule:\s*`?([A-Za-z0-9_./-]+)`?/;

/** The module tags of the step lines a text ticks. */
const tickedModules = (text: string): string[] => text.split('\n').filter((l) => TICKED.test(l)).flatMap((l) => MODULE.exec(l)?.[1] ?? []);

/** What is wrong with a module tag, or null when the catalog holds its entry. */
function missing(catalog: string, tag: string): string | null {
  const [category = '', ...rest] = tag.split('/');
  const entry = rest.join('/').replace(/\.(md|h)$/, '');
  if (!CATEGORIES.includes(category) || !entry || entry.includes('..')) return `module: ${tag} names no catalog category (${CATEGORIES.join(', ')}) and entry as <category>/<entry>.`;
  const gone = ['md', 'h'].filter((ext) => !existsSync(join(catalog, category, `${entry}.${ext}`)));
  return gone.length ? `module: ${tag} has no ${gone.map((ext) => `${category}/${entry}.${ext}`).join(' or ')} in the catalog (${catalog}).` : null;
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, {
  name: 'catalog-entry-exists',
  write: (w, rel) => {
    if (rel !== 'build.md' || w.after === null) return null;
    const named = readLayout(claudeRoot(ctx.projectDir, w.path, ctx.cwd)).catalog;
    if (typeof named !== 'string' || !named) return null;
    const catalog = isAbsolute(named) ? named : join(checkoutRoot(ctx.projectDir, w.path, ctx.cwd), named);
    const already = new Set(tickedModules(w.before ?? ''));
    for (const tag of tickedModules(w.after).filter((t) => !already.has(t))) {
      const why = missing(catalog, tag);
      if (why) return `${why}\nFile the module with the file-into-the-catalog skill (the .md evidence and the .h, then gen_all and drift_check) before ticking its step.\n`;
    }
    return null;
  },
}, ctx);

const STEP = (tag: string): string => `## Steps\n- [x] the first filter, the cutoff sum read from the ROM; module: ${tag}\n`;

/** The worktree's catalog holds the entry, main's does not: the same tick passes in the worktree and is refused in main. */
export const worktreeCase: WorktreeCase = {
  files: {
    '{wt}/.claude/layout.json': toJson({ catalog: 'cat' }),
    '{here}/.claude/layout.json': toJson({ catalog: 'cat' }),
    '{wt}/cat/filters/acme/one.md': '# one\n',
    '{wt}/cat/filters/acme/one.h': '// one\n',
  },
  steps: [
    { label: 'a step the worktree catalog holds', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/build.md', content: STEP('filters/acme/one') } }, want: 0 },
    { label: 'the same step where main holds none', event: { tool_name: 'Write', tool_input: { file_path: '{here}/build.md', content: STEP('filters/acme/one') } }, want: 2 },
  ],
};

export function selftest(): number {
  const me = fileURLToPath(import.meta.url);
  const layout = toJson({ catalog: 'catalog' });
  const dir = scratchProject({ '.claude/layout.json': layout, 'catalog/filters/acme/seen.md': '# seen\n', 'catalog/filters/acme/seen.h': '// seen\n', 'catalog/filters/acme/half.md': '# half\n' });
  const bare = scratchProject({ '.claude/layout.json': '{}' });
  const old = scratchProject({ '.claude/layout.json': layout, 'build.md': STEP('filters/acme/unseen') });   // a step ticked before the catalog was named
  const before = snapshot(dir);
  const build = (root: string, tag: string, mark = 'x'): number | null => runHook(me, root, writeOf(join(root, 'build.md'), STEP(tag).replace('[x]', `[${mark}]`))).status;
  const ticked = build(dir, 'filters/acme/new');   // refused now, passes once the entry exists
  put(join(dir, 'catalog/filters/acme/new.md'), '# new\n');
  put(join(dir, 'catalog/filters/acme/new.h'), '// new\n');
  return verdicts('catalog-entry-exists', [
    ['a ticked filter step with no catalog entry', ticked, 2],
    ['the same step once the entry exists', build(dir, 'filters/acme/new'), 0],
    ['an entry with its .md and no .h', build(dir, 'filters/acme/half'), 2],
    ['an entry that was always there', build(dir, 'filters/acme/seen'), 0],
    ['a step not ticked yet', build(dir, 'filters/acme/unseen', ' '), 0],
    ['a category the catalog does not have', build(dir, 'voices/acme/seen'), 2],
    ['no catalog named', build(bare, 'filters/acme/unseen'), 0],
    ['an edit that leaves the ticked step as it was', runHook(me, old, editOf(join(old, 'build.md'), 'first', 'second')).status, 0],
    ['another file is not build.md', runHook(me, dir, writeOf(join(dir, 'notes.md'), STEP('filters/acme/unseen'))).status, 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).filter((f) => !f.startsWith('catalog/')).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'catalog-entry-exists', hook, selftest);
