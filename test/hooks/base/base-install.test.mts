// What an install of base is and keeps, with no hook of its own (the tests of the old install-fixes, kit-guards, micro and sub37-wb that
// are about the install, its lock, doctor and the kit's own repo): the lock says which kit wrote it, the rules resolve to real paths,
// doctor reads the hooks and the skills, a project's own hook keeps its own settings entry, and the kit repo is a project like any
// other. The hooks' own refusals are in the file of each hook.
import { readdirSync } from 'node:fs';
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

// KWB-26: the kit is a project like any other (its own base pack and a project's own node hook: base-install-kit.test.mts); no kit
// command, hook or doc deletes a branch.
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
