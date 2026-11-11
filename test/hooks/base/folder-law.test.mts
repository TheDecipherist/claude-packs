// folder-law: a new source file outside the layout is refused. The hook's contract (its selftest, its worktree case, the emitted
// verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { assert, fresh, hookRun, mkdirSync, readFileSync, run, test, writeFileSync } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'folder-law.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'random/stray.cpp')), status: 2 }),
});

test('a plain src/ takes new files, in every configuration that names nothing inside it (KWB-78)', () => {
  const dir = fixture('rust');
  const fires = (project: string, rel: string, content: string): number | null => hookRun(project, 'folder-law.mjs', write(join(project, rel), content)).status;
  assert.equal(fires(dir, 'src/parser.rs', 'pub fn f() {}\n'), 0);
  assert.equal(fires(dir, 'crates/core/src/lib.rs', 'pub fn f() {}\n'), 0);
  assert.equal(fires(dir, 'benches/speed.rs', 'fn main() {}\n'), 0);
  assert.equal(fires(dir, 'build.rs', 'fn main() {}\n'), 0);
  assert.equal(fires(dir, 'stray.rs', 'pub fn f() {}\n'), 2);
  const py = fresh('py-');   // a Python project is installed by `init --auto`: the install is what this half proves
  mkdirSync(join(py, 'src'));
  writeFileSync(join(py, 'src/a.py'), 'print(1)\n');
  run(py, 'init', '--auto');
  assert.equal(fires(py, 'src/new.py', 'print(2)\n'), 0);
  assert.match(readFileSync(join(py, '.claude/rules/bug-fix-starts-red.md'), 'utf8'), /\*\*\/\*\.py/, 'a universal rule loads on Python (KWB-79)');
});
