// The suite's own lint (typescript order W5.5): how many installs the tests make, and what a test run leaves behind. Beside
// test/repo-lint.test.mts, which holds the lint of the kit's tree.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { alive } from '../packs/base/hooks/lib/daemon-find.mts';
import { put, scratchDir } from '../packs/base/hooks/lib/files.mts';
import { toJson } from '../packs/base/hooks/lib/json.mts';
import { INIT_SITE_LIMIT, initSites } from './repo-readers.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));

test('a test starts from fixture(name): under 40 init call sites in the suite', () => {
  const sites = initSites(KIT);
  assert.ok(sites.length < INIT_SITE_LIMIT, `${sites.length} init call sites, the limit is under ${INIT_SITE_LIMIT}: start from fixture(name) in test/fixtures/installs.mts`);
});

test('the install-site counter counts an init a test spawns, and not git\'s', () => {
  const dir = scratchDir('sites-');
  put(join(dir, 'test/a.test.mts'), "run(dir, 'init', 'audio-core');\ngit(dir, 'init', '-q');\n");
  put(join(dir, 'test/fixtures/b.mts'), "run(dir, 'init');\n");
  assert.deepEqual(initSites(dir), ['test/a.test.mts:1']);
});

const residentLeft = (cache: string): string[] => spawnSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).stdout.split('\n').filter((l) => l.includes('resident.mjs') && l.includes(cache));

/** A process that starts a resident.mjs under its CLAUDE_PACKS_CACHE and exits: with the suite's preload (which owns that cache and
 *  stops the runner at exit) or without it (the cache named here, nothing stops it). Returns the runner's pid and the cache. */
function startResident(withPreload: boolean): { pid: number; cache: string } {
  const dir = scratchDir('resident-');
  put(join(dir, 'resident.mjs'), 'setTimeout(() => {}, 60000);\n');
  const script = `import { spawn } from 'node:child_process';
    const child = spawn(process.execPath, [${toJson(join(dir, 'resident.mjs'))}, process.env.CLAUDE_PACKS_CACHE], { detached: true, stdio: 'ignore' });
    child.unref(); process.stdout.write(child.pid + ' ' + process.env.CLAUDE_PACKS_CACHE);`;
  const env: Record<string, string | undefined> = { ...process.env, CLAUDE_PACKS_CACHE: withPreload ? undefined : join(dir, 'cache') };
  const preload = withPreload ? ['--import', join(KIT, 'test/fresh-tmp.mts')] : [];
  const r = spawnSync('node', [...preload, '--input-type=module', '-e', script], { encoding: 'utf8', env });
  const [pid = '0', cache = ''] = r.stdout.split(' ');
  return { pid: Number(pid), cache };
}

test('the run\'s temp folder holds the daemon cache, and no resident.mjs is left after a process that started one (planted: a leftover is found)', async () => {
  assert.match(process.env.CLAUDE_PACKS_CACHE ?? '', /claude-packs-test-/, 'the suite\'s CLAUDE_PACKS_CACHE is in the run\'s own folder');
  const kept = startResident(false);
  const stopped = startResident(true);
  try {
    await new Promise((done) => setTimeout(done, 500));
    assert.equal(residentLeft(kept.cache).length, 1, 'a runner nobody stopped is found');
    assert.equal(alive(stopped.pid), false, 'the teardown of fresh-tmp stopped the runner its process started');
    assert.deepEqual(residentLeft(stopped.cache), []);
  } finally {
    if (kept.pid) process.kill(kept.pid, 'SIGKILL');
  }
  assert.deepEqual(residentLeft(String(process.env.CLAUDE_PACKS_CACHE)), [], '0 resident.mjs under this run\'s cache');
});
