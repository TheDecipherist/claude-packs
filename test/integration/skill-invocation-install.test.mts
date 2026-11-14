// "skillInvocation": "user": every installed skill carries disable-model-invocation and user-invocable, and an update keeps them
// without taking them for the user's edits (2026-11-14). Starts from the shared base install (the suite caps init call sites).
import { join } from 'node:path';
import { assert, cli, existsSync, readFileSync, test } from '../kit-cli.mts';
import { withLayout } from '../fixtures/installs.mts';
import { fixture } from '../hooks/hook-rig.mts';

test('skillInvocation user installs every skill user-invocable only, and a second update keeps it as the pack\'s own', () => {
  const dir = fixture('base');
  withLayout(dir, (l) => ({ ...l, skillInvocation: 'user' }));
  const first = cli(dir, 'update');
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(readFileSync(join(dir, '.claude/skills/chip-search/SKILL.md'), 'utf8'), /\ndisable-model-invocation: true\nuser-invocable: true\n---\n/);
  const second = cli(dir, 'update');
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.ok(!existsSync(join(dir, '.claude/skills/chip-search/SKILL.md.pack-new')), 'no .pack-new: the rendered skill is the pack\'s own');
  assert.doesNotMatch(second.stdout, /you edited .claude\/skills/);
});
