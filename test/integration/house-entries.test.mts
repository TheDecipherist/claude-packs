// 0.6.0: the house skills and rules, and what a project that registered hooks by hand (or ran their Python forerunners) keeps.
import { OLD_ASKS } from '../../lib/settings.mts';
// (A project's own hook entries: house-entries-hand.test.mts, split so no file sums over a minute.)
import { assert, existsSync, fresh, join, readFileSync, rmSync, run, test, writeFileSync } from '../kit-cli.mts';
import { fixture, lockOf } from '../fixtures/installs.mts';
import { runnerHooks, settingsOf } from './house-rig.mts';

test('the build-step and copy-and-prove skills install, triggered by "Use when", under 8,000 characters', () => {
  const dir = fixture('audio-core');
  for (const skill of ['build-step', 'copy-and-prove']) {
    const text = readFileSync(join(dir, '.claude/skills', skill, 'SKILL.md'), 'utf8');
    assert.match(text, /^description: Use when/m, skill);
    assert.ok(text.length < 8000, `${skill}: ${text.length}`);
    assert.doesNotMatch(text, /stellix/i, skill);
  }
  const base = fresh('cph-');
  run(base, 'init', 'gpu-painter');   // gpu-painter alone: the two skills split by pack is what is asked
  assert.ok(existsSync(join(base, '.claude/skills/build-step/SKILL.md')), 'build-step is base');
  assert.ok(!existsSync(join(base, '.claude/skills/copy-and-prove')), 'copy-and-prove is audio-core');
  for (const rule of ['hooks-and-gates', 'plan-and-logs']) {
    const text = readFileSync(join(dir, '.claude/rules', `${rule}.md`), 'utf8');
    assert.doesNotMatch(text, /placeholder|stellix/i, rule);
  }
  assert.match(readFileSync(join(dir, '.claude/rules/hooks-and-gates.md'), 'utf8'), /"\.claude\/hooks\/\*\*"/);
  assert.match(readFileSync(join(dir, '.claude/rules/plan-and-logs.md'), 'utf8'), /"build\.md"[\s\S]*"bugs\.md"/);
});

// A project that ran a Python forerunner by hand (Stellix: git-guard.py, user-asks.py in its settings) had that hook:
// update switches the Node hook on without an "enable" line, and retires the Python entry.
test('a Node hook is on in a project that ran its Python forerunner, and the forerunner\'s entry goes', () => {
  const dir = fixture('audio-core');
  const lf = join(dir, '.claude/claude-packs.lock.json');
  const l = lockOf(dir);
  for (const h of ['git-guard.mjs', 'user-asks.mjs', 'time-guard.mjs']) { delete l.files?.[`.claude/hooks/${h}`]; rmSync(join(dir, '.claude/hooks', h), { force: true }); }
  writeFileSync(lf, JSON.stringify(l));
  const sf = join(dir, '.claude/settings.json');
  const s = settingsOf(dir);
  for (const ev of Object.keys(s.hooks)) s.hooks[ev] = (s.hooks[ev] ?? []).map((g) => ({ ...g, hooks: g.hooks.filter((h) => !/git-guard|time-guard/.test(h.command)) }));
  s.hooks.PreToolUse?.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/git-guard.py"' }] });
  s.hooks.SessionStart = [{ matcher: 'compact', hooks: [{ type: 'command', command: `python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/${OLD_ASKS.replace('.mjs', '.py')}"` }] }];
  writeFileSync(sf, JSON.stringify(s));
  const out = run(dir, 'update');
  assert.ok(existsSync(join(dir, '.claude/hooks/git-guard.mjs')) && existsSync(join(dir, '.claude/hooks/user-asks.mjs')), 'had under the Python name');
  assert.ok(!existsSync(join(dir, '.claude/hooks/time-guard.mjs')), 'a hook it never had stays off');
  assert.match(out, /held back, not switched on .*hooks\/time-guard\.mjs/);
  assert.match(out, /retired settings entries .*git-guard\.py/);
  const all = readFileSync(sf, 'utf8');
  assert.ok(runnerHooks(dir).includes('git-guard'), 'the Node hook runs (a row of the runner\'s table, W8.1)');
  assert.doesNotMatch(all, /git-guard\.py|-asks\.py/);
});
