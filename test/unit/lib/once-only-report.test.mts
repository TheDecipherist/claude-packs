// lib/once-only-report.mts: what doctor prints for once-only, and `dup scan`.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { dupScan, onceOnlyDoctor, useJscpd } from '../../../lib/once-only-report.mts';
import type { DetectorEnv } from '../../../lib/once-only-report.mts';

const BODY = Array.from({ length: 12 }, (_, i) => `  total += values[${i}] * weights[${i}] + offsets[${i}];\n`).join('');
const fn = (name: string): string => `export function ${name}(values, weights, offsets) {\n  let total = 0;\n${BODY}  return total;\n}\n`;
const NO_DETECTOR: DetectorEnv = { PATH: '' };

test('useJscpd writes the found detector into the env it was given, never over one already named', () => {
  const dir = scratchDir('once-');
  put(join(dir, 'node_modules/.bin/jscpd'), '#!/bin/sh\n');
  const env: DetectorEnv = {};
  assert.equal(useJscpd(dir, env), join(dir, 'node_modules/.bin/jscpd'));
  assert.equal(env.CLAUDE_PACKS_JSCPD, join(dir, 'node_modules/.bin/jscpd'));
  const named: DetectorEnv = { CLAUDE_PACKS_JSCPD: join(dir, 'node_modules/.bin/jscpd') };
  assert.equal(useJscpd(scratchDir('once-'), named), named.CLAUDE_PACKS_JSCPD);
});

test('doctor says nothing of a project without once-only', () => {
  assert.deepEqual(onceOnlyDoctor(scratchDir('once-'), () => undefined, NO_DETECTOR), []);
});

test('with the kit\'s detector: dup scan lists both sides of a planted copy, and the count only goes down', () => {
  const dir = scratchDir('once-');
  put(join(dir, 'a.mjs'), fn('one'));
  put(join(dir, 'b.mjs'), fn('two'));
  const said: string[] = [];
  const env: DetectorEnv = { ...process.env };
  if (!useJscpd(dir, env)) { assert.equal(dupScan(dir, (l) => said.push(l), NO_DETECTOR), 2); return; }
  assert.equal(dupScan(dir, (l) => said.push(l), env), 0);
  assert.ok(said.some((l) => l.includes('same as b.mjs')) && said.some((l) => l.includes('same as a.mjs')));
  assert.match(said.at(-1) ?? '', /^1 duplicate\(s\) in 2 file\(s\)/);
  put(join(dir, '.claude/hooks/once-only.mjs'), '');
  assert.deepEqual(onceOnlyDoctor(dir, () => undefined, env), []);
  assert.equal(readJson<{ lowest: number }>(join(dir, '.claude/state/duplicates.json'))?.lowest, 1);
  put(join(dir, 'c.mjs'), fn('three'));
  const worse = onceOnlyDoctor(dir, () => undefined, env);
  assert.equal(worse.length, 1);
  assert.match(worse[0] ?? '', /duplicates went up from 1 to /);
});
