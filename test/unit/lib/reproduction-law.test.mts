// lib/reproduction-law.mts: a machine's rebuild is held to its firmware, mechanically (the user, 2026-11-22: "this needs to be
// ironclad in the harness"). Each case is one way supernova2_monitor went wrong: no declared kind, an engine step with no derivation
// skills and no oracle, and an engine of [ASSUMED] laws with no floor to hold them.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { checkWorkorder } from '../../../lib/workorder-check.mts';
import { DEBT_FILE, engineDebt, engineDebtProblems } from '../../../lib/reproduction-law.mts';

const FOLDERS = { audio: { path: 'src/audio' }, engines: { path: 'src/engines' }, dsp: { path: 'src/dsp' }, app: { path: 'src/app' } };
const ORDER = (body: string): string => `# Work order: x\n\n\`\`\`claude-packs\npacks: base\n\`\`\`\n\n${body}`;

function project(kind: string | null, body: string, packs: string[] = ['base', 'reverse-engineering']): string {
  const dir = scratchDir('repro-law-');
  const guards = kind === null ? {} : { instrument: { kind } };
  put(join(dir, '.claude/layout.json'), toJson({ folders: FOLDERS, guards }));
  put(join(dir, '.claude/claude-packs.lock.json'), toJson({ kit: '1', packs, files: {} }));
  put(join(dir, 'docs/workorders/x/workorder.md'), ORDER(body));
  return dir;
}

// the reproduction law's own refusals (a scratch project installs no skills, so the check's skill refusals are left out)
const refusals = async (dir: string): Promise<string[]> =>
  (await checkWorkorder(dir, 'x', { withDoctor: false })).refusals.filter((r) => /reproduction/.test(r));

const ENGINE_STEP = (skills: string, done: string): string =>
  `## W7. The voice\n\n**Skills:** ${skills}.\n\n1. The filter in \`src/dsp/\`.\n\n**Done when:** ${done}\n`;
const DERIVED = '`build-step`, `trace-the-builders`, `read-the-dsp-program`';

test('a reverse-engineering project that does not say reproduction or original is refused; one without the pack is not', async () => {
  assert.ok((await refusals(project(null, ENGINE_STEP(DERIVED, 'tests/a.test.cpp passes against the oracle, 0 differing blocks.'))))
    .some((r) => /does not say whether it is a reproduction/.test(r)));
  assert.deepEqual(await refusals(project(null, '## W1. a\n\n**Done when:** 2 pass.\n', ['base'])), []);
});

test('a reproduction\'s engine step needs both derivation skills and an oracle in its Done when, named each', async () => {
  const bare = await refusals(project('reproduction', ENGINE_STEP('`build-step`', 'pitch within 1 cent at 3 notes, tests/p.cpp.')));
  assert.ok(bare.some((r) => /W7\. The voice.*without `trace-the-builders` and `read-the-dsp-program`/.test(r)), bare.join('\n'));
  assert.ok(bare.some((r) => /W7\. The voice.*names no oracle/.test(r)), bare.join('\n'));
  const good = await refusals(project('reproduction', ENGINE_STEP(DERIVED, 'tests/v.cpp matches the oracle, 0 differing blocks.')));
  assert.deepEqual(good, []);
});

test('an original, and a reproduction\'s step that writes no engine code, are not held to the derivation law', async () => {
  assert.deepEqual(await refusals(project('original', ENGINE_STEP('`build-step`', 'pitch within 1 cent, tests/p.cpp.'))), []);
  const panel = '## W9. The panel\n\n**Skills:** `build-step`.\n\n1. The front in `src/app/`.\n\n**Done when:** 133 controls drawn.\n';
  assert.deepEqual(await refusals(project('reproduction', panel)), []);
});

test('a reproduction\'s engine debt: no floor written is a problem; over the floor is a problem; at or under it passes', () => {
  const dir = project('reproduction', '');
  put(join(dir, 'src/dsp/filter/Filter.h'), 'constexpr float k = 0.5f; // [ASSUMED]\nconstexpr float q = 2.f; // [EAR] fitted\n');
  put(join(dir, 'src/audio/Voice.cpp'), 'int n = 48; // [FW h8:0x1234]\n');
  assert.deepEqual(engineDebt(dir), { count: 2, files: 2 });
  assert.ok(engineDebtProblems(dir).some((p) => /holds 2 \[ASSUMED\] and \[EAR\] law\(s\) and docs\/engine-debt\.json sets no floor/.test(p)));
  put(join(dir, DEBT_FILE), '{ "floor": 1, "why": "x" }');
  assert.ok(engineDebtProblems(dir).some((p) => /over its floor of 1/.test(p)));
  put(join(dir, DEBT_FILE), '{ "floor": 2, "why": "x" }');
  assert.deepEqual(engineDebtProblems(dir), []);
});

test('an original\'s engine and a reproduction with no engine code yet owe no floor', () => {
  const original = project('original', '');
  put(join(original, 'src/dsp/a.h'), '// [ASSUMED]\n');
  assert.deepEqual(engineDebtProblems(original), []);
  assert.deepEqual(engineDebtProblems(project('reproduction', '')), []);
});
