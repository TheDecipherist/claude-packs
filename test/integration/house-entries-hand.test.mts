// 0.6.0: what a project that registered hooks by hand keeps (split from house-entries.test.mts so no file sums over a minute).
import { assert, fresh, join, mkdirSync, run, test, writeFileSync } from '../kit-cli.mts';
import { commandsOf, settingsOf } from './house-rig.mts';

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
