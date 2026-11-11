// test-verdict (the base tool): its --help prints the usage and runs nothing (KWB-123: it ran the project's whole test command
// and printed a verdict about it), its --selftest runs nothing of the project's either, and a real run still gives its verdict.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { parseCtest } from '../../../packs/base/tools/test-verdict.mts';

const TOOL = new URL('../../../packs/base/tools/test-verdict.mjs', import.meta.url).pathname;

/** A project whose test command leaves a marker file when it runs. */
function project(): { dir: string; marker: string } {
  const dir = scratchDir('test-verdict-');
  const marker = join(dir, 'ran.marker');
  put(join(dir, '.claude', 'layout.json'), JSON.stringify({ folders: {}, concepts: {}, commands: { test: `touch ${marker}` } }));
  return { dir, marker };
}
const run = (dir: string, ...args: string[]) =>
  spawnSync(process.execPath, [TOOL, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });

test('--help (and -h) print the usage and run no command, whatever the project says its test command is', () => {
  for (const flag of ['--help', '-h']) {
    const { dir, marker } = project();
    const r = run(dir, flag);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage: .*test-verdict/);
    assert.match(r.stdout, /--red/);
    assert.equal(existsSync(marker), false, `${flag} ran the project's test command`);
    assert.equal(existsSync(join(dir, '.claude', 'state', 'last-test.log')), false, `${flag} wrote a log of a run`);
  }
});

test('a plain run still runs the command, and says the runner is broken when no test ran (exit 2)', () => {
  const { dir, marker } = project();
  const r = run(dir);
  assert.equal(r.status, 2);
  assert.equal(existsSync(marker), true);
  assert.match(r.stdout, /RUNNER_BROKEN/);
});

test('a green and a red-gate run give their verdicts from the command given after --', () => {
  const { dir } = project();
  const green = run(dir, '--', 'echo "100% tests passed, 0 tests failed out of 3"');
  assert.equal(green.status, 0);
  assert.match(green.stdout, /"verdict": "GREEN"/);
  const sample = 'echo "50% tests passed, 1 tests failed out of 2"; echo "The following tests FAILED:"; echo "  2 - svf (Failed)"';
  const red = run(dir, '--red', 'svf', '--', sample);
  assert.equal(red.status, 0);
  assert.match(red.stdout, /RED_CONFIRMED/);
  const wrong = run(dir, '--red', 'other', '--', sample);
  assert.equal(wrong.status, 1);
  assert.match(wrong.stdout, /RED_GATE_FAILED/);
});

test('parseCtest reads the totals and the failed tests, and null when ctest said nothing', () => {
  const p = parseCtest('50% tests passed, 1 tests failed out of 2\n\nThe following tests FAILED:\n\t  2 - svf_stable_under_fm (Failed)\n');
  assert.deepEqual(p, { total: 2, failed: [{ name: 'svf_stable_under_fm', why: 'Failed' }] });
  assert.equal(parseCtest('No tests were found!!!'), null);
});

test('--selftest passes and runs no project command', () => {
  const { dir, marker } = project();
  const r = run(dir, '--selftest');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /test-verdict selftest: OK/);
  assert.equal(existsSync(marker), false);
});
