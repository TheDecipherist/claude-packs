// catalog-entry-exists: a step naming a reverse-engineered module is not ticked until the catalog holds its entry. The contract, then the facts.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { withLayout, write } from '../../fixtures/installs.mts';
import { assert, hookRun, test } from '../../kit-cli.mts';
import { enable, extraFixture, holdsTheContract } from '../hook-rig.mts';

/** A copy of the install with reverse-engineering on the cpp configuration, the opt-in hook enabled. */
const reverseEngineeringInstall = (): string => {
  const dir = extraFixture('reverse-engineering', ['reverse-engineering', '--config', 'cpp']);
  enable(dir, 'hooks/catalog-entry-exists.mjs');   // opt-in: an update brings it
  return dir;
};
const step = (tag: string): string => `- [x] the filter, its cutoff sum read from the ROM; module: ${tag}\n`;
const tick = (dir: string, tag: string): number | null => hookRun(dir, 'catalog-entry-exists.mjs', write(join(dir, 'build.md'), step(tag))).status;

holdsTheContract({
  hook: 'catalog-entry-exists.mjs',
  dir: reverseEngineeringInstall,
  same: (project) => {
    withLayout(project, { catalog: 'catalog' });
    return { payload: write(join(project, 'build.md'), step('filters/acme/one')), status: 2 };
  },
});

test('a ticked step needs its catalog entry, and a catalog that is named is read by its path', () => {
  const dir = reverseEngineeringInstall();
  assert.equal(tick(dir, 'filters/acme/one'), 0, 'no catalog named: the hook passes');
  withLayout(dir, { catalog: 'catalog' });
  assert.equal(tick(dir, 'filters/acme/one'), 2);
  put(join(dir, 'catalog/filters/acme/one.md'), '# one\n');
  assert.equal(tick(dir, 'filters/acme/one'), 2, 'the .h is missing');
  put(join(dir, 'catalog/filters/acme/one.h'), '// one\n');
  assert.equal(tick(dir, 'filters/acme/one'), 0);
});
