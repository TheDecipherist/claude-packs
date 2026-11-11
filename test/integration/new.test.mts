// `claude-packs new <name>`: the project on the house structure and the kit installed, from one command
// (it was the global new-project skill; the global part stays at three pieces).
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CLI, assert, existsSync, git as gitIn, join, readFileSync, readdirSync, spawnSync, test } from '../kit-cli.mts';

const ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };

test('new <name> scaffolds the project, installs the kit and starts it on a work/ branch', () => {
  const parent = mkdtempSync(join(tmpdir(), 'cpn-'));
  const home = mkdtempSync(join(tmpdir(), 'cpn-home-'));
  const r = spawnSync('node', [CLI, 'new', 'synthx', '--dir', parent, '--packs', 'audio-core,gpu-painter'], { encoding: 'utf8', env: { ...ENV, HOME: home } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dir = join(parent, 'synthx');
  for (const f of ['CLAUDE.md', 'build.md', 'bugs.md', 'workflow-bugs.md', 'docs/versions.md', '.gitignore', '.claude/layout.json', '.claude/settings.json']) assert.ok(existsSync(join(dir, f)), f);
  assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /^# synthx\n[\s\S]*<!-- claude-packs:start -->/);
  assert.deepEqual((JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8')) as { packs: string[] }).packs, ['base', 'audio-core', 'gpu-painter']);
  assert.ok(existsSync(join(dir, 'src/dsp')) && existsSync(join(dir, 'src/painter')), 'the layout folders');
  assert.match(r.stdout, /OK: base, audio-core, gpu-painter/);
  const git = (...a: string[]): string => gitIn(dir, ...a).trim();
  assert.equal(git('rev-parse', '--abbrev-ref', 'HEAD'), 'work/start', 'work goes on from a work/ branch');
  assert.equal(git('log', '--format=%s', 'main'), 'synthx: the house structure and claude-packs', 'the scaffold is main\'s first commit');
  assert.equal(git('status', '--porcelain'), '', 'nothing left over');
  assert.deepEqual(readdirSync(home), [], 'nothing global');
  const again = spawnSync('node', [CLI, 'new', 'synthx', '--dir', parent], { encoding: 'utf8', env: ENV });
  assert.equal(again.status, 2);
  assert.match(again.stderr, /already exists and is not empty/);
});

test('new takes a profile, and the new-project skill is no longer a global piece', () => {
  const parent = mkdtempSync(join(tmpdir(), 'cpn-'));
  const r = spawnSync('node', [CLI, 'new', 'subx', '--dir', parent, '--profile', 'sub37'], { encoding: 'utf8', env: ENV });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(readFileSync(join(parent, 'subx', 'CLAUDE.md'), 'utf8'), /`src\/engine\/`/);
  assert.ok(!existsSync(fileURLToPath(new URL('../../global/skills/new-project', import.meta.url))));
});
