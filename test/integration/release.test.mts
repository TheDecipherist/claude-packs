// The release's three refusals (typescript order W9, KWB-166), each run on a scratch clone with a scratch bare remote and no network:
// a red gate, an empty CHANGELOG section, and a proxy binary changed after it was built. Each plant has its control: the same
// release with the plant removed goes past the step the plant stops.
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { hostTarget } from '../../lib/proxy-binary.mts';
import { scratchDir, put } from '../../packs/base/hooks/lib/files.mts';
import { goVersion } from '../../scripts/build-proxy.mts';
import { release } from '../../scripts/release.mts';
import type { ReleaseOptions } from '../../scripts/release-state.mts';
import { KIT, assert, git, join, spawnSync, test } from '../kit-cli.mts';

const REGISTRY = 'http://127.0.0.1:1';   // nothing listens: a step that reaches the registry fails at once
const ENV = { ...process.env, npm_config_fetch_retries: '0', npm_config_fetch_retry_mintimeout: '1', npm_config_fetch_timeout: '3000' };
const LOCK = '{"name":"scratch-kit","version":"1.0.0","lockfileVersion":3,"requires":true,"packages":{"":{"name":"scratch-kit","version":"1.0.0"}}}\n';
const PASS = ['node', '-e', ''];
const FAIL = ['node', '-e', 'process.exit(1)'];

/** A scratch remote (bare) and a clone of it on a work branch, one change ahead of main, the release's two scripts stubbed. */
function scratchClone(unreleased: string): { work: string; remote: string } {
  const base = scratchDir('release-');
  const remote = join(base, 'remote.git');
  const work = join(base, 'work');
  git(base, 'init', '-q', '--bare', '-b', 'main', remote);
  git(base, 'init', '-q', '-b', 'main', work);
  git(work, 'config', 'user.name', 'scratch');
  git(work, 'config', 'user.email', 'scratch@local');
  put(join(work, 'package.json'), '{"name":"scratch-kit","version":"1.0.0"}\n');
  put(join(work, 'package-lock.json'), LOCK);
  put(join(work, 'CHANGELOG.md'), '# Changelog\n\n## 1.0.0 (2026-01-01)\n\n- the first\n');
  put(join(work, 'README.md'), 'a readme\n');
  // the generators: one tracked file rewritten and one new file, as counts.mts does
  put(join(work, 'scripts/counts.mts'), "import { appendFileSync } from 'node:fs';\nappendFileSync('README.md', 'counted\\n');\nappendFileSync('manifest.json', '{}\\n');\n");
  put(join(work, 'scripts/build-proxy.mts'), 'process.exit(0);\n');
  put(join(work, '.gitignore'), 'packs/base/hooks/bin/*/\nbuild/\n');
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'the first');
  git(work, 'remote', 'add', 'origin', remote);
  git(work, 'push', '-q', 'origin', 'main');
  git(work, 'checkout', '-q', '-b', 'work/x');
  put(join(work, 'CHANGELOG.md'), `# Changelog\n\n${unreleased}\n## 1.0.0 (2026-01-01)\n\n- the first\n`);
  git(work, 'add', 'CHANGELOG.md');
  git(work, 'commit', '-q', '-m', 'a change');
  return { work, remote };
}

/** One release of the clone, its log and its refusals. */
function releaseOf(work: string, over: Partial<ReleaseOptions> = {}): { code: number; log: string; error: string } {
  const log: string[] = [];
  const error: string[] = [];
  const code = release({ root: work, kind: 'patch', dryRun: false, registry: REGISTRY, date: '2026-11-12', ...over }, ENV, (l) => log.push(l), (e) => error.push(e));
  return { code, log: log.join('\n'), error: error.join('\n') };
}

const headOf = (dir: string, ref: string): string => git(dir, 'rev-parse', ref).trim();

test('a red gate refuses the release before anything is changed; the same release with a green gate goes on past it', () => {
  const { work, remote } = scratchClone('## Unreleased\n\n- the change\n');
  const before = headOf(work, 'HEAD');
  const red = releaseOf(work, { gate: FAIL });
  assert.equal(red.code, 2);
  assert.match(red.error, /release stopped at gate/);
  assert.equal(headOf(work, 'HEAD'), before, 'no commit was made');
  assert.match(readFileSync(join(work, 'package.json'), 'utf8'), /"version":"1\.0\.0"/, 'the version was not bumped');
  assert.equal(headOf(remote, 'main'), headOf(work, 'origin/main'), 'main was not moved');
  // control: the plant removed, the release is stopped later, at the registry, with the work landed
  const green = releaseOf(work, { gate: PASS });
  assert.match(green.error, /release stopped at publish/);
  assert.match(green.log, /done: bump the version to 1\.0\.1/);
  assert.match(green.log, /done: date the CHANGELOG heading of 1\.0\.1/);
  assert.equal(headOf(remote, 'main'), headOf(work, 'HEAD'), 'main was landed on the scratch remote');
  assert.match(git(work, 'log', '--format=%s', '-3'), /release 1\.0\.1: the generated files/);
  assert.equal(git(work, 'show', '--name-only', '--format=', 'HEAD~0').split('\n').filter(Boolean).sort().join(), 'README.md,manifest.json', 'the generated files, tracked and new, are committed by name');
  assert.match(readFileSync(join(work, 'CHANGELOG.md'), 'utf8'), /^## 1\.0\.1 \(2026-11-12\)$/m);
  const again = releaseOf(work, { gate: FAIL });
  assert.match(again.log, /done already: the gate/, 'run again, the steps done are skipped (the red gate is not asked again)');
  assert.match(again.error, /release stopped at publish/);
});

test('an empty CHANGELOG section refuses the release up front; a section with a line in it is accepted', () => {
  const { work } = scratchClone('## Unreleased\n');
  const before = headOf(work, 'HEAD');
  const empty = releaseOf(work, { gate: PASS });
  assert.equal(empty.code, 2);
  assert.match(empty.error, /release refused[^]*section is empty/);
  assert.equal(headOf(work, 'HEAD'), before, 'nothing was done');
  put(join(work, 'CHANGELOG.md'), '# Changelog\n\n## Unreleased\n\n- a line\n\n## 1.0.0 (2026-01-01)\n\n- the first\n');
  git(work, 'commit', '-q', '-m', 'a line', '--', 'CHANGELOG.md');
  assert.doesNotMatch(releaseOf(work, { gate: PASS }).error, /release refused/);
});

test('a rehearsal is refused a GitHub remote and a public registry, and a dirty tree', () => {
  const { work } = scratchClone('## Unreleased\n\n- the change\n');
  git(work, 'remote', 'add', 'hub', 'https://github.com/example/example.git');
  assert.match(releaseOf(work, { gate: PASS, remote: 'hub' }).error, /is GitHub/);
  assert.match(releaseOf(work, { gate: PASS, registry: 'https://registry.npmjs.org/' }).error, /public registry/);
  writeFileSync(join(work, 'package.json'), '{"name":"scratch-kit","version":"1.0.0","x":1}\n');
  assert.match(releaseOf(work, { gate: PASS }).error, /uncommitted/);
});

const go = goVersion(KIT, process.env);
const skip = go === null || process.platform !== 'darwin' || hostTarget() === null ? 'needs Go and macOS (codesign)' : false;

test('a proxy binary changed after it was built refuses the release before the package is made', { skip, timeout: 280_000 }, () => {
  const { work } = scratchClone('## Unreleased\n\n- the change\n');
  for (const rel of ['scripts/build-proxy.mts', 'scripts/wire-gen.mts', 'lib/proxy-binary.mts', 'lib/manifest.mts', 'packs/base/hooks/lib', 'proxy']) cpSync(join(KIT, rel), join(work, rel), { recursive: true });
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'the proxy builder');
  const binary = join(work, 'packs/base/hooks/bin/darwin-arm64/hook-proxy');
  const flip = (): void => {
    const bytes = readFileSync(binary);
    const middle = Math.floor(bytes.length / 2);
    bytes[middle] = (bytes[middle] ?? 0) ^ 0xff;
    writeFileSync(binary, bytes);
  };
  const planted = releaseOf(work, { gate: PASS, after: { land: flip } });
  assert.equal(planted.code, 2);
  assert.match(planted.log, /done: the proxy: the four builds/);
  assert.match(planted.error, /release stopped at verify[^]*codesign -v refuses/);
  assert.doesNotMatch(planted.log, /npm publish/, 'nothing was published');
  // control: the binary rebuilt, the same release goes past verify and stops at the registry
  assert.equal(spawnSync('node', ['scripts/build-proxy.mts'], { cwd: work, encoding: 'utf8' }).status, 0, 'a build finds the changed binary and makes it again');
  const rebuilt = releaseOf(work, { gate: PASS });
  assert.match(rebuilt.error, /release stopped at publish/);
});
