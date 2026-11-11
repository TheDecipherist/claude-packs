// lib/coverage.mts: the files rules may govern, and the rules that fire.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { SOURCE, coverage, projectFiles } from '../../../lib/coverage.mjs';
import { gitRun } from '../../../packs/base/hooks/lib/git-run.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const KIT = new URL('../../../', import.meta.url).pathname;
const env = { ...process.env };

test('without git, projectFiles walks, skips build output and the foreign parts of .claude', () => {
  const dir = scratchDir('cov-walk-');
  for (const f of ['src/a.cpp', 'node_modules/x/b.cpp', 'build/c.cpp', 'cmake-build-debug/d.cpp', '.claude/skills/s/SKILL.md', '.claude/rules/r.md', '.claude/settings.json', '.claude/worktrees/w/e.cpp', '.claude/state/f']) put(join(dir, f), 'x');
  assert.deepEqual(projectFiles(dir, env).sort(), ['.claude/rules/r.md', '.claude/settings.json', '.claude/skills/s/SKILL.md', 'src/a.cpp']);
});

test('inside a git repo, projectFiles lists what git does not ignore, and leaves out a deleted tracked file', () => {
  const dir = scratchDir('cov-git-');
  const git = (...a: string[]): void => { assert.ok(gitRun(a, { cwd: dir, env, identity: { name: 't', email: 't@t' } }).ok, a.join(' ')); };
  git('init', '-q');
  for (const [f, text] of [['.gitignore', 'out/\n'], ['src/a.cpp', 'x'], ['out/b.cpp', 'x'], ['src/gone.cpp', 'x']] as const) put(join(dir, f), text);
  git('add', '.');
  git('commit', '-qm', 'one');
  put(join(dir, 'src/new.cpp'), 'x');
  gitRun(['rm', '-q', '--cached', 'src/gone.cpp'], { cwd: dir, env });
  assert.deepEqual(projectFiles(dir, env).sort(), ['.gitignore', 'src/a.cpp', 'src/gone.cpp', 'src/new.cpp']);
});

test('coverage names a dead rule, a waiting rule, a live rule and an uncovered source file, with the kit\'s own hooks as the reader', async () => {
  const dir = scratchDir('cov-rules-');
  const hooks = join(KIT, 'packs/base/hooks/lib');
  put(join(dir, '.claude/hooks/lib/glob.mjs'), `export * from ${JSON.stringify(`file://${hooks}/glob.mjs`)};`);
  put(join(dir, '.claude/hooks/lib/layout.mjs'), `export * from ${JSON.stringify(`file://${hooks}/layout.mjs`)};`);
  const rule = (globs: string): string => `---\npaths:\n${globs.split(',').map((g) => `  - "${g}"`).join('\n')}\n---\n# r\n`;
  put(join(dir, '.claude/rules/live.md'), rule('src/**'));
  put(join(dir, '.claude/rules/dead.md'), rule('lib/*.go'));
  put(join(dir, '.claude/rules/waiting.md'), rule('dsp/**'));
  put(join(dir, 'src/a.cpp'), 'x');
  put(join(dir, 'lib/readme.txt'), 'x');
  put(join(dir, 'other/o.cpp'), 'x');
  const report = await coverage(dir, SOURCE, env);
  assert.deepEqual(report.liveRules, ['live.md']);
  assert.deepEqual(report.deadRules, ['dead.md']);
  assert.deepEqual(report.waitingRules, ['waiting.md']);
  assert.deepEqual(report.uncovered, ['other/o.cpp']);
  assert.equal(report.sourceCount, 2);
});
