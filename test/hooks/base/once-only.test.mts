// once-only: a write that repeats code the repo already has is refused. The hook's contract, then its refusals.
import { join } from 'node:path';
import { git, write } from '../../fixtures/installs.mts';
import { assert, put, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { cppFunction, workProject, writeAt } from '../work-project.mts';

holdsTheContract({
  hook: 'once-only.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: write(join(project, 'src/core/Rec.cpp')), status: 0 }),
});

const USINGS = `${Array.from({ length: 12 }, (_, i) => `using mpx::harness::name${i};\n`).join('')}constexpr double unitRate = 48000.0;\n`;

test('KF-32: a block of using declarations is no copy; code after it still is', () => {
  const dir = workProject();
  put(join(dir, 'tests/a.cpp'), `#include "h.h"\n\n${USINGS}\nint main() { return first (); }\n`);
  git(dir, 'add', 'tests/a.cpp');
  git(dir, 'commit', '-qm', 'a', '--', 'tests/a.cpp');
  assert.equal(writeAt(dir, 'once-only.mjs', 'tests/b.cpp', `#include "h.h"\n\n${USINGS}\nint main() { return second (); }\n`).status, 0);
  const code = cppFunction('kept');
  put(join(dir, 'tests/c.cpp'), `${USINGS}\n${code}`);
  git(dir, 'add', 'tests/c.cpp');
  git(dir, 'commit', '-qm', 'c', '--', 'tests/c.cpp');
  assert.equal(writeAt(dir, 'once-only.mjs', 'tests/d.cpp', `${USINGS}\n${code}`).status, 2);
});
