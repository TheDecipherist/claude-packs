// 0.10.0 (Tim, STEP 3 item 3): synth-creator is everything the kit installed before configurations, unchanged for Stellix and
// Sub37. test/fixtures/noop/<project>/before/ is that project's own install state (layout.json, settings.json, the lock and
// CLAUDE.md, copied 2026-11-03), expected/ is what the 0.9.15 kit's `update` made of it. The 0.10.0 update, in the
// synth-creator configuration, must make the same: the same settings, the same CLAUDE.md, the same files in the lock, and
// layout.json with "configuration" its one new key. Files whose content changed on purpose are listed below, each with why.
import { KIT, assert, cli, copyFileSync, execFileSync, fresh, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';

// base files changed on purpose, what they do for a synth unchanged: their synth examples made neutral (item 2: base names no
// synth word); lib/writes.mjs gains judgeEvent, the one guard frame the new hooks and folder-law share (once-only); placement-law
// reads a kind's own "extensions" (KWB-36) and folder-law a layout's "sourceFiles" (KWB-37), both absent in a synth layout
const FX = join(KIT, 'test/fixtures/noop');
export const CHANGED = ['brief-guard.mjs', 'file-size-guard.mjs', 'folder-law.mjs', 'git-guard.mjs', 'making.mjs', 'once-only.mjs', 'placement-law.mjs',
  'shape-law.mjs', 'lib/dup-index.mjs', 'lib/dup.mjs', 'lib/making-check-selftest.mjs', 'lib/project.mjs', 'lib/shape.mjs', 'lib/writes.mjs']
  .map((f) => `.claude/hooks/${f}`).concat(['.claude/rules/instances-by-index-identities-by-id.md', '.claude/skills/prove-instances-identical/SKILL.md',
    '.claude/tools/shape-symmetry.mjs', '.claude/tools/shape-symmetry-selftest.mjs']);

function updated(project, named = true) {
  const dir = fresh(`noop-${project}-`);
  mkdirSync(join(dir, '.claude'));
  const b = (f) => join(FX, project, 'before', f);
  const layout = JSON.parse(readFileSync(b('layout.json'), 'utf8'));
  if (named) layout.configuration = 'synth-creator';
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(layout, null, 2));
  copyFileSync(b('settings.json'), join(dir, '.claude/settings.json'));
  copyFileSync(b('lock.json'), join(dir, '.claude/claude-packs.lock.json'));
  copyFileSync(b('claude-md.txt'), join(dir, 'CLAUDE.md'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  const out = cli(dir, 'update').stdout;   // doctor's verdict is the copy's (no design/shape.json, Stellix's own hooks' tools): not judged here
  return { dir, out };
}

const HOVER = ['.claude/rules/hover-every-pressable.md', 'lib/painter/.claude/skills/hover-state/SKILL.md'];
const expected = (project, f) => readFileSync(join(FX, project, 'expected', f), 'utf8');

for (const project of ['stellix', 'sub37']) {
  test(`${project}: update in synth-creator makes what 0.9.15 made, but for the configuration key`, () => {
    const { dir } = updated(project);
    assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), expected(project, 'settings.json'), 'settings.json');
    assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), expected(project, 'claude-md.txt'), 'CLAUDE.md');
    const layout = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
    assert.equal(layout.configuration, 'synth-creator');
    delete layout.configuration;
    assert.equal(`${JSON.stringify(layout, null, 2)}\n`, expected(project, 'layout.json'), 'layout.json, the key aside');
    const lock = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
    const was = JSON.parse(expected(project, 'lock.json'));
    assert.deepEqual(lock.packs, was.packs, 'the packs the lock names');
    const added = lock.packs.includes('gpu-painter') ? HOVER : [];   // 0.10.1: the hover law's rule and skill, new to a project that has gpu-painter
    assert.deepEqual(Object.keys(lock.files).sort(), [...Object.keys(was.files), ...added].sort(), 'the same files, no more, no fewer');
    const changed = Object.keys(was.files).filter((f) => lock.files[f] !== was.files[f]).sort();
    assert.deepEqual(changed.filter((f) => !CHANGED.includes(f)), [], 'only the base files changed on purpose differ in content');
  });
}

test('an install that names no configuration gets synth-creator from its packs, and the same result', () => {
  const { dir, out } = updated('sub37', false);
  assert.match(out, /configuration: synth-creator \(from its packs: base, audio-core\)/);
  assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), expected('sub37', 'settings.json'));
});
