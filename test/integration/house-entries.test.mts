// 0.6.0: the house skills and rules, and what a project that registered hooks by hand (or ran their Python forerunners) keeps.
import { OLD_ASKS } from '../../lib/settings.mts';
import { assert, existsSync, fresh, join, mkdirSync, readFileSync, rmSync, run, test, writeFileSync } from '../kit-cli.mts';
import { fixture, lockOf } from '../fixtures/installs.mts';
import { commandsOf, settingsOf } from './house-rig.mts';

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

test('a project\'s own hook entries stay; a kit hook already registered by hand is not doubled', () => {
  const dir = fresh('cph-');
  mkdirSync(join(dir, '.claude/hooks'), { recursive: true });
  writeFileSync(join(dir, '.claude/hooks/source-guard.py'), 'print(1)\n');
  const mine = (n: string): { type: string; command: string } => ({ type: 'command', command: `python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/${n}"` });
  writeFileSync(join(dir, '.claude/settings.json'), JSON.stringify({ hooks: { PreToolUse: [
    { matcher: 'Write|Edit|MultiEdit', hooks: [mine('source-guard.py')] }, { matcher: 'Bash', hooks: [mine('git-guard.py'), mine('build-guard.py'), mine('shell-traps.py')] },
    { matcher: 'Bash|Write|Edit|MultiEdit|NotebookEdit', hooks: [mine('copy-tree-guard.py')] },
  ], SessionStart: [{ hooks: [mine('gnu-shell.py')] }] } }));
  assert.match(run(dir, 'init', 'audio-core'), /retired settings entries .*copy-tree-guard\.py/);
  run(dir, 'update');
  const hooks = settingsOf(dir).hooks;
  const all = commandsOf(hooks);
  assert.equal(all.filter((c) => c.includes('source-guard.py')).length, 1, 'the project\'s own python hook is kept');
  const on = (event: string): string[] => (hooks[event] ?? []).flatMap((g) => g.hooks).map((h) => h.command);
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
  assert.match(all, /run-hooks\.mjs\\"[^"]* \.claude\/hooks\/git-guard\.mjs/, 'the Node hook runs (through run-hooks.mjs, KWB-24)');
  assert.doesNotMatch(all, /git-guard\.py|-asks\.py/);
});
