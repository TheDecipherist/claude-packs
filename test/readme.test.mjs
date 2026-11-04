// The README is the kit's front page, and it had fallen a long way behind. It now cannot: every pack with its true counts, every configuration, preset
// and command, and every hook base installs, or this test fails.
import { CLI, KIT, assert, join, readdirSync, readFileSync, spawnSync, test } from './kit-cli.mjs';
import { PRESETS } from '../lib/packs.mjs';

const README = readFileSync(join(KIT, 'README.md'), 'utf8');
const countIn = (pack, kind) => { try { return readdirSync(join(KIT, 'packs', pack, kind)).filter((f) => !f.startsWith('.')).length; } catch { return 0; } };
const manifest = (pack) => JSON.parse(readFileSync(join(KIT, 'packs', pack, 'pack.json'), 'utf8'));
const hooksOf = (pack) => new Set(Object.values(manifest(pack).hooks ?? {}).flat().flatMap((g) => g.hooks.map((h) => h.command)));

test('every pack has its row, with its true counts', () => {
  for (const pack of readdirSync(join(KIT, 'packs'))) {
    const row = README.split('\n').find((l) => l.startsWith(`| \`${pack}\` |`));
    assert.ok(row, `${pack} has no row`);
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean).slice(-4).map(Number);
    assert.deepEqual(cells, [countIn(pack, 'rules'), countIn(pack, 'checks'), hooksOf(pack).size, countIn(pack, 'skills')], pack);
  }
});

test('every configuration and preset is named', () => {
  for (const c of readdirSync(join(KIT, 'configurations'))) assert.match(README, new RegExp(`^\\| \`${c}\` \\|`, 'm'), c);
  for (const [name, packs] of Object.entries(PRESETS)) {
    const row = README.split('\n').find((l) => l.startsWith(`| \`${name}\` |`));
    assert.ok(row, name);
    for (const p of packs) assert.ok(row.includes(`\`${p}\``), `${name}: ${p}`);
  }
});

test('every command in the help is on the page', () => {
  const r = spawnSync('node', [CLI], { encoding: 'utf8' });
  const help = r.stdout + r.stderr;
  assert.match(help, /usage:/);
  for (const [, command] of help.matchAll(/^ {2}([a-z][a-z-]+)\b/gm)) assert.ok(README.includes(`\`${command}`), command);
});

test('every hook base installs is in the table', () => {
  for (const c of hooksOf('base')) {
    const name = c.match(/hooks\/([\w-]+)\.mjs/)[1];
    assert.match(README, new RegExp(`^\\| \`${name}\` \\|`, 'm'), name);
  }
});
