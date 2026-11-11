// 0.10.0 (STEP 3 item 3), on the per-version manifest (typescript order W5.4): synth-creator is everything the kit installed before
// configurations, unchanged for Stellix and Sub37. test/fixtures/noop/<project>/before/ is that project's own install state
// (layout.json, settings.json, the lock and CLAUDE.md, copied 2026-11-03), expected/ is what the 0.9.15 kit's `update` made of it.
// The kit's `update` of it must make the same settings, the same CLAUDE.md and layout.json ("configuration" its one new key), and
// the files and hashes of packs/manifest-<version>.json (scripts/counts.mts writes it). That file is the list of what changed on
// purpose: a change to an installed file shows in its diff, is read, and is kept; a change nobody listed is red here.
import { KIT, assert, join, readFileSync, test } from '../kit-cli.mts';
import { type Manifest, type ProjectInstall, type ProjectName, installOf, readManifest, updatedProject } from '../../scripts/counts.mts';
import { parseJson, toJson } from '../../packs/base/hooks/lib/json.mts';

const FX = join(KIT, 'test/fixtures/noop');
const expected = (project: string, file: string): string => readFileSync(join(FX, project, 'expected', file), 'utf8');
const before = (project: string, file: string): string => readFileSync(join(FX, project, 'before', file), 'utf8');
const manifest = (): Manifest => {
  const held = readManifest(KIT);
  if (held === null) throw new Error('packs/manifest-2.0.0.json is missing: run node scripts/counts.mts');
  return held;
};

/** What an install differs from the manifest in: files added, files gone, files changed (path, with a reason). */
export function drift(want: ProjectInstall, got: ProjectInstall): string[] {
  return [
    ...Object.keys(got.files).filter((f) => want.files[f] === undefined).map((f) => `${f}: not in the manifest`),
    ...Object.keys(want.files).filter((f) => got.files[f] === undefined).map((f) => `${f}: in the manifest, not installed`),
    ...Object.keys(got.files).filter((f) => want.files[f] !== undefined && want.files[f] !== got.files[f]).map((f) => `${f}: changed`),
    ...(toJson(want.packs) === toJson(got.packs) ? [] : ['the packs the lock names differ']),
  ];
}

for (const project of ['stellix', 'sub37'] as const) {
  test(`${project}: update in synth-creator makes what 0.9.15 made, but for the configuration key`, () => {
    const { dir } = updatedProject(KIT, project);
    assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), expected(project, 'settings.json'), 'settings.json');
    assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), expected(project, 'claude-md.txt'), 'CLAUDE.md');
    const layout = parseJson<Record<string, unknown> & { concepts: Record<string, unknown> }>(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
    assert.ok(layout !== null);
    assert.equal(layout.configuration, 'synth-creator');
    delete layout.configuration;
    delete layout.concepts.js;   // 0.11.0: base's js concept (raw globs, so a complete layout gains it), for the dispatch laws
    delete layout.concepts['public-text'];   // 0.15.0: the writing pack's concept, raw globs too
    delete layout.concepts['hook-files']; delete layout.concepts['hook-config'];   // 0.18.0: the hook-proof pack's
    delete layout.concepts['look-analysis'];   // 1.1.0: audio-core's, so straight-on-and-aligned loads where the analysis happens
    assert.equal(toJson(layout, { pretty: true }) + '\n', expected(project, 'layout.json'), 'layout.json, the key aside');
    const was = parseJson<ProjectInstall>(expected(project, 'lock.json'));
    const got = installOf(dir);
    assert.deepEqual(was?.packs, got.packs, 'the packs the lock names');
    assert.deepEqual(drift(manifest().projects[project], got), [], 'the files and hashes the manifest lists, no more, no fewer');
    const moved = 'analyse-reference-look/SKILL.md';   // 1.4.0 (admiral-fleet W4): moved from audio-core to base, installed at the same place
    assert.equal(readFileSync(join(dir, '.claude/skills', moved), 'utf8'), readFileSync(join(KIT, 'packs/base/skills', moved), 'utf8'), `${moved}: moved, not lost`);
  });
}

test('an install that names no configuration gets synth-creator from its packs, and the same result', () => {
  const { dir, out } = updatedProject(KIT, 'sub37', null);
  assert.match(out, /configuration: synth-creator \(from its packs: base, audio-core\)/);
  assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), expected('sub37', 'settings.json'));
});

// admiral-fleet W3 (KWB-97): full-stack's template moved under packages/ and gained a web folder. A project installed with the
// template before it (test/fixtures/noop/full-stack/before/: the kit at f747567, the web app in channel/, the API in api/src) keeps
// its own layout on update: no template folder or concept added, the same CLAUDE.md, the manifest's files.
test('full-stack: an update keeps an existing project\'s own layout, and changes only the listed files', () => {
  const { dir } = updatedProject(KIT, 'full-stack');
  const was = parseJson<{ folders: unknown; concepts: unknown }>(before('full-stack', 'layout.json'));
  const layout = parseJson<{ folders: unknown; concepts: unknown }>(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
  assert.deepEqual(layout?.folders, was?.folders, 'its folders, no more, no fewer');
  assert.deepEqual(layout?.concepts, was?.concepts, 'its concepts');
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), before('full-stack', 'claude-md.txt'), 'CLAUDE.md');
  assert.deepEqual(drift(manifest().projects['full-stack'], installOf(dir)), [], 'the files and hashes the manifest lists');
});

test('an installed file the manifest does not list, and one changed, are found (the plant)', () => {
  const held = manifest().projects.stellix;
  const [first = ''] = Object.keys(held.files);
  const planted: ProjectInstall = { packs: held.packs, files: { ...held.files, '.claude/hooks/unlisted.mjs': 'abc', [first]: 'changed' } };
  assert.deepEqual(drift(held, planted).sort(), [`${first}: changed`, '.claude/hooks/unlisted.mjs: not in the manifest'].sort());
  assert.deepEqual(drift(held, held), []);
  const names: ProjectName[] = ['stellix', 'sub37', 'full-stack'];
  assert.deepEqual(Object.keys(manifest().projects), names);
});
