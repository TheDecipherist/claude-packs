// KWB-26: the kit is a project like any other. Its own .claude/ carries the base pack (every base hook judges work on the
// kit, kit-lock beside them), doctor --strict passes on it, a project's own node hook that is not written for the runner
// keeps its own settings entry (the kit's kit-lock was folded into run-hooks.mjs and failed there as exit 1, so it never
// refused), and no kit command, hook or doc deletes a branch.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(KIT, 'bin/claude-packs.mjs');
const commands = (settings, event) => (settings.hooks[event] ?? []).flatMap((g) => g.hooks).map((h) => h.command);

test('a project\'s own node hook with no hook(text) export keeps its own settings entry; one with it joins the runner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cpk-'));
  mkdirSync(join(dir, '.claude/hooks'), { recursive: true });
  writeFileSync(join(dir, '.claude/hooks/own-alone.mjs'), 'process.exit(0);\n');
  writeFileSync(join(dir, '.claude/hooks/own-hook.mjs'), 'export const hook = () => 0;\n');
  const own = (n) => ({ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${n}"`, timeout: 10 });
  writeFileSync(join(dir, '.claude/settings.json'), JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash', hooks: [own('own-alone.mjs'), own('own-hook.mjs')] }] } }));
  execFileSync('node', [CLI, 'init', 'base', '--dir', dir], { encoding: 'utf8' });
  for (const pass of ['init', 'update', 'a second update']) {
    if (pass !== 'init') execFileSync('node', [CLI, 'update', '--dir', dir], { encoding: 'utf8' });
    const pre = commands(JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')), 'PreToolUse');
    assert.ok(pre.includes('node "$CLAUDE_PROJECT_DIR/.claude/hooks/own-alone.mjs"'), `${pass}: own entry kept:\n${pre.join('\n')}`);
    assert.ok(pre.some((c) => c.includes('run-hooks.mjs') && c.includes('.claude/hooks/own-hook.mjs')), `${pass}: a hook written for the runner joins it, and an update keeps it:\n${pre.join('\n')}`);
    assert.ok(!pre.some((c) => c.includes('run-hooks.mjs') && c.includes('own-alone.mjs')), `${pass}: never folded into the runner`);
    assert.equal(pre.join('\n').match(/own-hook\.mjs/g).length, 1, `${pass}: once`);
  }
});

test('the kit repo has its own base pack installed: kit-lock and every base hook registered, git-guard on Bash and Stop', () => {
  const lock = JSON.parse(readFileSync(join(KIT, '.claude/claude-packs.lock.json'), 'utf8'));
  assert.deepEqual(lock.packs, ['base']);
  const settings = JSON.parse(readFileSync(join(KIT, '.claude/settings.json'), 'utf8'));
  const all = Object.values(settings.hooks).flat().flatMap((g) => g.hooks).map((h) => h.command).join('\n');
  for (const g of Object.values(JSON.parse(readFileSync(join(KIT, 'packs/base/pack.json'), 'utf8')).hooks).flat()) {
    for (const h of g.hooks) {
      const name = h.command.match(/hooks\/([\w-]+\.mjs)/)[1];
      if (['build-sweep.mjs', 'idle-wake.mjs', 'user-asks.mjs'].includes(name)) continue; // opt-in
      assert.match(all, new RegExp(`\\.claude/hooks/${name.replace('.', '\\.')}`), name);
    }
  }
  assert.match(all, /kit-lock\.mjs/, 'kit-lock stays');
  assert.ok(commands(settings, 'Stop').some((c) => c.includes('.claude/hooks/git-guard.mjs')), 'git-guard judges the end of a session');
  const layout = JSON.parse(readFileSync(join(KIT, '.claude/layout.json'), 'utf8'));
  assert.equal(layout.guards.git.house, true, 'the house git laws hold on the kit');
  for (const f of ['bin', 'lib', 'packs', 'global', 'test', 'docs']) assert.ok(Object.values(layout.folders).some((x) => x.path === f), f);
  const r = spawnSync('node', [CLI, 'doctor', '--strict', '--dir', KIT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('no kit command, hook, skill or doc deletes a branch', () => {
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (['node_modules', '.git', 'worktrees', '.claude-packs-backup'].includes(f)) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(mjs|js|py|sh|md|json)$/.test(f)) files.push(p);
    }
  };
  for (const d of ['bin', 'lib', 'packs', 'global', 'scripts', '.claude']) walk(join(KIT, d));
  // a runnable delete: git branch -d/-D/--delete, git push --delete or a :refs push; the guards' own patterns and refusal
  // texts that name these forms to refuse them are not runs, so a line is read only where it looks like a command
  const RUN = /(^|[`'"\s;&|(])git\s+(?:-C\s+\S+\s+)?(branch\s+(?:\S+\s+)*(-d|-D|--delete)\b|push\s+(?:\S+\s+)*(--delete\b|:refs\/))/;
  const hits = [];
  for (const f of files) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (!RUN.test(line)) return;
      if (/selftest|mustBlock|NOT BLOCKED|\[\s*['"`]git (branch|push)|never deleted|is never|refuse|BLOCK/i.test(line)) return; // a guard's own case
      hits.push(`${relative(KIT, f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(hits, [], 'a branch is never deleted, duplicates included (KWB-26)');
});
