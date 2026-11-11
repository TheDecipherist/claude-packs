// W8.1: an `update` of a project whose settings.json has the older runner entries (one run-hooks command per matcher group, naming
// its hooks) leaves one runner entry per event and the table, and keeps the project's own hooks, the runner's own ones among them
// (KWB-26's plant: a project hook entry survives).
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../packs/base/hooks/lib/json.mts';
import { assert, join, put, run, test } from '../kit-cli.mts';

interface Settings { hooks: Record<string, { matcher?: string; hooks: { command: string; timeout?: number }[] }[]> }
const RUN = 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/run-hooks.mjs"';

test('update migrates the older runner entries to one per event and keeps the project\'s own hooks', () => {
  const dir = scratchDir('w8-migrate-');
  run(dir, 'init', 'base');
  put(join(dir, '.claude/hooks/own.mjs'), 'export const hook = () => 0;\n');
  const old = readJson<Settings>(join(dir, '.claude/settings.json'));
  assert.ok(old);
  const entry = (command: string, timeout = 10) => ({ type: 'command', command, timeout });
  old.hooks.PreToolUse = [
    { matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash', hooks: [entry(`${RUN} .claude/hooks/lesson-checks.mjs .claude/hooks/own.mjs`, 20)] },
    { matcher: 'Bash', hooks: [entry(`${RUN} .claude/hooks/git-guard.mjs`), entry('echo mine')] },
  ];
  put(join(dir, '.claude/settings.json'), toJson(old, { pretty: true }));
  run(dir, 'update');
  const now = readJson<Settings>(join(dir, '.claude/settings.json'));
  const pre = (now?.hooks.PreToolUse ?? []).flatMap((g) => g.hooks.map((h) => h.command));
  assert.equal(pre.filter((c) => c === RUN).length, 1, `one runner entry for PreToolUse:\n${pre.join('\n')}`);
  assert.ok(!pre.some((c) => c.includes('run-hooks.mjs') && / \.claude\/hooks\//.test(c)), 'no entry names its hooks any more');
  assert.ok(pre.includes('echo mine'), 'the project\'s own command stays');
  assert.ok(pre.includes('node "$CLAUDE_PROJECT_DIR/.claude/hooks/own.mjs"'), 'the project\'s own hook the old runner named stays, as its own entry');
  const table = readJson<{ hook: string }[]>(join(dir, '.claude/hooks/hooks.json')) ?? [];
  assert.ok(table.some((r) => r.hook === 'git-guard') && table.some((r) => r.hook === 'lesson-checks') && !table.some((r) => r.hook === 'own'));
  run(dir, 'update');
  assert.equal(toJson(readJson(join(dir, '.claude/settings.json'))), toJson(now), 'a second update changes nothing');
});
