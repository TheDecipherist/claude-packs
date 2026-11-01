// Sub37's first install found four faults in the kit (its workflow-bugs.md WB-1 to WB-4). Each has
// a test here that was seen failing before the fix.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PKG = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(PKG, 'bin/claude-packs.mjs');
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
const put = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
const init = (...packs) => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  execFileSync('node', [CLI, 'init', ...packs, '--dir', dir], { encoding: 'utf8' });
  return dir;
};
const fire = (dir, hook, payload) =>
  spawnSync('node', [join(dir, '.claude/hooks', hook)], { input: JSON.stringify(payload), env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });

test('WB-2: a nested clone under build/_deps is still judged by the project, a worktree by itself', () => {
  const dir = init('audio-core');
  git(dir, 'init', '-q');
  put(join(dir, 'build/_deps/juce-src/modules/juce_core/juce_core.h'), '// juce\n');
  git(join(dir, 'build/_deps/juce-src'), 'init', '-q');
  put(join(dir, 'third_party/lib/.git/HEAD'), 'ref: refs/heads/main\n');
  const write = (file) => fire(dir, 'protect-vendor.mjs', { tool_name: 'Edit', tool_input: { file_path: join(dir, file), old_string: 'a', new_string: 'b' } }).status;
  assert.equal(write('build/_deps/juce-src/modules/juce_core/juce_core.h'), 2, 'FetchContent clone of JUCE');
  assert.equal(write('third_party/lib/lib.h'), 2, 'a vendored repo with its own .git folder');
  assert.equal(write('src/dsp/Svf.cpp'), 0);
});

test('WB-1: coverage sees the kit\'s own skills and rules, never a worktree\'s copy', async () => {
  const dir = init('audio-core');
  put(join(dir, 'src/dsp/Svf.cpp'), '// svf\n');
  put(join(dir, '.claude/worktrees/agent-x/stray/Loose.cpp'), '// a worktree copy\n');
  const { coverage } = await import(pathToFileURL(join(PKG, 'lib/coverage.mjs')).href);
  const cov = await coverage(dir);
  assert.ok(!cov.deadRules.includes('skill-writing.md'), `dead: ${cov.deadRules}`);
  assert.ok(!cov.deadRules.includes('subagent-dispatch.md'), `dead: ${cov.deadRules}`);
  assert.ok(!cov.uncovered.some((f) => f.includes('worktrees')), `uncovered: ${cov.uncovered}`);
});

test('WB-3: git-guard refuses a command that writes a token URL into git config', () => {
  const dir = init('audio-core');
  const bash = (command) => fire(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command } }).status;
  for (const c of [
    'git push -u https://x-access-token:abc123@github.com/TheDecipherist/synthkit.git work/x',
    'git push --set-upstream "https://TheDecipherist:${THEDECIPHERIST_GITHUB_TOKEN}@github.com/TheDecipherist/sub37.git" main',
    'cd ../synthkit && git push origin work/x -u https://u:ghp_abc@github.com/a/b.git',
    'git remote set-url origin https://ghp_abcdef123@github.com/a/b.git',
    'git remote add personal https://TheDecipherist:$TOKEN@github.com/a/b.git',
    'git clone https://x-access-token:abc@github.com/a/b.git',
    'git config remote.origin.url https://u:tok@github.com/a/b.git',
  ]) assert.equal(bash(c), 2, c);
  for (const c of [
    'git push https://x-access-token:$TOKEN@github.com/a/b.git work/x',
    'git push -u origin work/x',
    'git remote set-url origin https://github.com/a/b.git',
    'git remote add personal git@github-decipherist:TheDecipherist/b.git',
    'git -c credential.helper=\'!f() { echo password=$T; }; f\' push -u origin work/x',
    'git status',
  ]) assert.equal(bash(c), 0, c);
});

test('WB-3: doctor finds a token in any repo\'s .git/config and never prints it', () => {
  const dir = init('audio-core');
  try { tokenRepo(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
});

function tokenRepo(dir) {
  git(dir, 'init', '-q');
  const doctor = () => spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8' });
  assert.doesNotMatch(doctor().stdout, /PROBLEM.*token/i); // 0.9.0: doctor prints the making hook's model-token cost, never a git token
  git(dir, 'remote', 'add', 'origin', 'https://github.com/a/b.git');
  git(dir, 'config', 'branch.main.remote', 'https://x-access-token:ghp_SECRET1@github.com/a/b.git');
  let r = doctor();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /PROBLEM: .*\.git\/config.*token/);
  assert.doesNotMatch(r.stdout, /SECRET1/);
  git(dir, 'config', '--unset', 'branch.main.remote');
  put(join(dir, 'build/_deps/juce-src/x'), '');
  git(join(dir, 'build/_deps/juce-src'), 'init', '-q');
  git(join(dir, 'build/_deps/juce-src'), 'remote', 'add', 'origin', 'https://u:SECRET2@example.com/j.git');
  r = doctor();
  assert.match(r.stdout, /PROBLEM: build\/_deps\/juce-src\/\.git\/config.*token/);
  assert.doesNotMatch(r.stdout, /SECRET2/);
}

test('WB-4: every hook in every pack has a passing --selftest, and doctor runs them all', () => {
  // Pack hooks import the shared lib/ that base installs beside them, so they run from an install.
  // 0.7.0: the opt-in hooks (tims-asks, idle-wake) install only when enabled, so this install enables them.
  const dir = init('audio-core', 'gpu-painter', 'stellix');
  const lf = join(dir, '.claude/layout.json');
  const layout = JSON.parse(readFileSync(lf, 'utf8'));
  layout.enable = JSON.parse(readFileSync(join(PKG, 'packs/base/pack.json'), 'utf8')).optIn;
  writeFileSync(lf, JSON.stringify(layout, null, 2));
  execFileSync('node', [CLI, 'update', '--dir', dir], { encoding: 'utf8' });
  const shipped = ['packs/base', 'packs/audio-core', 'packs/gpu-painter', 'packs/stellix']
    .flatMap((p) => { try { return readdirSync(join(PKG, p, 'hooks')).filter((f) => f.endsWith('.mjs')); } catch { return []; } }).sort();
  const installed = readdirSync(join(dir, '.claude/hooks')).filter((f) => f.endsWith('.mjs')).sort();
  assert.deepEqual(installed, shipped);
  const hooks = [...installed.map((f) => join(dir, '.claude/hooks', f)), join(PKG, 'global/hooks/version-pin-guard.mjs')];
  const failed = hooks.filter((h) => {
    const r = spawnSync('node', [h, '--selftest'], { encoding: 'utf8', input: '', timeout: 60000, env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
    return r.status !== 0 || !/selftest: OK/.test(r.stdout);
  }).map((h) => h.split('/').pop());
  assert.deepEqual(failed, []);
  assert.equal(spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8' }).status, 0);
  writeFileSync(join(dir, '.claude/hooks/protect-vendor.mjs'), "if (process.argv.includes('--selftest')) process.exit(1);\n");
  assert.match(spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8' }).stdout, /protect-vendor\.mjs fails its selftest/);
});
