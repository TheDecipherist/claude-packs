// 1.2.0: tests stop reaching the user's desktop. On a build a gate run by hand opened its window on the real display for half
// a minute at a time, and the same happened on macOS, so the settings live in one script and a skill sends every run through it.
import { chmodSync } from 'node:fs';
import { KIT, assert, fresh, join, readFileSync, spawnSync, test, writeFileSync } from './kit-cli.mjs';
import { QUIET_ENV, plan } from '../packs/base/tools/quiet-test.mjs';

const TOOL = join(KIT, 'packs/base/tools/quiet-test.mjs');

function fakeXvfb() {
  const dir = fresh('xvfb-');
  const tool = join(dir, 'xvfb-run');
  writeFileSync(tool, '#!/bin/sh\necho "virtual display: $*"\nshift\nexec "$@"\n');
  chmodSync(tool, 0o755);
  return dir;
}

const run = (args, env) => spawnSync('node', [TOOL, ...args], { encoding: 'utf8', env });

test('on Linux with a display, a window goes to a virtual one, and Wayland is not left open beside it', () => {
  const env = { PATH: `${fakeXvfb()}:${process.env.PATH}`, DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-0' };
  const done = run(['sh', '-c', 'echo "wayland=[$WAYLAND_DISPLAY] quiet=$QUIET_TEST"'], env);
  assert.equal(done.status, 0);
  assert.match(done.stdout, /virtual display: -a/);
  assert.match(done.stdout, /wayland=\[\] quiet=1/);
});

test('the command keeps its own exit code', () => {
  assert.equal(run(['sh', '-c', 'exit 7'], { PATH: `${fakeXvfb()}:${process.env.PATH}`, DISPLAY: ':0' }).status, 7);
});

test('with a display and no xvfb it refuses, and never opens on the desktop', () => {
  const done = plan(['gate'], { PATH: '/nowhere', DISPLAY: ':0' }, 'linux');
  assert.match(done.refused ?? '', /xvfb-run is not installed/);
});

test('with no display there is nothing to protect, and macOS guards the focus', () => {
  assert.equal(plan(['gate'], { PATH: process.env.PATH }, 'linux').refused, undefined);
  assert.equal(plan(['gate'], { PATH: process.env.PATH }, 'darwin').guard, true);
});

test('every run is told to be quiet, on any platform', () => {
  for (const platform of ['linux', 'darwin', 'win32']) {
    const { env } = plan(['gate'], { PATH: process.env.PATH }, platform);
    for (const [key, value] of Object.entries(QUIET_ENV)) assert.equal(env[key], value, `${platform} ${key}`);
  }
});

test('a run with no command says how to use it', () => {
  const done = run([], { PATH: process.env.PATH });
  assert.equal(done.status, 2);
  assert.match(done.stderr, /usage/);
});

test('the law is always loaded, and the skill names the script', () => {
  assert.match(readFileSync(join(KIT, 'packs/base/rules/test-only-what-changed.md'), 'utf8'), /quiet-test\.mjs/);
  const skill = readFileSync(join(KIT, 'packs/base/skills/test-quietly/SKILL.md'), 'utf8');
  assert.match(skill, /^description: Use when/m);
  assert.ok(skill.length < 8000);
  assert.match(skill, /node \.claude\/tools\/quiet-test\.mjs/);
});
