// 0.21.0: a team's pack is updated, restored from the locked commit and removed (split from custom-packs.test.mts so no file sums over a minute).
import { assert, existsSync, git, join, test, writeFileSync } from '../kit-cli.mts';
import { lockOf } from '../fixtures/installs.mts';
import { kit, sourceOf, team } from './custom-packs-rig.mts';

test('update pulls the newest; a teammate restores the locked commit; remove drops the source', () => {
  const { name, repo, url, project } = team();
  assert.equal(kit(project, 'add', name, '--from', url).status, 0);
  const first = sourceOf(project, name).commit;
  writeFileSync(join(repo, `packs/${name}/rules/${name}-second.md`), '---\n# concepts: js\npaths:\n  - "placeholder"\n---\n\n# A second law\n');
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'a second rule'); git(repo, 'push', '-q', 'origin', 'main');
  const doctor = kit(project, 'doctor');
  assert.equal(doctor.status, 0, `doctor reads the locked commit: ${doctor.stdout}`);
  assert.equal(sourceOf(project, name).commit, first);
  const r = kit(project, 'update');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /acme-internal: now 0\.1\.0/);
  assert.notEqual(sourceOf(project, name).commit, first);
  assert.ok(existsSync(join(project, `.claude/rules/${name}-second.md`)));
  assert.equal(kit(project, 'remove', name).status, 0);
  assert.equal(lockOf(project).sources, undefined);
  assert.ok(!existsSync(join(project, `.claude/rules/${name}-example.md`)));
});
