// 0.21.0: if a person makes something for their employer's internals, it is easy to make a repo and share it with their team.
// (Update, restore and remove: custom-packs-update.test.mts, split so no file sums over a minute.)
import { assert, existsSync, git, hookRun, join, lessonWrite, mkdirSync, readFileSync, test, writeFileSync } from '../kit-cli.mts';
import { lockOf } from '../fixtures/installs.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { kit, manifestOf, sourceOf, team } from './custom-packs-rig.mts';

test('new-pack makes a repository that add --from installs, in any configuration; its check fires', () => {
  const { name, url, project } = team();
  const r = kit(project, 'add', name, '--from', url);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /acme-internal 0\.1\.0 by .* from file:/);
  assert.ok(existsSync(join(project, `.claude/rules/${name}-example.md`)));
  assert.ok(existsSync(join(project, `.claude/skills/${name}-example/SKILL.md`)));
  const refused = lessonWrite(project, 'src/a.js', 'OLD_API_NAME();\n');
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /acme-internal-example/);
  const lock = lockOf(project);
  assert.ok(lock.packs?.includes(name));
  assert.equal(sourceOf(project, name).url, url);
  assert.match(sourceOf(project, name).commit ?? '', /^[0-9a-f]{40}$/);
});

test('a custom hook stays off until the project enables it', () => {
  const { name, repo, url, project } = team();
  mkdirSync(join(repo, `packs/${name}/hooks`));
  writeFileSync(join(repo, `packs/${name}/hooks/acme-guard.mjs`), '// --selftest\nprocess.exit(0);\n');
  const pack = join(repo, `packs/${name}/pack.json`);
  const manifest = manifestOf(pack);
  manifest.hooks = { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/acme-guard.mjs"', timeout: 10 }] }] };
  writeFileSync(pack, JSON.stringify(manifest, null, 2));
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'a hook'); git(repo, 'push', '-q', 'origin', 'main');
  assert.equal(kit(project, 'add', name, '--from', url).status, 0);
  assert.ok(!existsSync(join(project, '.claude/hooks/acme-guard.mjs')), 'held back');
  assert.doesNotMatch(readFileSync(join(project, '.claude/settings.json'), 'utf8'), /acme-guard/);
  const layoutFile = join(project, '.claude/layout.json');
  const layout = readLayout(project);
  writeFileSync(layoutFile, JSON.stringify({ ...layout, enable: [...(layout.enable ?? []), 'hooks/acme-guard.mjs'] }, null, 2));
  assert.equal(kit(project, 'update').status, 0);
  assert.ok(existsSync(join(project, '.claude/hooks/acme-guard.mjs')), 'on once named');
  assert.match(readFileSync(join(project, '.claude/settings.json'), 'utf8'), /acme-guard/);
});

test('a repository without a real manifest is refused before anything is installed', () => {
  const { name, repo, url, project } = team();
  const pack = join(repo, `packs/${name}/pack.json`);
  const { author: _author, ...manifest } = manifestOf(pack);
  writeFileSync(pack, JSON.stringify(manifest, null, 2));
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'no author'); git(repo, 'push', '-q', 'origin', 'main');
  const r = kit(project, 'add', name, '--from', url);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /needs an author/);
  assert.equal(lockOf(project).sources, undefined);
  assert.equal(hookRun(project, 'lesson-checks.mjs', {}).status, 0);
});
