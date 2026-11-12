// The conformance gate of the pack content (typescript order W7 (a), survey pack-content.md section 5). Three laws:
//   1. the hard set (R2 R3 R4 C1 C4 S1 S2 S5 P1 P2 P5 P6) holds for every file of every pack;
//   2. a file new or changed since the base (git merge-base HEAD origin/main, or PACK_CONTENT_BASE) passes the whole set;
//   3. every other check is a ratchet: test/fixtures/pack-content-ratchet.json holds how many files fail each, and a count may only fall.
// Each hard check is seen red on a plant: a scaffolded pack (lib/pack-template.mts) with one fault put in it.
import { existsSync } from 'node:fs';
import { appendFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join as path, relative } from 'node:path';
import { gitLines, gitRun } from '../packs/base/hooks/lib/git-run.mts';
import { scratchDir } from '../packs/base/hooks/lib/files.mts';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import { configsAt } from '../lib/configs.mts';
import { newPack } from '../lib/custom-packs.mts';
import { KIT, assert, test } from './kit-cli.mts';
import { HARD, conceptsOf, conformance, countsOf } from './pack-content-rig.mts';
import type { Finding } from './pack-content-rig.mts';

const PACKS = path(KIT, 'packs');
const RATCHET = path(KIT, 'test/fixtures/pack-content-ratchet.json');
const known = conceptsOf(PACKS, configsAt(KIT));
const found = conformance(PACKS, known);
const show = (list: readonly Finding[]): string[] => list.map((f) => `${f.id} packs/${f.file}: ${f.note}`);

/** The files of packs/ new or changed since the base, as repo paths; null when the base is not there (a shallow clone). */
function changedSince(base: string): Set<string> | null {
  const merge = gitRun(['merge-base', 'HEAD', base], { cwd: KIT, env: process.env });
  if (!merge.ok) return null;
  const point = merge.stdout.trim();
  const changed = gitLines(['diff', '--name-only', '--diff-filter=AMR', point, '--', 'packs'], { cwd: KIT, env: process.env });
  return new Set([...changed, ...gitLines(['ls-files', '--others', '--exclude-standard', '--', 'packs'], { cwd: KIT, env: process.env })]);
}

/** What a ratchet refuses: a count above its stored number, a check the file does not know, a hard check stored above 0. */
export function ratchetBreaks(stored: Readonly<Record<string, number>>, current: Readonly<Record<string, number>>): string[] {
  return [
    ...Object.entries(current).filter(([id, n]) => n > (stored[id] ?? 0)).map(([id, n]) => `${id}: ${n} files fail, the ratchet holds ${stored[id] ?? 0}`),
    ...Object.entries(stored).filter(([id, n]) => id !== '//' && !HARD.has(id) && n > (current[id] ?? 0)).map(([id, n]) => `${id}: the ratchet holds ${n} but ${current[id] ?? 0} files fail: lower it to ${current[id] ?? 0}`),
    ...Object.keys(stored).filter((id) => HARD.has(id)).map((id) => `${id} is a hard check: it has no ratchet`),
  ];
}

test('the hard set holds for every file of every pack', () => {
  assert.deepEqual(show(found.filter((f) => HARD.has(f.id))), []);
});

test('a file new or changed since the base passes the whole set', (t) => {
  const changed = changedSince(process.env.PACK_CONTENT_BASE ?? 'origin/main');
  if (changed === null) { t.skip('no base to compare with (origin/main is not fetched)'); return; }
  assert.deepEqual(show(found.filter((f) => changed.has(`packs/${f.file}`))), []);
});

test('the ratchet: no check fails in more files than it did, and the counts are what the file holds', () => {
  const stored = readJson<Record<string, number>>(RATCHET);
  assert.ok(stored !== null, 'test/fixtures/pack-content-ratchet.json is missing');
  assert.deepEqual(ratchetBreaks(stored, countsOf(found)), []);
});

test('the ratchet refuses a rise, a missing count and a hard check stored above 0 (the plant)', () => {
  assert.deepEqual(ratchetBreaks({ R1: 5 }, { R1: 5 }), []);
  assert.deepEqual(ratchetBreaks({ R1: 5 }, { R1: 4 }), ['R1: the ratchet holds 5 but 4 files fail: lower it to 4'], 'a count that fell must be lowered in the file (W10 review 4)');
  assert.deepEqual(ratchetBreaks({ R1: 5 }, {}), ['R1: the ratchet holds 5 but 0 files fail: lower it to 0'], 'a check no file fails any more');
  assert.deepEqual(ratchetBreaks({ R1: 5 }, { R1: 6 }), ['R1: 6 files fail, the ratchet holds 5']);
  assert.deepEqual(ratchetBreaks({}, { C2: 1 }), ['C2: 1 files fail, the ratchet holds 0']);
  assert.deepEqual(ratchetBreaks({ R2: 1 }, {}), ['R2 is a hard check: it has no ratchet']);
});

// ---- Each hard check seen red: a scaffolded pack passes the whole set, and with one fault planted it fails that check ----

const scaffold = (): { packs: string; pack: string } => {
  const dir = scratchDir('pack-content-');
  newPack(dir, 'plant', { repo: 'git@h:t/plant.git', hook: true, log: (): void => {}, env: { ...process.env, GIT_AUTHOR_NAME: 'a', GIT_AUTHOR_EMAIL: 'a@a', GIT_COMMITTER_NAME: 'a', GIT_COMMITTER_EMAIL: 'a@a' } });
  return { packs: path(dir, 'plant/packs'), pack: path(dir, 'plant/packs/plant') };
};
const idsOf = (packs: string): string[] => conformance(packs, conceptsOf(packs, configsAt(KIT))).map((f) => f.id);
const edit = (file: string, from: string | RegExp, to: string): void => {
  const text = readFileSync(file, 'utf8');
  assert.ok(text.replace(from, to) !== text, `the plant changes ${relative(KIT, file)}`);
  writeFileSync(file, text.replace(from, to));
};

const PLANTS: Record<string, (pack: string) => void> = {
  R2: (p) => edit(path(p, 'rules/plant-example.md'), /^# State the law.*$/m, `# ${'a title that runs past the limit '.repeat(5)}`),
  R3: (p) => edit(path(p, 'rules/plant-example.md'), '</constraints>', ''),
  R4: (p) => edit(path(p, 'rules/plant-example.md'), 'Never do:', 'Not these:'),
  C1: (p) => edit(path(p, 'checks/plant-example.json'), '"rule": ".claude/rules/plant-example.md"', '"rule": ".claude/rules/nowhere.md"'),
  C4: (p) => edit(path(p, 'checks/plant-example.json'), '"id": "plant-example"', '"id": "another-name"'),
  S1: (p) => edit(path(p, 'skills/plant-example/SKILL.md'), 'description: Use when', 'description: Use after'),
  S2: (p) => edit(path(p, 'skills/plant-example/SKILL.md'), 'name: plant-example', 'name: plant-other'),
  S5: (p) => appendFileSync(path(p, 'skills/plant-example/SKILL.md'), `\n${'A long line of words that makes the skill too large. '.repeat(170)}\n`),
  P1: (p) => edit(path(p, 'pack.json'), '"version": "0.1.0"', '"version": "one"'),
  P2: (p) => edit(path(p, 'pack.json'), '"directory": "packs/plant"', '"directory": "packs/elsewhere"'),
  P5: (p) => edit(path(p, 'rules/plant-example.md'), '# concepts: plant', '# concepts: nowhere-defined'),
  P6: (p) => edit(path(p, 'rules/plant-example.md'), '# concepts: plant', '# concepts: plant\n# hook: not-a-hook.mjs'),
};

test('a scaffolded pack, by new-pack with a hook, passes the whole set', () => {
  assert.deepEqual(idsOf(scaffold().packs), []);
});

for (const id of [...HARD]) {
  test(`${id} is red on its plant: the scaffolded pack with one fault fails ${id}`, () => {
    const { packs, pack } = scaffold();
    const plant = PLANTS[id];
    assert.ok(plant !== undefined, `${id} has a plant`);
    plant(pack);
    assert.ok(idsOf(packs).includes(id), `${id} is found`);
  });
}

test('the ratchet file holds no hard check and every stored count is a whole number', () => {
  const stored = readJson<Record<string, number>>(RATCHET) ?? {};
  assert.ok(existsSync(RATCHET));
  for (const [id, n] of Object.entries(stored).filter(([key]) => key !== '//')) assert.ok(Number.isInteger(n) && n >= 0 && !HARD.has(id), id);
});
