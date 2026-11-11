// lib/status-cli.mts: the bar, and the report of a folder with no work orders.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { bar, statusCommand, statusReport } from '../../../lib/status-cli.mts';
import { readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('a bar is full cells then empty ones, to its width', () => {
  assert.equal(bar(0, 10), `[${'░'.repeat(10)}]`);
  assert.equal(bar(100, 10), `[${'█'.repeat(10)}]`);
  assert.equal(bar(50, 10), `[${'█'.repeat(5)}${'░'.repeat(5)}]`);
});

test('a project with no work orders says so, by its folder', () => {
  const dir = scratchDir('st-unit-');
  assert.deepEqual(statusReport({ dir, remotes: [] }), [`no work orders in ${dir}`]);
});

test('--json writes the report to --out, and a path it cannot write is said and fails (planted)', async () => {
  const dir = scratchDir('st-json-');
  const lines: string[] = [];
  const out = join(dir, 'report.json');
  assert.equal(await statusCommand(['--dir', dir, '--json', '--out', out], { log: (l) => lines.push(l) }), 0);
  assert.equal(JSON.parse(readText(out) ?? 'null').dir, dir);
  const bad = join(dir, 'report.json', 'x', 'y.json');
  assert.equal(await statusCommand(['--dir', dir, '--json', '--out', bad], { log: (l) => lines.push(l) }), 1);
  assert.match(lines.at(-1) ?? '', /could not write/);
});

test('--watch runs the report again after each wait, for as many ticks as asked', async () => {
  const dir = scratchDir('st-watch-');
  const waits: number[] = [];
  const lines: string[] = [];
  await statusCommand(['--dir', dir, '--watch', '2'], { log: (l) => lines.push(l), wait: async (ms) => { waits.push(ms); }, ticks: 3 });
  assert.deepEqual(waits, [120_000, 120_000]);
  assert.equal(lines.filter((l) => l.startsWith('--')).length, 3);
});
