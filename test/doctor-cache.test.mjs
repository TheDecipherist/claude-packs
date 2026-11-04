// 0.13.0 (KWB-41): `sync` takes 0.1 s and doctor 7.4 s, all of it hooks proving a law they already proved. A selftest that passed is
// not run again while the hook, its libs, node and the project's guards are the same; a changed hook is proved again; a failure is
// never remembered; `doctor --fresh` runs them all.
import { CLI, appendFileSync, assert, execFileSync, fresh, join, readFileSync, spawnSync, test, writeFileSync } from './kit-cli.mjs';

const doctor = (dir, cache, ...args) => spawnSync('node', [CLI, 'doctor', '--dir', dir, ...args], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_SELFTEST_CACHE: cache } });
const unchanged = (out) => Number(out.match(/selftests: (\d+) of \d+ unchanged/)?.[1] ?? 0);

function install() {
  const dir = fresh('dcache-');
  const cache = fresh('dcache-store-');
  execFileSync('node', [CLI, 'init', '--config', 'base', '--dir', dir], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_SELFTEST_CACHE: cache } });
  return { dir, cache };
}

test('a second doctor runs no selftest whose hook has not changed, and a changed hook is proved again', () => {
  const { dir, cache } = install();
  const second = doctor(dir, cache);
  assert.equal(second.status, 0, second.stdout);
  const all = unchanged(second.stdout);
  assert.ok(all > 5, `unchanged hooks are not run again: ${second.stdout}`);
  appendFileSync(join(dir, '.claude/hooks/folder-law.mjs'), '\n// changed\n');
  assert.equal(unchanged(doctor(dir, cache).stdout), all - 1, 'the changed hook runs again, the others do not');
  assert.equal(unchanged(doctor(dir, cache).stdout), all, 'and once it passed, it is remembered too');
  appendFileSync(join(dir, '.claude/hooks/lib/glob.mjs'), '\n// changed\n');
  assert.equal(unchanged(doctor(dir, cache).stdout), 0, 'a shared lib changed: every hook is proved again');
});

test('a failing selftest is never remembered, and --fresh runs them all', () => {
  const { dir, cache } = install();
  const hook = join(dir, '.claude/hooks/folder-law.mjs');
  writeFileSync(hook, readFileSync(hook, 'utf8').replace('\n', '\nif (process.argv.includes("--selftest")) process.exit(1);\n'));
  for (let i = 0; i < 2; i += 1) {
    const r = doctor(dir, cache);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /folder-law\.mjs fails its selftest/);
  }
  assert.equal(unchanged(doctor(dir, cache, '--fresh').stdout), 0, '--fresh runs every selftest');
});
