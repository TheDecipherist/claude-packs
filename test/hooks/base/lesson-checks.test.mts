// lesson-checks: a known bug is refused when it is brought back. The hook's contract (its selftest, its worktree case, the emitted
// verdict equal to the source's), then the refusals that sat in the old root test files. A pack's own checks are held in
// test/hooks/<pack>/lesson-checks.test.mts.
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { blankCode } from '../../../packs/base/hooks/lib/cpp-scan.mts';
import { parseJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { assert, lessonWrite, test } from '../../kit-cli.mts';
import { APVTS, fire, movedConceptCase } from '../../worktree-rig.mts';
import { enable, extraFixture, fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';
import type { Checkouts } from '../hook-rig.mts';

// The worktree's own check (the hook's data case), then the step that moves a concept in the worktree's layout.
async function worktree(checkouts: Checkouts): Promise<void> {
  await installedWorktreeCase(checkouts, 'lesson-checks.mjs');
  movedConceptCase(checkouts);
}

holdsTheContract({
  hook: 'lesson-checks.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'src/dsp/Filter.cpp'), APVTS), status: 2 }),
  worktree,
});

// The first rule this package came from: three branches on one value are a lookup. It lives in base, so every project gets it, and its
// check blocks the edit in C++ and in JS/TS.
const chainCpp = 'if (mode == Mode::saw) return a();\nelse if (mode == Mode::square) return b();\nelse if (mode == Mode::noise) return c();\n';
const chainTs = "if (action === 'create') return a(p);\nelse if (action === 'update') return b(p);\nelse if (action === 'delete') return d(p);\n";

test('every install gets the lookup rule and check, with real paths', () => {
  const dir = fixture('audio-core');
  const rule = readFileSync(join(dir, '.claude/rules/lookup-over-if-chains.md'), 'utf8');
  assert.match(rule, /src\/\*\*\/\*\.cpp/);
  assert.match(rule, /src\/\*\*\/\*\.\{[^}]*\bts\b/);   // base's js concept, scoped like cpp (0.11.0: src/, tests/, test/)
  assert.ok(existsSync(join(dir, '.claude/checks/lookup-over-if-chains.json')));
});

test('the check refuses a new if/else chain in C++ (a synth) and TS (a node project), and passes a switch or a lookup', () => {
  const synth = fixture('audio-core');
  assert.equal(lessonWrite(synth, 'src/dsp/Osc.cpp', chainCpp).status, 2);
  assert.equal(lessonWrite(synth, 'src/dsp/Osc.cpp', 'switch (mode) { case Mode::saw: return a(); case Mode::square: return b(); case Mode::noise: return c(); }\n').status, 0);
  const node = fixture('js-ts');
  assert.equal(lessonWrite(node, 'web/routes/items.ts', chainTs).status, 2);
  assert.match(lessonWrite(node, 'web/routes/items.ts', chainTs).stderr, /lookup-over-if-chains/);
  assert.equal(lessonWrite(node, 'web/routes/items.ts', 'const builders = { create: a, update: b, delete: d } satisfies Record<Action, Builder>;\n').status, 0);
  assert.equal(lessonWrite(node, 'web/node_modules/x/index.js', chainTs).status, 0);
});

// 0.27.0: published text is read by the writing laws, and left alone by the code laws, at the write and in a scan.
test('a date in an article is a fact: the check is opt-in, and even switched on leaves articles alone', () => {
  const dir = fixture('base');
  assert.ok(!existsSync(join(dir, '.claude/checks/no-time-or-date.json')), 'held back');
  assert.equal(lessonWrite(dir, 'README.md', 'I built this last year.\n').status, 0);
  enable(dir, 'checks/no-time-or-date.json');
  assert.equal(lessonWrite(dir, 'README.md', 'I built this last year.\n').status, 2);
  assert.equal(lessonWrite(dir, 'articles/zodiac.md', 'The letter arrived in August 1969.\n').status, 0);
});

test('the writing laws still read an article; the code laws do not', () => {
  const dir = extraFixture('shell-js-ts-node', ['shell', 'js-ts', '--config', 'node']);
  assert.equal(lessonWrite(dir, 'articles/guide/a.md', 'It is fast — really.\n').status, 2);
  assert.equal(lessonWrite(dir, 'articles/guide/run.sh', 'now=`date`\n').status, 0);
  assert.equal(lessonWrite(dir, 'tools/run.sh', '#!/usr/bin/env bash\nset -euo pipefail\nnow=`date`\n').status, 2);
});

test('lesson-checks refuses a known bug brought back by every route', () => {
  assert.deepEqual(unrefused(routeProject(), 'lesson-checks.mjs', 'src/dsp/Filter.cpp', '// filter\nPLACEHOLDER\n', APVTS.trimEnd()), []);
});

test('ifs in a row that each return on the same value are a chain too (the act-line renderer)', () => {
  const dir = fixture('js-ts');
  const rows = "if (row.kind === 'turn') return `<div class=\"act-line\">${turn(row)}</div>`;\n" +
    "if (row.kind === 'system') return `<div class=\"act-line\">${esc(row.note ?? row.tool)}</div>`;\n" +
    "if (row.kind === 'bash') return detailed(row, `<code>$ ${esc(row.command ?? '')}</code>${failed}`);\n";
  const r = lessonWrite(dir, 'src/ui/activity.ts', rows);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /lookup-over-if-chains/);
  assert.equal(lessonWrite(dir, 'src/ui/activity.ts', 'const RENDER = { turn: renderTurn, system: renderSystem, bash: renderBash } satisfies Record<RowKind, Render>;\nreturn RENDER[row.kind](row);\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/ui/two.ts', "if (row.kind === 'turn') return a(row);\nif (row.kind === 'system') return b(row);\n").status, 0);
});

test('a url inside a string is no comment, so what follows it is still read', () => {
  assert.match(blankCode("const u = 'http://x'; run();", true), /'http:\/\/x'; run\(\);/);
  assert.match(blankCode('const u = `https://x/${id}`; run();'), /run\(\);/);
  assert.doesNotMatch(blankCode('a(); // run();'), /run/);
});
