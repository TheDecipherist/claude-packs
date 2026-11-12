// A project installed at 0.5.x and updated: every hook and check 0.6.0 added stays off until the project's layout
// enables it, update prints what it holds back, and an enabled git-guard still leaves main alone until refuseTrunk.
// The install is by the old kit itself (git archive of c671865), so this flow installs on purpose.
import { execFileSync } from 'node:child_process';
import { KIT, assert, existsSync, fresh, git, hookRun, join, mkdirSync, readFileSync, registeredHooks, run, test, writeFileSync } from '../kit-cli.mts';
import { withLayout } from '../fixtures/installs.mts';

test('a 0.5.x project updated to 0.6.0 switches on nothing new it did not enable, and update prints the list', () => {
  const kit052 = fresh('cph-');
  // two steps, so a commit the checkout lacks fails here by name: in a pipe the shell reported only tar's exit, and an empty tar
  // left no kit to run (the Mac suite, from a copy without the history: KWB-158's sweep); no sh, so Windows runs it too
  const archive = execFileSync('git', ['-C', KIT, 'archive', 'c671865'], { maxBuffer: 1 << 28 });
  execFileSync('tar', ['-x', '-C', kit052], { input: archive });
  const dir = fresh('cph-');
  execFileSync('node', [join(kit052, 'bin/claude-packs.mjs'), 'init', 'audio-core', 'gpu-painter', '--dir', dir], { encoding: 'utf8' });
  const before = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  // 0.9.0 (KWB-1): an older synth fails doctor until it writes design/shape.json; the shape hooks are the law and switch on
  assert.throws(() => run(dir, 'update'), (e: { stdout?: unknown }) => /no design\/shape\.json: a synth writes down/.test(String(e.stdout)));
  mkdirSync(join(dir, 'design'), { recursive: true });
  writeFileSync(join(dir, 'design/shape.json'), '{ "concepts": {}, "exclude": [] }\n');
  const out = run(dir, 'update');
  assert.doesNotMatch(out, /shape-law|brief-guard/, 'switched on by the first update already');
  for (const item of ['hooks/git-guard.mjs', 'hooks/build-guard.mjs', 'hooks/time-guard.mjs', 'hooks/user-asks.mjs', 'hooks/idle-wake.mjs', 'hooks/browser-guard.mjs', 'checks/no-opengl.json', 'checks/no-code-after-midline-comment.json']) {
    assert.match(out, new RegExp(`held back, not switched on .*${item.replace(/[./]/g, (c) => `\\${c}`)}`), item);
    assert.ok(!existsSync(join(dir, '.claude', item)), `${item} not installed`);
  }
  assert.ok(out.indexOf('held back') < out.indexOf('Packs:'), 'the list comes before the work');
  const settings = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  for (const h of ['git-guard', 'build-guard', 'time-guard', 'user-asks', 'idle-wake', 'browser-guard']) assert.doesNotMatch(settings, new RegExp(`hooks/${h}\\.(py|mjs)`), h);
  assert.match(before, /protect-vendor/);
  assert.ok(registeredHooks(dir).includes('protect-vendor'), 'what it had stays on');
  assert.match(run(dir, 'doctor'), /OK:/);

  withLayout(dir, { enable: ['hooks/git-guard.mjs'] });
  assert.match(run(dir, 'update'), /switching on \(new to this project\): hooks\/git-guard\.mjs/);
  assert.ok(existsSync(join(dir, '.claude/hooks/git-guard.mjs')));
  assert.ok(!existsSync(join(dir, '.claude/hooks/user-asks.mjs')));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'x');
  const commit = hookRun(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command: 'git commit -m x -- a.h' }, cwd: dir });
  assert.equal(commit.status, 0, 'no trunk refusal unless refuseTrunk');
  assert.equal(hookRun(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command: 'git add -A' }, cwd: dir }).status, 0, 'no house laws unless house');
  assert.doesNotMatch(run(dir, 'update'), /switching on/, 'nothing new the second time');
});
