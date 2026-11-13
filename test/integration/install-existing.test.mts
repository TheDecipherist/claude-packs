// An install onto what a project already has (split from install.test.mts so no file sums over a minute): audio-core alone, a moved folder
// re-pointing the rules, and an existing .claude and CLAUDE.md updated and never overwritten.
import { assert, existsSync, join, mkdirSync, readFileSync, readdirSync, run, test, writeFileSync } from '../kit-cli.mts';
import { parseJson } from '../../packs/base/hooks/lib/json.mts';
import type { Layout } from '../../packs/base/hooks/lib/types.d.mts';
import { fixture } from '../fixtures/installs.mts';
import { project, text } from './install-rig.mts';

interface Settings { model?: string; hooks: { Stop: { hooks: { command: string }[] }[] } }

test('audio-core alone installs without Stellix concepts', () => {
  const dir = project();
  const out = run(dir, 'init', 'audio-core');
  assert.match(out, /OK: base, audio-core/);
  assert.ok(!existsSync(join(dir, 'src', 'world')));
  const rule = text(dir, '.claude/rules/math-domain-guards.md');
  assert.match(rule, /src\/dsp\/\*\*/);
  assert.doesNotMatch(rule, /src\/world/);
});

test('moving a folder in layout.json re-points every rule', () => {
  const dir = fixture('audio-core+stellix');
  const layoutFile = join(dir, '.claude', 'layout.json');
  const layout = parseJson<Layout>(readFileSync(layoutFile, 'utf8'));
  assert.ok(layout?.folders.world);
  layout.folders.world.path = 'src/sim';
  writeFileSync(layoutFile, JSON.stringify(layout));
  run(dir, 'update');
  assert.match(text(dir, '.claude/rules/world-fp-determinism.md'), /src\/sim\/\*\*/);
});

test('an existing .claude and CLAUDE.md are updated, never overwritten', () => {
  const dir = project();
  mkdirSync(join(dir, '.claude', 'rules'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'rules', 'gpu-bloom.md'), '# my own bloom rule\n');
  writeFileSync(join(dir, '.claude', 'rules', 'my-law.md'), '# my law\n');
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ model: 'x', hooks: { Stop: [{ matcher: '', hooks: [{ type: 'command', command: 'echo mine' }] }] } }));
  writeFileSync(join(dir, 'CLAUDE.md'), '# Project\nKeep this.\n');
  writeFileSync(join(dir, '.gitignore'), 'build/');
  run(dir, 'init', 'audio-core', 'gpu-painter');
  run(dir, 'update');
  assert.equal(text(dir, '.claude/rules/gpu-bloom.md'), '# my own bloom rule\n');
  assert.ok(existsSync(join(dir, '.claude', 'rules', 'gpu-bloom.md.pack-new')));
  assert.equal(text(dir, '.claude/rules/my-law.md'), '# my law\n');
  const s = parseJson<Settings>(text(dir, '.claude/settings.json'));
  assert.ok(s);
  assert.equal(s.model, 'x');
  assert.equal(s.hooks.Stop[0]?.hooks[0]?.command, 'echo mine');
  const md = text(dir, 'CLAUDE.md');
  assert.match(md, /^# Project\nKeep this\./);
  assert.equal(md.match(/claude-packs:start/g)?.length, 1, 'one generated section after two runs');
  assert.match(text(dir, '.gitignore'), /^build\/\n\.claude\/\.claude-packs-backup\/\n\.claude\/state\/\n\.claude\/checks\.compiled\.json\n\.claude\/usage\.log\n\.claude\/hooks\.log\n\.claude\/logs\/\n\*\.pdf\n\*\.PDF\n$/);
  assert.ok(readdirSync(join(dir, '.claude', '.claude-packs-backup')).length >= 1);
});
