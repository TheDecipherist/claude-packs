// 0.20.0: what a real install found (AdmiralMCP, kit 0.14.0, build/kit-review-plan.md Phase 5). Each case failed before; the checks' own
// examples carry the rest, proved by doctor's selftest of lesson-checks.
import { house } from '../packs/base/hooks/git-guard.mjs';
import { CLI, assert, execFileSync, fresh, join, lessonWrite, mkdirSync, readFileSync, run, spawnSync, test, writeFileSync } from './kit-cli.mjs';

const clean = { dirty: () => [], branch: () => 'main', hasHead: () => true };

test('the lock says which kit wrote it', () => {
  const dir = fresh('fix-lock-');
  run(dir, 'init', '--config', 'base');
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8')).kit, version);
});

test('entry-registers-shutdown reads its signal names, which are strings', () => {
  const dir = fresh('fix-entry-');
  run(dir, 'init', 'js-ts');
  const body = "process.on('SIGTERM', stop);\nprocess.on('SIGINT', stop);\nprocess.on('uncaughtException', die);\nprocess.on('unhandledRejection', die);\napp.listen({ port });\n";
  assert.equal(lessonWrite(dir, 'src/server.ts', body).status, 0);
});

test('git-guard: gh logged in needs no token named; trunkNeedsYes leaves the trunk to its owner', () => {
  assert.match(house('gh pr list', '.', clean), /names the token/);
  assert.equal(house('gh pr list', '.', clean, { ghAuth: 'cli' }), null);
  const waiting = { ...clean, unpushed: () => ({ branch: 'main', url: 'u', commits: [{ sha: 'a', subject: 's' }] }) };
  assert.match(house("git commit -m x -- a", '.', waiting), /not on GitHub/);
  assert.equal(house("git commit -m x -- a", '.', waiting, { trunkNeedsYes: true, trunks: ['main'] }), null);
});

test('git-guard: pushNeedsYes leaves every push to the owner, a work branch too (KWB-157)', () => {
  const work = { ...clean, branch: () => 'work/x', unpushed: () => ({ branch: 'work/x', url: 'u', commits: [{ sha: 'a', subject: 's' }] }) };
  assert.match(house("git commit -m x -- a", '.', work, { trunkNeedsYes: true, trunks: ['main'] }), /not on GitHub/);
  assert.equal(house("git commit -m x -- a", '.', work, { pushNeedsYes: true }), null);
  assert.match(house("git push -f origin work/x", '.', work, { pushNeedsYes: true }), /Never force/);
});

test('a kit-lock lease held by this same process under an old session id is this session\'s (KWB-40)', () => {
  const dir = fresh('fix-kl-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  writeFileSync(join(dir, '.claude-packs-lock'), JSON.stringify({ version: 2, holder: { session: 'old', pid: 4242 }, branch: 'b', started_at: new Date().toISOString(), last_seen: new Date().toISOString() }));
  const code = `import('${CLI.replace('bin/claude-packs.mjs', 'lib/kit-lock.mjs')}').then(({ acquire }) => console.log(JSON.stringify(acquire(process.argv[1], 'new', { home: process.argv[1] }))));`;
  const out = spawnSync('node', ['-e', code, dir], { encoding: 'utf8', env: { ...process.env, CLAUDE_PID: '4242' } });
  assert.ok(JSON.parse(out.stdout).mine, out.stdout + out.stderr);
  assert.equal(JSON.parse(readFileSync(join(dir, '.claude-packs-lock'), 'utf8')).holder.session, 'new');
});

test('the shape ids is valid and judged by nothing; senses blank a word used another way (KWB-16, KWB-20)', () => {
  const dir = fresh('fix-shape-');
  run(dir, 'init', '--config', 'base');
  mkdirSync(join(dir, 'design'), { recursive: true });
  writeFileSync(join(dir, 'design/shape.json'), JSON.stringify({ concepts: { patch: { shape: 'ids' }, band: { shape: 'many', count: 4, generator: 'bandId(i)', senses: ['first band'] } }, exclude: [] }));
  const r = spawnSync('node', [CLI, 'shape', 'scan', '--dir', dir], { encoding: 'utf8' });
  assert.doesNotMatch(r.stdout + r.stderr, /shape must be/);
  const write = (content) => spawnSync('node', [join(dir, '.claude/hooks/shape-law.mjs')], { input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: join(dir, 'src/a.cpp'), content } }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).status;
  assert.equal(write('// the first band of the third-octave measurement\n'), 0);
  assert.equal(write('// the second band\n'), 2);
});
