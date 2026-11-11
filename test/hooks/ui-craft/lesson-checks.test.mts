// The ui-craft pack's checks (0.17.0, 0.22.0), fired through the base lesson-checks hook in a UI install: each holds to its bad and
// good example. A check blocks only what is objective or what the sources agree on (packs/ui-craft/SOURCES.md); taste stays a rule.
// The pack's presets, gates, skills and the page-measure tool: ui-craft-pack.test.mts.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { KIT, holdToExamples } from '../../kit-cli.mts';
import type { CheckExamples } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { uiChecks } from './checks.mts';

const fileFor = (c: CheckExamples): string => ('concepts' in c && Array.isArray(c.concepts) && c.concepts.includes('ui-styles') && !c.bad.includes('<') ? 'src/app.css' : 'src/ui/Thing.tsx');

test('each check refuses its bad example and passes its good one through the hook, in a real install', () => {
  holdToExamples(fixture('next-app'), uiChecks(), fileFor);
});

test('every ui-craft check holds to its examples through the hook; every skill fits', () => {
  const dir = fixture('next-app');
  const all = uiChecks();
  assert.ok(all.length >= 24);
  holdToExamples(dir, all, fileFor);
  for (const s of readdirSync(join(KIT, 'packs/ui-craft/skills'))) {
    const text = readFileSync(join(KIT, 'packs/ui-craft/skills', s, 'SKILL.md'), 'utf8');
    assert.match(text, /^---\nname: [\w-]+\ndescription: Use when /, s);
    assert.ok(text.length < 8000, s);
  }
  assert.ok(readFileSync(join(dir, '.claude/tools/page-measure.mjs'), 'utf8').length > 0);
});
