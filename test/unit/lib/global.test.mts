// lib/global.mts: the three pieces `global add` puts in ~/.claude, in a scratch home (test/global.test.mjs runs the command).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { FILES, globalAdd, globalDoctor, globalRemove } from '../../../lib/global.mts';

const quiet = (): { log: (l: string) => void; said: string[] } => { const said: string[] = []; return { said, log: (l) => said.push(l) }; };

test('FILES installs the shell readers the global hooks read through, and every source exists', () => {
  for (const f of ['shell-writes', 'program-writes', 'program-read', 'command-prefix', 'shell-lex', 'files', 'json', 'shell-sed']) {
    assert.ok(FILES.some(([from, to]) => from === `../packs/base/hooks/lib/${f}.mjs` && to === `hooks/claude-packs/lib/${f}.mjs`), f);
  }
  // the global hooks' own helpers (W4): what they share, installed beside each hook that reads it
  for (const [from, to] of [['hooks/lib/global-hook.mjs', 'hooks/claude-packs/lib/global-hook.mjs'], ['hooks/lib/global-hook.mjs', 'hooks/lib/global-hook.mjs'],
    ['hooks/lib/manifest-pins.mjs', 'hooks/claude-packs/lib/manifest-pins.mjs'], ['hooks/lib/command-pins.mjs', 'hooks/claude-packs/lib/command-pins.mjs']]) {
    assert.ok(FILES.some(([f, t]) => f === from && t === to), `${from} to ${to}`);
  }
  assert.equal(FILES.length, 16);
});

test('add wires each hook once, keeps the user\'s settings and edited file, and remove undoes only ours', () => {
  const home = scratchDir('global-');
  const { log } = quiet();
  put(join(home, '.claude/skills/latest-versions/SKILL.md'), '# mine\n');
  put(join(home, '.claude/settings.json'), JSON.stringify({ model: 'opus', hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mine.sh' }] }] } }));
  assert.equal(globalAdd({ home, log }), 0);
  assert.equal(globalAdd({ home, log }), 0);
  assert.equal(readFileSync(join(home, '.claude/skills/latest-versions/SKILL.md'), 'utf8'), '# mine\n');
  assert.ok(existsSync(join(home, '.claude/skills/latest-versions/SKILL.md.pack-new')));
  const settings = readJson<{ model: string; hooks: Record<string, { hooks: { command: string }[] }[]> }>(join(home, '.claude/settings.json'));
  assert.equal(settings?.model, 'opus');
  const commands = Object.values(settings?.hooks ?? {}).flatMap((groups) => groups.flatMap((g) => g.hooks.map((h) => h.command)));
  assert.equal(commands.filter((c) => c.includes('shell-traps.mjs')).length, 1);
  assert.equal(commands.filter((c) => c.includes('mine.sh')).length, 1);
  assert.equal(globalDoctor({ home, log, env: { PATH: process.env.PATH } }), 0);
  assert.equal(globalRemove({ home, log }), 0);
  const after = readJson<{ hooks: Record<string, unknown> }>(join(home, '.claude/settings.json'));
  assert.deepEqual(after?.hooks, { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mine.sh' }] }] });
  assert.ok(!existsSync(join(home, '.claude/hooks/claude-packs/version-pin-guard.mjs')));
});

test('a settings.json that is not JSON stops the command before anything is written; doctor names a missing file', () => {
  const home = scratchDir('global-');
  put(join(home, '.claude/settings.json'), '{ nope');
  assert.throws(() => globalAdd({ home, log: () => undefined }), /is not valid JSON/);
  assert.ok(!existsSync(join(home, '.claude/skills')));
  put(join(home, '.claude/settings.json'), '{}');
  const { log, said } = quiet();
  assert.equal(globalDoctor({ home, log, env: {} }), 1);
  assert.ok(said.some((l) => l === '- missing skills/latest-versions/SKILL.md'));
});
