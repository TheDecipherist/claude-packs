// run-status.mts: one order's progress read from its own files (status.json, else progress lines), and the report over a project's orders.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { orderStatus, runsReport } from '../../../packs/base/hooks/lib/run-status.mts';

const NOW = Date.parse('2026-01-01T00:00:00Z');
// a folder with no git and no Claude home: nothing in it but what a test plants
const env = (home: string): Record<string, string> => ({ HOME: home, CLAUDE_CONFIG_DIR: join(home, '.claude'), PATH: process.env['PATH'] ?? '' });
const orderDir = (project: string): string => join(project, 'docs/workorders/x');

test('an order with a status.json takes its steps from it, clamping done to the items', () => {
  const project = scratchDir('run-status-');
  put(join(orderDir(project), 'status.json'), JSON.stringify({ steps: [{ id: 'W0', title: 'Set up', items: 4, done: 9 }, { id: 'W1', title: 'Next', items: 6, done: 2 }] }));
  const s = orderStatus(project, 'x', { env: env(project), nowMs: NOW });
  assert.equal(s.source, 'status.json');
  assert.deepEqual([s.items, s.done, s.percent, s.finished], [10, 6, 60, false]);
  assert.equal(s.steps[0]?.done, 4, 'done never passes the items');
});

test('without one, the steps come from workorder.md and the progress lines; a DONE file finishes the order', () => {
  const project = scratchDir('run-status-lines-');
  put(join(orderDir(project), 'workorder.md'), '## W0. Set up\n\n1. a\n2. b\n\n## W1. Next\n');
  put(join(orderDir(project), 'progress.md'), 'W0.1 ok\nW1 measured, done\n');
  const s = orderStatus(project, 'x', { env: env(project), nowMs: NOW });
  assert.equal(s.source, 'progress lines');
  assert.deepEqual(s.steps.map((x) => `${x.id}:${x.done}/${x.items}`), ['W0:1/3', 'W1:1/1']);
  put(join(orderDir(project), 'DONE'), 'done\n');
  assert.equal(orderStatus(project, 'x', { env: env(project), nowMs: NOW }).finished, true);
});

test('a status.json the lead has not kept (done 0) does not hide the items its progress lines record (W8.9, supernova2 read 0 % with W0.0 to W0.4 done)', () => {
  const project = scratchDir('run-status-lag-');
  put(join(orderDir(project), 'workorder.md'), '## W0. Set up\n\n1. a\n2. b\n3. c\n4. d\n\n## W1. Next\n\n1. x\n');
  put(join(orderDir(project), 'status.json'), JSON.stringify({ steps: [{ id: 'W0', title: 'Set up', items: 5, done: 0 }, { id: 'W1', title: 'Next', items: 2, done: 1 }] }));
  put(join(orderDir(project), 'progress.md'), '- 2026-11-13 W0.1: a\n- 2026-11-13 W0.2: b\n- 2026-11-13 W0.3: c\n');
  const s = orderStatus(project, 'x', { env: env(project), nowMs: NOW });
  assert.equal(s.source, 'status.json');
  assert.deepEqual(s.steps.map((x) => `${x.id}:${x.done}/${x.items}`), ['W0:3/5', 'W1:1/2'], 'the lines are ahead of the file for W0; the file is ahead for W1');
  assert.equal(s.percent, Math.round((1000 * 4) / 7) / 10);
});

test('a broken status.json is no file, never a crash', () => {
  const project = scratchDir('run-status-broken-');
  put(join(orderDir(project), 'status.json'), '{ half');
  const s = orderStatus(project, 'x', { env: env(project), nowMs: NOW });
  assert.equal(s.source, 'progress lines');
  assert.deepEqual(s.steps, []);
  assert.equal(s.percent, 0);
});

test('a report for one project lists its orders, says none when it has none, and asks no machine', () => {
  const project = scratchDir('run-status-report-');
  put(join(orderDir(project), 'status.json'), JSON.stringify({ steps: [{ id: 'W0', items: 2, done: 1 }] }));
  const report = runsReport({ env: env(project), platform: 'linux', dir: project, nowMs: NOW, remotes: [{ name: 'far', ssh: 'far' }], ask: () => { throw new Error('asked'); } });
  assert.deepEqual(report.runs.map((r) => [r.order, r.percent]), [['x', 50]]);
  assert.deepEqual(report.unreachable, []);
  assert.equal(report.updated, new Date(NOW).toISOString());
  assert.deepEqual(runsReport({ env: env(project), platform: 'linux', dir: scratchDir('run-status-empty-'), nowMs: NOW }).runs, []);
});
