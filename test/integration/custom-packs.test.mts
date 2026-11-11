// 0.21.0: if a person makes something for their employer's internals, it is easy to make a repo and share it with their team.
import { CLI, assert, existsSync, fresh, git, hookRun, join, lessonWrite, mkdirSync, readFileSync, spawnSync, test, writeFileSync } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';
import { fixture, lockOf } from '../fixtures/installs.mts';
import { parseJson } from '../../packs/base/hooks/lib/json.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import type { Lock } from '../../packs/base/hooks/lib/types.d.mts';

interface Manifest { author?: string; hooks?: unknown }

const env = (): NodeJS.ProcessEnv => ({ ...process.env, CLAUDE_PACKS_CACHE: join(process.env.TMPDIR ?? '', 'pack-cache') });
const kit = (dir: string, ...a: string[]): Spawned => spawnSync('node', [CLI, ...a, '--dir', dir], { encoding: 'utf8', env: env() });
const manifestOf = (file: string): Manifest => parseJson<Manifest>(readFileSync(file, 'utf8')) ?? {};
const sourceOf = (dir: string, name: string): NonNullable<Lock['sources']>[string] => {
  const s = lockOf(dir).sources?.[name];
  assert.ok(s, `${name} has a source in the lock`);
  return s;
};

// A team's pack, made by new-pack and pushed to a "host" (a bare repository), with a project to install it in.
function team(name = 'acme-internal'): { name: string; repo: string; url: string; project: string } {
  const home = fresh('cp-team-');
  const host = join(home, 'host.git');
  git(home, 'init', '-q', '--bare', '--initial-branch', 'main', host);
  const url = `file://${host}`;
  const r = kit(home, 'new-pack', name, '--repo', url);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const repo = join(home, name);
  git(repo, 'remote', 'add', 'origin', url);
  git(repo, 'push', '-q', 'origin', 'main');
  return { name, repo, url, project: fixture('base') };
}

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
