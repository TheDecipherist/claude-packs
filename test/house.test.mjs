// 0.6.0: the house hooks, skills and rules moved out of Stellix into the kit (each project-neutral, its
// project's values in layout.json "guards"), and three kit fixes: update takes over a file that is already
// the pack's own version, doctor --strict skips git-ignored build output, python hooks are managed.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const PACKS = fileURLToPath(new URL('../packs/', import.meta.url));
const run = (dir, ...a) => execFileSync('node', [CLI, ...a, '--dir', dir], { encoding: 'utf8' });
const tmp = () => mkdtempSync(join(tmpdir(), 'cph-'));
const lock = (dir) => JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
const fire = (dir, hook, payload) => spawnSync(hook.endsWith('.py') ? 'python3' : 'node', [join(dir, '.claude/hooks', hook)], {
  input: JSON.stringify(payload), env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8',
});
const setLayout = (dir, change) => {
  const f = join(dir, '.claude/layout.json');
  const l = JSON.parse(readFileSync(f, 'utf8'));
  change(l);
  writeFileSync(f, JSON.stringify(l, null, 2));
};

test('the house hooks install where they belong, project-neutral, and pass their selftests', () => {
  const dir = tmp();
  const out = run(dir, 'init', 'audio-core', 'gpu-painter');
  assert.match(out, /held back, not switched on .*hooks\/idle-wake\.mjs, hooks\/user-asks\.mjs/, 'the opt-in hooks wait for "enable"');
  assert.ok(!existsSync(join(dir, '.claude/hooks/user-asks.mjs')) && !existsSync(join(dir, '.claude/hooks/idle-wake.mjs')));
  setLayout(dir, (l) => { l.enable = ['hooks/user-asks.mjs', 'hooks/idle-wake.mjs']; });
  assert.match(run(dir, 'update'), /switching on \(new to this project\): hooks\/idle-wake\.mjs, hooks\/user-asks\.mjs/);
  const hooks = readdirSync(join(dir, '.claude/hooks'));
  assert.deepEqual(hooks.filter((h) => h.endsWith('.py')), ['browser-guard.py'], 'every kit hook is Node but browser-guard (README says why)');
  for (const h of ['git-guard.mjs', 'build-guard.mjs', 'time-guard.mjs', 'user-asks.mjs', 'idle-wake.mjs', 'browser-guard.py', 'protect-vendor.mjs']) {
    assert.ok(hooks.includes(h), h);
    const r = spawnSync(h.endsWith('.py') ? 'python3' : 'node', [join(dir, '.claude/hooks', h), '--selftest'], { env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
    assert.equal(r.status, 0, `${h}: ${r.stdout}${r.stderr}`);
    assert.doesNotMatch(readFileSync(join(dir, '.claude/hooks', h), 'utf8'), /stellix/i, `${h} names no project`);
  }
  assert.ok(!hooks.includes('copy-tree-guard.py'), 'merged into protect-vendor');
  const audioOnly = tmp();
  run(audioOnly, 'init', 'audio-core');
  assert.ok(!existsSync(join(audioOnly, '.claude/hooks/browser-guard.py')), 'browser-guard comes with gpu-painter');
  const s = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  // run by node itself (idle-wake: async) or named in a run-hooks.mjs command, one node process per settings entry (KWB-24)
  for (const h of ['git-guard.mjs', 'build-guard.mjs', 'time-guard.mjs', 'idle-wake.mjs', 'user-asks.mjs']) assert.match(s, new RegExp(`(?:node \\\\"\\$CLAUDE_PROJECT_DIR/|run-hooks\\.mjs\\\\"[^"]* )\\.claude/hooks/${h.replace('.', '\\.')}`));
  assert.match(s, /node \\"\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/idle-wake\.mjs/, 'an async hook keeps its own entry');
  assert.match(s, /python3 \\"\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/browser-guard\.py/);
  const settings = JSON.parse(s);
  assert.equal(settings.hooks.Stop[0].hooks[0].asyncRewake, true);
  assert.equal(settings.hooks.SessionStart[0].matcher, 'compact');
  assert.ok(!existsSync(join(dir, '.claude/hooks/lib/__pycache__')), 'no byte-code cache in the project');
  for (const [pack, check] of [['gpu-painter', 'no-opengl.json'], ['gpu-painter', 'no-opengl-link.json'], ['base', 'no-code-after-midline-comment.json']]) {
    assert.ok(existsSync(join(dir, '.claude/checks', check)), `${pack}: ${check}`);
  }
  assert.ok(!existsSync(join(audioOnly, '.claude/checks/no-opengl.json')));
});

test('git-guard takes the project\'s owner, token, trunk and commands from layout.json', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core');
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x'], { cwd: dir });
  const bash = (command) => fire(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command }, cwd: dir });
  assert.equal(bash('git add -A').status, 0, 'the house laws are off until the project switches them on');
  assert.equal(bash('git push -u https://x-access-token:abc@github.com/a/b.git work/x').status, 2, 'the token law is always on (Sub37 WB-3)');
  setLayout(dir, (l) => { l.guards = { git: { house: true } }; });
  assert.equal(bash('git add -A').status, 2);
  assert.equal(bash('git commit -m x -- a.h').status, 0, 'the trunk refusal is off by default');
  setLayout(dir, (l) => { l.guards = { git: { house: true, refuseTrunk: true } }; });
  assert.equal(bash('git commit -m x -- a.h').status, 2, 'and on when the project enables it');
  const house = 'git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/TheDecipherist/synth.git work/x';
  assert.equal(bash(house).status, 0, 'the default owner is the house');
  setLayout(dir, (l) => { l.guards = { git: { house: true, owner: 'Acme', tokenVar: 'ACME_TOKEN' } }; });
  const r = bash(house);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /github\.com\/Acme\/<repo>\.git/);
  assert.equal(bash('git push https://x-access-token:$ACME_TOKEN@github.com/Acme/app.git work/x').status, 0);
  run(dir, 'update');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')).guards.git.owner, 'Acme', 'guards survive an update');
});

test('a copy tree is read-only by its kind; the copy-trees rule loads there and in layout.json', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core');
  assert.match(readFileSync(join(dir, '.claude/rules/copy-trees-read-only.md'), 'utf8'), /paths:\n {2}- "\.claude\/layout\.json"\n---/);
  setLayout(dir, (l) => {
    l.folders.engines_copy = { path: 'src/engines/tabula', kind: 'copy', purpose: 'copied' };
    l.guards = { copy: { tools: ['tools/copy_in.py'] } };
  });
  run(dir, 'update');
  assert.match(readFileSync(join(dir, '.claude/rules/copy-trees-read-only.md'), 'utf8'), /"src\/engines\/tabula\/\*\*"/);
  const w = (file_path) => fire(dir, 'protect-vendor.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, file_path) } });
  const r = w('src/engines/tabula/Voice.h');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /copy tree src\/engines\/tabula.*\n.*python3 tools\/copy_in\.py/);
  assert.equal(w('src/engines/Voice.h').status, 0);
  const b = (command) => fire(dir, 'protect-vendor.mjs', { tool_name: 'Bash', tool_input: { command } }).status;
  assert.equal(b('echo x >> src/engines/tabula/Voice.h'), 2);
  assert.equal(b('python3 tools/copy_in.py src/engines/tabula/Voice.h'), 0);
  assert.equal(fire(dir, 'protect-vendor.mjs', { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(dir, 'src/engines/tabula/a.ipynb') } }).status, 2);
  assert.match(run(dir, 'doctor'), /OK:/);
});

test('the build-step and copy-and-prove skills install, triggered by "Use when", under 8,000 characters', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core');
  for (const skill of ['build-step', 'copy-and-prove']) {
    const text = readFileSync(join(dir, '.claude/skills', skill, 'SKILL.md'), 'utf8');
    assert.match(text, /^description: Use when/m, skill);
    assert.ok(text.length < 8000, `${skill}: ${text.length}`);
    assert.doesNotMatch(text, /stellix/i, skill);
  }
  const base = tmp();
  run(base, 'init', 'gpu-painter');
  assert.ok(existsSync(join(base, '.claude/skills/build-step/SKILL.md')), 'build-step is base');
  assert.ok(!existsSync(join(base, '.claude/skills/copy-and-prove')), 'copy-and-prove is audio-core');
  for (const rule of ['hooks-and-gates', 'plan-and-logs']) {
    const text = readFileSync(join(dir, '.claude/rules', `${rule}.md`), 'utf8');
    assert.doesNotMatch(text, /placeholder|stellix/i, rule);
  }
  assert.match(readFileSync(join(dir, '.claude/rules/hooks-and-gates.md'), 'utf8'), /"\.claude\/hooks\/\*\*"/);
  assert.match(readFileSync(join(dir, '.claude/rules/plan-and-logs.md'), 'utf8'), /"build\.md"[\s\S]*"bugs\.md"/);
});

test('a project\'s own hook entries stay; a kit hook already registered by hand is not doubled', () => {
  const dir = tmp();
  mkdirSync(join(dir, '.claude/hooks'), { recursive: true });
  writeFileSync(join(dir, '.claude/hooks/source-guard.py'), 'print(1)\n');
  const mine = (n) => ({ type: 'command', command: `python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/${n}"` });
  writeFileSync(join(dir, '.claude/settings.json'), JSON.stringify({ hooks: { PreToolUse: [
    { matcher: 'Write|Edit|MultiEdit', hooks: [mine('source-guard.py')] }, { matcher: 'Bash', hooks: [mine('git-guard.py'), mine('build-guard.py'), mine('shell-traps.py')] },
    { matcher: 'Bash|Write|Edit|MultiEdit|NotebookEdit', hooks: [mine('copy-tree-guard.py')] },
  ], SessionStart: [{ hooks: [mine('gnu-shell.py')] }] } }));
  assert.match(run(dir, 'init', 'audio-core'), /retired settings entries .*copy-tree-guard\.py/);
  run(dir, 'update');
  const hooks = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')).hooks;
  const all = Object.values(hooks).flat().flatMap((g) => g.hooks).map((h) => h.command);
  assert.equal(all.filter((c) => c.includes('source-guard.py')).length, 1, 'the project\'s own python hook is kept');
  const on = (event) => hooks[event].flatMap((g) => g.hooks).map((h) => h.command);
  // once per event: on Bash, and since 0.9.14 at Stop too (KWB-26: no session ends with a branch off GitHub)
  for (const event of ['PreToolUse', 'Stop']) assert.equal(on(event).filter((c) => c.includes('git-guard.mjs')).length, 1, `the kit's git-guard once on ${event}`);
  assert.equal(all.filter((c) => c.includes('build-guard.mjs')).length, 1, 'build-guard is the base pack\'s, once');
  for (const retired of ['copy-tree-guard.py', 'shell-traps.py', 'gnu-shell.py', 'git-guard.py', 'build-guard.py']) {
    assert.ok(!all.some((c) => c.includes(retired)), `${retired}: merged into protect-vendor, global by design, or Node now`);
  }
});

// A project that ran a Python forerunner by hand (Stellix: git-guard.py, user-asks.py in its settings) had that hook:
// update switches the Node hook on without an "enable" line, and retires the Python entry.
test('a Node hook is on in a project that ran its Python forerunner, and the forerunner\'s entry goes', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core');
  const lf = join(dir, '.claude/claude-packs.lock.json');
  const l = JSON.parse(readFileSync(lf, 'utf8'));
  for (const h of ['git-guard.mjs', 'user-asks.mjs', 'time-guard.mjs']) { delete l.files[`.claude/hooks/${h}`]; rmSync(join(dir, '.claude/hooks', h), { force: true }); }
  writeFileSync(lf, JSON.stringify(l));
  const sf = join(dir, '.claude/settings.json');
  const s = JSON.parse(readFileSync(sf, 'utf8'));
  for (const ev of Object.keys(s.hooks)) s.hooks[ev] = s.hooks[ev].map((g) => ({ ...g, hooks: g.hooks.filter((h) => !/git-guard|time-guard/.test(h.command)) }));
  s.hooks.PreToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/git-guard.py"' }] });
  s.hooks.SessionStart = [{ matcher: 'compact', hooks: [{ type: 'command', command: 'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/user-asks.py"' }] }];
  writeFileSync(sf, JSON.stringify(s));
  const out = run(dir, 'update');
  assert.ok(existsSync(join(dir, '.claude/hooks/git-guard.mjs')) && existsSync(join(dir, '.claude/hooks/user-asks.mjs')), 'had under the Python name');
  assert.ok(!existsSync(join(dir, '.claude/hooks/time-guard.mjs')), 'a hook it never had stays off');
  assert.match(out, /held back, not switched on .*hooks\/time-guard\.mjs/);
  assert.match(out, /retired settings entries .*git-guard\.py/);
  const all = readFileSync(sf, 'utf8');
  assert.match(all, /run-hooks\.mjs\\"[^"]* \.claude\/hooks\/git-guard\.mjs/, 'the Node hook runs (through run-hooks.mjs, KWB-24)');
  assert.doesNotMatch(all, /git-guard\.py|user-asks\.py/);
});

// The house git laws hold in a real git worktree: a commit there is judged by the worktree's branch, not main's.
test('the house git laws judge a commit by the checkout it runs in, inside a real worktree', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core');
  setLayout(dir, (l) => { l.guards = { git: { house: true, refuseTrunk: true } }; });
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x'], { cwd: dir });
  execFileSync('git', ['worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x'], { cwd: dir });
  const wt = join(dir, '.claude/worktrees/agent-x');
  const bash = (command) => fire(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command }, cwd: dir }).status;
  assert.equal(bash(`git -C ${wt} commit -m x -- src/dsp/Svf.cpp`), 0, 'the worktree is on a branch');
  assert.equal(bash(`git -C ${dir} commit -m x -- src/dsp/Svf.cpp`), 2, 'main is the trunk');
  assert.equal(bash(`cd ${wt} && git add -A`), 2);
  assert.equal(bash(`cd ${wt} && git add src/dsp/Svf.cpp`), 0);
});

// Bug (2): an installed file that is byte for byte the pack's own version (the user took the .pack-new, or
// the project's hand copy already matches) is taken over and its lock updated, never shadowed again.
test('update takes over a file that is the pack\'s own version instead of writing .pack-new again', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core');
  const hook = join(dir, '.claude/hooks/git-guard.mjs');
  writeFileSync(hook, `${readFileSync(hook, 'utf8')}// my note\n`);
  run(dir, 'update');
  assert.ok(existsSync(`${hook}.pack-new`), 'an edited file keeps its edit, the new version beside it');
  copyFileSync(`${hook}.pack-new`, hook);
  rmSync(`${hook}.pack-new`);
  run(dir, 'update');
  assert.ok(!existsSync(`${hook}.pack-new`), 'the pack version is recognised');
  assert.doesNotMatch(run(dir, 'doctor'), /you edited \.claude\/hooks\/git-guard\.mjs/, 'the lock holds its hash again');

  const rule = join(dir, '.claude/rules/gpu-bloom.md');
  const r2 = join(dir, '.claude/rules/math-domain-guards.md');
  writeFileSync(r2, `${readFileSync(r2, 'utf8')}- mine\n`);
  run(dir, 'update');
  assert.ok(existsSync(`${r2}.pack-new`));
  copyFileSync(`${r2}.pack-new`, r2); // the raw pack rule, its paths not yet written
  rmSync(`${r2}.pack-new`);
  run(dir, 'update');
  assert.ok(!existsSync(`${r2}.pack-new`), 'a rule taken from .pack-new is the pack\'s');
  assert.match(readFileSync(r2, 'utf8'), /"src\/dsp\/\*\*"/, 'and gets its paths written');
  assert.ok(!existsSync(rule));

  // A file the lock does not know, already identical to the pack's (a project's hand copy before reinstall).
  const fresh = tmp();
  mkdirSync(join(fresh, '.claude/hooks'), { recursive: true });
  copyFileSync(join(PACKS, 'synth-creator/hooks/time-guard.mjs'), join(fresh, '.claude/hooks/time-guard.mjs'));   // synth-creator's since 0.10.0
  run(fresh, 'init', 'audio-core');
  assert.ok(!existsSync(join(fresh, '.claude/hooks/time-guard.mjs.pack-new')));
  assert.ok(lock(fresh).files['.claude/hooks/time-guard.mjs'], 'tracked from now on');
});

// Bug (3): build output the project ignores (Stellix's out/**) is not "source no rule covers".
test('doctor --strict skips git-ignored files and folders', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  writeFileSync(join(dir, '.gitignore'), `${readFileSync(join(dir, '.gitignore'), 'utf8')}out/\n*.gen.cpp\n`);
  mkdirSync(join(dir, 'out/_deps/x'), { recursive: true });
  writeFileSync(join(dir, 'out/_deps/x/big.cpp'), 'int x;\n');
  writeFileSync(join(dir, 'out/moc.cpp'), 'int y;\n');
  writeFileSync(join(dir, 'src/dsp/table.gen.cpp'), 'int z;\n');
  writeFileSync(join(dir, 'src/dsp/Svf.cpp'), 'int s;\n');
  const strict = () => spawnSync('node', [CLI, 'doctor', '--strict', '--dir', dir], { encoding: 'utf8' });
  assert.doesNotMatch(strict().stdout, /no rule covers/, strict().stdout);
  mkdirSync(join(dir, 'lib'), { recursive: true });
  writeFileSync(join(dir, 'lib/Stray.cpp'), 'int x;\n');
  const r = strict();
  assert.match(r.stdout, /1 source file\(s\) no rule covers.*lib\/Stray\.cpp/);
  assert.doesNotMatch(r.stdout, /out\/|table\.gen/);
});

test('doctor fails when a hook fails its selftest', () => {
  const dir = tmp();
  run(dir, 'init', 'audio-core', 'gpu-painter');
  const hook = join(dir, '.claude/hooks/git-guard.mjs');
  const text = readFileSync(hook, 'utf8');
  const law = "if (/\\bgit\\b.*\\b(rebase|filter-branch)\\b/.test(p)";
  assert.ok(text.includes(law));
  writeFileSync(hook, text.replace(law, 'if (false'));
  const py = join(dir, '.claude/hooks/browser-guard.py');
  writeFileSync(py, readFileSync(py, 'utf8').replace('if rx.search(seg): return', 'if False: return'));
  const r = spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /git-guard\.mjs fails its selftest/);
  assert.match(r.stdout, /browser-guard\.py fails its selftest/, 'the one Python hook too');
});

// A project installed at 0.5.x and updated: every hook and check 0.6.0 added stays off until the project's layout
// enables it, update prints what it holds back, and an enabled git-guard still leaves main alone until refuseTrunk.
test('a 0.5.x project updated to 0.6.0 switches on nothing new it did not enable, and update prints the list', () => {
  const kit052 = tmp();
  execFileSync('sh', ['-c', `git -C '${fileURLToPath(new URL('..', import.meta.url))}' archive c671865 | tar -x -C '${kit052}'`]);
  const dir = tmp();
  execFileSync('node', [join(kit052, 'bin/claude-packs.mjs'), 'init', 'audio-core', 'gpu-painter', '--dir', dir], { encoding: 'utf8' });
  const before = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  // 0.9.0 (KWB-1): an older synth fails doctor until it writes design/shape.json; the shape hooks are the law and switch on
  assert.throws(() => run(dir, 'update'), (e) => /no design\/shape\.json: a synth writes down/.test(String(e.stdout)));
  mkdirSync(join(dir, 'design'), { recursive: true });
  writeFileSync(join(dir, 'design/shape.json'), '{ "concepts": {}, "exclude": [] }\n');
  const out = run(dir, 'update');
  assert.doesNotMatch(out, /shape-law|brief-guard/, 'switched on by the first update already');
  for (const item of ['hooks/git-guard.mjs', 'hooks/build-guard.mjs', 'hooks/time-guard.mjs', 'hooks/user-asks.mjs', 'hooks/idle-wake.mjs', 'hooks/browser-guard.py', 'checks/no-opengl.json', 'checks/no-code-after-midline-comment.json']) {
    assert.match(out, new RegExp(`held back, not switched on .*${item.replace(/[./]/g, (c) => `\\${c}`)}`), item);
    assert.ok(!existsSync(join(dir, '.claude', item)), `${item} not installed`);
  }
  assert.ok(out.indexOf('held back') < out.indexOf('Packs:'), 'the list comes before the work');
  const settings = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  for (const h of ['git-guard', 'build-guard', 'time-guard', 'user-asks', 'idle-wake', 'browser-guard']) assert.doesNotMatch(settings, new RegExp(`hooks/${h}\\.(py|mjs)`), h);
  assert.match(before, /protect-vendor/);
  assert.match(settings, /protect-vendor/, 'what it had stays on');
  assert.match(run(dir, 'doctor'), /OK:/);

  setLayout(dir, (l) => { l.enable = ['hooks/git-guard.mjs']; });
  assert.match(run(dir, 'update'), /switching on \(new to this project\): hooks\/git-guard\.mjs/);
  assert.ok(existsSync(join(dir, '.claude/hooks/git-guard.mjs')));
  assert.ok(!existsSync(join(dir, '.claude/hooks/user-asks.mjs')));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x'], { cwd: dir });
  const commit = fire(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command: 'git commit -m x -- a.h' }, cwd: dir });
  assert.equal(commit.status, 0, 'no trunk refusal unless refuseTrunk');
  assert.equal(fire(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command: 'git add -A' }, cwd: dir }).status, 0, 'no house laws unless house');
  assert.doesNotMatch(run(dir, 'update'), /switching on/, 'nothing new the second time');
});
