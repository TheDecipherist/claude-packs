// What an install of base is and keeps, with no hook of its own (the tests of the old install-fixes, kit-guards, micro and sub37-wb that
// are about the install, its lock, doctor and the kit's own repo): the lock says which kit wrote it, the rules resolve to real paths,
// doctor reads the hooks and the skills, a project's own hook keeps its own settings entry, and the kit repo is a project like any
// other. The hooks' own refusals are in the file of each hook.
import { readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { coverage } from '../../../lib/coverage.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { parseJson, readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { git, lockOf } from '../../fixtures/installs.mts';
import { KIT, assert, cli, existsSync, put, readFileSync, run, spawnSync, statSync, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

test('the lock says which kit wrote it', () => {
  const dir = fixture('base');
  assert.equal(lockOf(dir).kit, readJson<{ version: string }>(join(KIT, 'package.json'))?.version);
});

test('a kit-lock lease held by this same process under an old session id is this session\'s (KWB-40)', () => {
  const dir = scratchDir('fix-kl-');
  git(dir, 'init', '-q');
  const now = new Date().toISOString();
  put(join(dir, '.claude-packs-lock'), toJson({ version: 2, holder: { session: 'old', pid: 4242 }, branch: 'b', started_at: now, last_seen: now }));
  const code = `import(${JSON.stringify(join(KIT, 'lib/kit-lock.mjs'))}).then(({ acquire }) => console.log(JSON.stringify(acquire(process.argv[1], 'new', { home: process.argv[1] }))));`;
  const out = spawnSync('node', ['-e', code, dir], { encoding: 'utf8', env: { ...process.env, CLAUDE_PID: '4242' } });
  assert.ok(parseJson<{ mine?: unknown }>(out.stdout)?.mine, out.stdout + out.stderr);
  assert.equal(readJson<{ holder: { session: string } }>(join(dir, '.claude-packs-lock'))?.holder.session, 'new');
});

test('new rules resolve to real paths and doctor passes', () => {
  const dir = scratchDir('cpm-');
  assert.match(run(dir, 'init', 'audio-core'), /OK:/);   // the install is the subject: the one `init` here
  assert.match(readFileSync(join(dir, '.claude/rules/skill-writing.md'), 'utf8'), /\.claude\/skills\/\*\*/);
  assert.match(readFileSync(join(dir, '.claude/rules/open-items-tagged.md'), 'utf8'), /bugs\.md/);
  assert.match(readFileSync(join(dir, '.claude/rules/one-formula-per-value.md'), 'utf8'), /src\/dsp\/\*\*/);
  assert.ok(existsSync(join(dir, '.claude/skills/trace-parameter/SKILL.md')));
});

test('doctor flags a skill whose description summarizes steps', () => {
  const dir = fixture('audio-core');
  const file = join(dir, '.claude/skills/measure-tone/SKILL.md');
  put(file, readFileSync(file, 'utf8').replace(/^description: Use/m, 'description: Renders tones and'));
  assert.match(cli(dir, 'doctor').stdout, /must start with "Use when/);
});

// Sub37's first install found four faults in the kit (its workflow-bugs.md WB-1 to WB-4; WB-4 is in hook-selftests.test.mts). Each has a test that was seen failing before the fix.
test('WB-1: coverage sees the kit\'s own skills and rules, never a worktree\'s copy', async () => {
  const dir = fixture('audio-core');
  put(join(dir, 'src/dsp/Svf.cpp'), '// svf\n');
  put(join(dir, '.claude/worktrees/agent-x/stray/Loose.cpp'), '// a worktree copy\n');
  const cov = await coverage(dir);
  assert.ok(!cov.deadRules.includes('skill-writing.md'), `dead: ${cov.deadRules}`);
  assert.ok(!cov.deadRules.includes('subagent-dispatch.md'), `dead: ${cov.deadRules}`);
  assert.ok(!cov.uncovered.some((f) => f.includes('worktrees')), `uncovered: ${cov.uncovered}`);
});

test('WB-3: doctor finds a token in any repo\'s .git/config and never prints it', () => {
  const dir = fixture('audio-core');
  try {
    git(dir, 'init', '-q');
    const doctor = () => cli(dir, 'doctor');
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
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// KWB-26: the kit is a project like any other. Its own .claude/ carries the base pack (every base hook judges work on the kit,
// kit-lock beside them), doctor --strict passes on it, a project's own node hook that is not written for the runner keeps its own
// settings entry (the kit's kit-lock was folded into run-hooks.mjs and failed there as exit 1, so it never refused), and no kit
// command, hook or doc deletes a branch.
interface SettingsFile { hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]>; permissions?: unknown }
const commandsOf = (settings: SettingsFile, event: string): string[] => (settings.hooks[event] ?? []).flatMap((g) => g.hooks).map((h) => h.command);

test('a project\'s own node hook with no hook(text) export keeps its own settings entry; one with it joins the runner', () => {
  const dir = scratchDir('cpk-');
  put(join(dir, '.claude/hooks/own-alone.mjs'), 'process.exit(0);\n');
  put(join(dir, '.claude/hooks/own-hook.mjs'), 'export const hook = () => 0;\n');
  const own = (n: string) => ({ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${n}"`, timeout: 10 });
  put(join(dir, '.claude/settings.json'), toJson({ hooks: { PreToolUse: [{ matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash', hooks: [own('own-alone.mjs'), own('own-hook.mjs')] }] } }));
  run(dir, 'init', 'base');   // the install and its updates are the subject: the second `init` here
  for (const pass of ['init', 'update', 'a second update']) {
    if (pass !== 'init') run(dir, 'update');
    const pre = commandsOf(readJson<SettingsFile>(join(dir, '.claude/settings.json')) ?? { hooks: {} }, 'PreToolUse');
    assert.ok(pre.includes('node "$CLAUDE_PROJECT_DIR/.claude/hooks/own-alone.mjs"'), `${pass}: own entry kept:\n${pre.join('\n')}`);
    assert.ok(pre.some((c) => c.includes('run-hooks.mjs') && c.includes('.claude/hooks/own-hook.mjs')), `${pass}: a hook written for the runner joins it, and an update keeps it:\n${pre.join('\n')}`);
    assert.ok(!pre.some((c) => c.includes('run-hooks.mjs') && c.includes('own-alone.mjs')), `${pass}: never folded into the runner`);
    assert.equal(pre.join('\n').match(/own-hook\.mjs/g)?.length, 1, `${pass}: once`);
  }
});

test('the kit repo has its own base pack installed: kit-lock and every base hook registered, git-guard on Bash and Stop', () => {
  const lock = readJson<{ packs: string[] }>(join(KIT, '.claude/claude-packs.lock.json'));
  assert.deepEqual(lock?.packs, ['base']);
  const settings = readJson<SettingsFile>(join(KIT, '.claude/settings.json'));
  assert.ok(settings, 'the kit has settings');
  const all = Object.values(settings.hooks).flat().flatMap((g) => g.hooks).map((h) => h.command).join('\n');
  const base = readJson<{ hooks: Record<string, { hooks: { command: string }[] }[]> }>(join(KIT, 'packs/base/pack.json'));
  for (const g of Object.values(base?.hooks ?? {}).flat()) {
    for (const h of g.hooks) {
      const name = /hooks\/([\w-]+\.mjs)/.exec(h.command)?.[1] ?? '';
      if (['build-sweep.mjs', 'idle-wake.mjs', 'user-asks.mjs'].includes(name)) continue; // opt-in
      assert.match(all, new RegExp(`\\.claude/hooks/${name.replace('.', '\\.')}`), name);
    }
  }
  assert.match(all, /kit-lock\.mjs/, 'kit-lock stays');
  assert.ok(commandsOf(settings, 'Stop').some((c) => c.includes('.claude/hooks/git-guard.mjs')), 'git-guard judges the end of a session');
  const layout = readJson<{ guards: { git: { house: boolean } }; folders: Record<string, { path: string }> }>(join(KIT, '.claude/layout.json'));
  assert.equal(layout?.guards.git.house, true, 'the house git laws hold on the kit');
  for (const f of ['bin', 'lib', 'packs', 'global', 'test', 'docs']) assert.ok(Object.values(layout?.folders ?? {}).some((x) => x.path === f), f);
  const r = spawnSync('node', [join(KIT, 'bin/claude-packs.mjs'), 'doctor', '--strict', '--dir', KIT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('no kit command, hook, skill or doc deletes a branch', () => {
  const files: string[] = [];
  const walk = (d: string): void => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (['node_modules', '.git', 'worktrees', '.claude-packs-backup'].includes(f)) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(mjs|mts|js|py|sh|md|json)$/.test(f)) files.push(p);
    }
  };
  for (const d of ['bin', 'lib', 'packs', 'global', 'scripts', '.claude']) walk(join(KIT, d));
  // a runnable delete: git branch -d/-D/--delete, git push --delete or a :refs push; the guards' own patterns and refusal
  // texts that name these forms to refuse them are not runs, so a line is read only where it looks like a command
  const RUN = /(^|[`'"\s;&|(])git\s+(?:-C\s+\S+\s+)?(branch\s+(?:\S+\s+)*(-d|-D|--delete)\b|push\s+(?:\S+\s+)*(--delete\b|:refs\/))/;
  const hits: string[] = [];
  for (const f of files) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (!RUN.test(line)) return;
      if (/selftest|mustBlock|NOT BLOCKED|\[\s*['"`]git (branch|push)|never deleted|is never|refuse|BLOCK/i.test(line)) return; // a guard's own case
      hits.push(`${relative(KIT, f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(hits, [], 'a branch is never deleted, duplicates included (KWB-26)');
});
