// 0.7.1: the frame bench reads Dawn timestamps (the painter is WebGPU); no OpenGL wording is left in the gpu-painter pack's skills.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const skills = fileURLToPath(new URL('../packs/gpu-painter/skills/', import.meta.url));
test('gpu-painter skills name Dawn timestamps, never GL timer queries', () => {
  for (const s of readdirSync(skills)) {
    const text = readFileSync(join(skills, s, 'SKILL.md'), 'utf8');
    assert.doesNotMatch(text, /GL timer quer/i, s);
  }
  assert.match(readFileSync(join(skills, 'gpu-frame-bench', 'SKILL.md'), 'utf8'), /Dawn timestamp queries/);
});
