// One session often edits sibling projects (rolling a lesson out to every synth). This project's hooks must never block that: each hook
// judges only files inside its own project. No hook of its own: it fires every installed hook at files in another project, the hooks shared
// out by their first letter over this file and other-projects-m-z.test.mts, and update-all in other-projects-update-all.test.mts, so no
// file sums over a minute.
import { join } from 'node:path';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { assert, test } from '../../kit-cli.mts';
import { holdsOtherProjectsAlone, stellixLike } from './other-projects-rig.mts';

holdsOtherProjectsAlone('a', 'l');

test('sibling projects are readable and editable: layout.siblings becomes additionalDirectories', () => {
  const here = stellixLike();
  const settings = readJson<{ permissions: { additionalDirectories: string[] } }>(join(here, '.claude/settings.json'));
  assert.deepEqual(settings?.permissions.additionalDirectories, ['../']);
});
