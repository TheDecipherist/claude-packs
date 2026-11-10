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
const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], arrays: ['kSlotNames'] } }, exclude: ['data/**'] };
const withShape = (dir) => { writeFileSync(join(dir, 'design/shape.json'), JSON.stringify(SHAPE)); return dir; };
const write = (dir, rel, content) =>
  spawnSync('node', [join(dir, '.claude/hooks/shape-law.mjs')], {
    input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8',
  });

// 0.9.0 (KWB-1): the engine-scoped checks no-instance-index-literal and no-instance-id-literal are retired; shape-law judges
// every folder against design/shape.json, so the world and UI code that let B-200 through are judged too.
test('the rule and shape-law install with every project; the engine-scoped instance checks are gone', () => {
  const dir = project();
  assert.ok(existsSync(join(dir, '.claude/rules/instances-by-index-identities-by-id.md')));
  assert.ok(existsSync(join(dir, '.claude/hooks/shape-law.mjs')));
  assert.ok(!existsSync(join(dir, '.claude/checks/no-instance-index-literal.json')));
  assert.ok(!existsSync(join(dir, '.claude/checks/no-instance-id-literal.json')));
  const self = spawnSync('node', [join(dir, '.claude/hooks/shape-law.mjs'), '--selftest'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(self.status, 0, self.stdout + self.stderr);
});

test('an instance index compared with a number, or an instance array indexed by one, is refused in code, in every folder', () => {
  const dir = withShape(project());
  for (const rel of ['src/audio/Engine.cpp', 'src/world/Space.cpp', 'src/ui/Panel.cpp'])
    for (const bad of ['if (slotIx == 1) startCrew();', 'if (slot != 2) return;', 'auto& v = slots[3];', 'if (0 == slot) return;', 'mix += kSlotNames[1].size();'])
      assert.equal(write(dir, rel, `void f() { ${bad} }\n`).status, 2, `${rel}: ${bad}`);
});

test('not instances: buffer[1], channel == 1, pos[0], a loop to kSlots, a seen-in comment, all pass', () => {
  const dir = withShape(project());
  for (const good of ['float s = buffer[1];', 'if (channel == 1) s = 0;', 'float x = pos[0];', 'for (int slot = 0; slot < kSlots; slot++) run(slot);',
    'auto& v = slots[slot];', '// seen in: slot 2 was special once (B-178)', 'if (slots == kSlots) full = true;'])
    assert.equal(write(dir, 'src/audio/Engine.cpp', good.startsWith('//') ? `${good}\nvoid f() {}\n` : `void f() { ${good} }\n`).status, 0, good);
  // a seen-in after code on the same line is no example: the code itself must be the loop or the generator
  assert.equal(write(dir, 'src/audio/Engine.cpp', 'void f() { if (slot == 2) g(); } // seen in: slot 2\n').status, 2);
});

test('an instance ID written in a code string is refused; generated from the index, on a seen-in line or in excluded data, it passes', () => {
  const dir = withShape(project());
  assert.equal(write(dir, 'src/audio/Bank.cpp', 'void f() { set("slot2.reverb.mix", v); }\n').status, 2);
  assert.equal(write(dir, 'src/audio/Bank.cpp', 'void f() { set(slotId(slot, "reverb.mix"), v); }\n// seen in: "slot2.reverb.mix" is slotId(1, ...)\n').status, 0);
  mkdirSync(join(dir, 'data'), { recursive: true });
  assert.equal(write(dir, 'data/bank.json', '{ "slot2.reverb.mix": 0.3 }\n').status, 0);
});

test('a brief never names a fixed instance: the subagent rule says so', () => {
  const dir = project();
  const rule = readFileSync(join(dir, '.claude/rules/subagent-dispatch.md'), 'utf8');
  assert.match(rule, /never name a fixed instance/i);
});

test('CLAUDE.md names claude-packs as the source of truth: a fix goes into the kit, and comes back with update', () => {
  const dir = project();
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /claude-packs .*is the source of truth for every rule, check, hook and skill/);
  assert.match(md, /is made in the kit, with its test, and comes here with `npx --no-install @thedecipherist\/claude-packs update`/);
});
