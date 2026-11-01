// Identical containers by index, different things by ID (0.5.1; Stellix B-178: slot 2 hard-coded as special everywhere).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const project = () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-inst-'));
  mkdirSync(join(dir, '.git'));
  execFileSync('node', [CLI, 'init', 'audio-core', '--dir', dir], { encoding: 'utf8' });
  return dir;
};
const write = (dir, rel, content) =>
  spawnSync('node', [join(dir, '.claude/hooks/lesson-checks.mjs')], {
    input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8',
  });

test('the rule and both checks install with every project', () => {
  const dir = project();
  assert.ok(existsSync(join(dir, '.claude/rules/instances-by-index-identities-by-id.md')));
  assert.ok(existsSync(join(dir, '.claude/checks/no-instance-index-literal.json')));
  assert.ok(existsSync(join(dir, '.claude/checks/no-instance-id-literal.json')));
  const self = spawnSync('node', [join(dir, '.claude/hooks/lesson-checks.mjs'), '--selftest'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(self.status, 0, self.stdout + self.stderr);   // each check catches its bad example and passes its good one
});

test('an instance index compared with a number, or an instance array indexed by one, is refused in code', () => {
  const dir = project();
  for (const bad of ['if (slotIx == 1) startCrew();', 'if (slot != 2) return;', 'auto& v = voices[3];', 'if (0 == osc) return;', 'mix += layers[1].gain;'])
    assert.equal(write(dir, 'src/audio/Engine.cpp', `void f() { ${bad} }\n`).status, 2, bad);
});

test('not instances: buffer[1], channel == 1, pos[0], a loop to kSlots, a comment, all pass', () => {
  const dir = project();
  for (const good of ['float s = buffer[1];', 'if (channel == 1) s = 0;', 'float x = pos[0];', 'for (int slot = 0; slot < kSlots; slot++) run(slot);',
    'auto& v = voices[voice];', '// slot 2 was special once (B-178)', 'if (slots == kSlots) full = true;'])
    assert.equal(write(dir, 'src/audio/Engine.cpp', `void f() { ${good} }\n`).status, 0, good);
});

test('an instance ID written in a code string is refused; generated from the index, in a comment or in data, it passes', () => {
  const dir = project();
  assert.equal(write(dir, 'src/audio/Bank.cpp', 'void f() { set("slot2.reverb.mix", v); }\n').status, 2);
  assert.equal(write(dir, 'src/audio/Bank.cpp', 'void f() { set("osc1_level", v); }\n').status, 2);
  assert.equal(write(dir, 'src/audio/Bank.cpp', 'void f() { set(slotId(slot, "reverb.mix"), v); } // "slot2.reverb.mix" is slotId(1, ...)\n').status, 0);
  mkdirSync(join(dir, 'data'), { recursive: true });
  assert.equal(write(dir, 'data/bank.json', '{ "slot2.reverb.mix": 0.3 }\n').status, 0);
});

test('a brief never names a fixed instance: the subagent rule says so', () => {
  const dir = project();
  const rule = readFileSync(join(dir, '.claude/rules/subagent-dispatch.md'), 'utf8');
  assert.match(rule, /never name a fixed instance/i);
});
