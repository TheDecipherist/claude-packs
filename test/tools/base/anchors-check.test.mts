// 2.0.0 (audit E25): a duplicated anchor fails in the document that owns it; a reference into a project that is not on
// the machine is a warning, never a failure.
import { KIT, assert, fresh, join, spawnSync, test, writeFileSync, mkdirSync } from '../../kit-cli.mts';

const TOOL = join(KIT, 'packs/base/tools/anchors-check.mjs');
const run = (args: readonly string[]) => spawnSync('node', [TOOL, ...args], { encoding: 'utf8' });
const doc = (dir: string, name: string, text: string): string => { const path = join(dir, name); writeFileSync(path, text); return path; };

test('a duplicated anchor is refused, and removing the duplicate turns it green', () => {
  const dir = fresh('anchors-');
  const planted = doc(dir, 'spec.md', '## One {#a-1}\n\n## Two {#a-1}\n');
  const red = run([planted]);
  assert.equal(red.status, 1);
  assert.match(red.stderr, /\{#a-1\} is defined more than once/);
  const green = run([doc(dir, 'clean.md', '## One {#a-1}\n\n## Two {#a-2}\n')]);
  assert.equal(green.status, 0);
});

test('a local reference with no anchor fails', () => {
  const dir = fresh('anchors-');
  const done = run([doc(dir, 'a.md', 'see [x](#gone)\n## One {#one}\n')]);
  assert.equal(done.status, 1);
  assert.match(done.stderr, /\(#gone\) has no anchor/);
});

test('a cross-project reference resolves when the project is present, and fails when its anchor is missing', () => {
  const dir = fresh('anchors-');
  mkdirSync(join(dir, 'other'));
  doc(join(dir, 'other'), 'spec.md', '## Law {#law}\n');
  const ref = (id: string) => doc(dir, `r-${id}.md`, `uses other:spec.md#${id}\n`);
  assert.equal(run([ref('law'), '--project', `other=${join(dir, 'other')}`]).status, 0);
  assert.equal(run([ref('nope'), '--project', `other=${join(dir, 'other')}`]).status, 1);
});

test('a project absent from the machine is a warning and exit 0', () => {
  const dir = fresh('anchors-');
  const done = run([doc(dir, 'a.md', 'uses ghost:spec.md#law\n'), '--project', `ghost=${join(dir, 'not-here')}`]);
  assert.equal(done.status, 0);
  assert.match(done.stderr, /warning: .*not on this machine/);
});

test('a wrong command line exits 2', () => {
  assert.equal(run([]).status, 2);
});
