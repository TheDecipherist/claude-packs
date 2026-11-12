// End-to-end tests of the CLI against throwaway projects. (The edited rule and the existing .claude: install-update.test.mts and
// install-existing.test.mts, split so no file sums over a minute.)
import { assert, cli, existsSync, hookStatus, join, mkdirSync, profile, readdirSync, registeredHooks, run, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { project, text } from './install-rig.mts';

const writeTool = (dir: string, p: string): number | null => hookStatus(dir, 'folder-law.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, p), content: 'x' } });

test('full Stellix install: nested GPU skills, CLAUDE.md block, hooks', () => {
  const dir = project();
  writeFileSync(join(dir, 'CLAUDE.md'), '# Stellix\nMy own intro.\n');
  run(dir, 'init', 'audio-core', 'gpu-painter', 'stellix');
  assert.ok(existsSync(join(dir, 'src', 'painter', '.claude', 'skills', 'gpu-frame-bench', 'SKILL.md')));
  assert.ok(!existsSync(join(dir, '.claude', 'skills', 'gpu-frame-bench')));
  const md = text(dir, 'CLAUDE.md');
  assert.match(md, /^# Stellix\nMy own intro\./);
  assert.match(md, /`src\/world\/`/);
  const registered = registeredHooks(dir);
  for (const h of ['lesson-checks', 'folder-law', 'realtime-guard', 'no-shipped-images', 'param-id-lock']) assert.ok(registered.includes(h), h);
});

test('folder law refuses new source files outside the layout', () => {
  const dir = fixture('audio-core');
  assert.equal(writeTool(dir, 'src/Loose.cpp'), 2);
  assert.equal(writeTool(dir, 'Other/Thing.h'), 2);
  assert.equal(writeTool(dir, 'src/dsp/Svf.cpp'), 0);
  assert.equal(writeTool(dir, 'docs/notes.md'), 0);
});

test('removing a pack removes its rules and hooks', () => {
  const dir = fixture('audio-core+stellix');
  run(dir, 'remove', 'stellix');
  const rules = readdirSync(join(dir, '.claude', 'rules'));
  assert.ok(!rules.includes('world-fp-determinism.md'));
  assert.doesNotMatch(text(dir, '.claude/settings.json'), /no-shipped-images/);
});

test('a malformed settings.json stops the install before anything changes', () => {
  const dir = project();
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'settings.json'), '{ broken');
  writeFileSync(join(dir, 'CLAUDE.md'), 'mine\n');
  const r = cli(dir, 'init', 'audio-core');
  assert.equal(r.status, 2);
  assert.equal(text(dir, 'CLAUDE.md'), 'mine\n');
  assert.ok(!existsSync(join(dir, '.claude', 'rules')));
});

test('the Stellix profile installs onto the real lib/ layout without touching house files', () => {
  const dir = project();
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src', '.claude/rules']) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, '.claude', 'rules', 'world.md'), '# house world rule\n');
  run(dir, 'init', 'audio-core', 'gpu-painter', 'stellix', '--profile', profile('stellix'));
  assert.ok(!existsSync(join(dir, 'src')), 'no default src/ folder in a complete layout');
  assert.equal(text(dir, '.claude/rules/world.md'), '# house world rule\n');
  assert.match(text(dir, '.claude/rules/world-fp-determinism.md'), /"lib\/world\/\*\*"/);
  assert.ok(existsSync(join(dir, 'lib', 'painter', '.claude', 'skills', 'gpu-capture', 'SKILL.md')));
  assert.ok(!existsSync(join(dir, '.claude', 'checks', 'one-seeded-random.json')), 'disabled in favour of the house gate');
  assert.doesNotMatch(text(dir, '.claude/settings.json'), /no-shipped-images/);
  assert.equal(hookStatus(dir, 'protect-vendor.mjs', { tool_name: 'Edit', tool_input: { file_path: join(dir, 'lib/engines/src/tabula/Voice.h') } }), 2);
});
