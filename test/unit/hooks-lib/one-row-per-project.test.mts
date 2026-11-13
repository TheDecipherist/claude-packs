// W8.9 item 1: the status line draws one row per project, never one per agent: its progress, the lead's step, its agent count, and the work of
// the lead and its agents summed. (The order names test/statusline/; the kit's hook-lib tests live here.)
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { writeJson } from '../../../packs/base/hooks/lib/json.mts';
import { projectLines } from '../../../packs/base/hooks/lib/run-projects.mts';
import type { AgentStatus, OrderStatus } from '../../../packs/base/hooks/lib/run-rows.mts';
import { runsSegments } from '../../../packs/base/tools/statusline-runs.mts';

const NOW = Date.parse('2026-01-01T00:00:00Z');
const work = (procs: number, cores: number, memMb: number): { procs: number; cores: number; memMb: number; queued: boolean } => ({ procs, cores, memMb, queued: false });
const agent = (name: string, w: ReturnType<typeof work>): AgentStatus =>
  ({ name, step: 'W1', title: 'The import', now: '', state: null, updated: null, percent: 50, beat: null, path: `/p/${name}`, stale: false, fresh: false, work: w });
const order = (project: string, over: Partial<OrderStatus> = {}): OrderStatus => ({ project, order: 'o', steps: [{ id: 'W1', title: 'The import', items: 10, done: 4, agent: null }],
  agents: [], items: 10, done: 4, percent: 40, source: 'status.json', finished: false, lead: null, leadWork: null, ...over });

const SHOP = order('/home/u/shop', { leadWork: work(2, 0.5, 100), agents: [agent('a', work(3, 1, 200)), agent('b', work(4, 1.5, 300)), agent('c', work(1, 0.25, 50)), agent('d', work(0, 0, 0))] });
const IDLE = order('/home/u/idle', { items: 86, done: 40, percent: 46.5, steps: [{ id: 'W0', title: 'Set up', items: 86, done: 40, agent: null }] });
const DONE = order('/home/u/done', { finished: true, done: 10, percent: 100, steps: [{ id: 'W1', title: 'The import', items: 10, done: 10, agent: null }] });

test('3 projects (4 live agents, none, finished) are 3 lines with the agent counts and the work of the lead and its agents summed', () => {
  const lines = projectLines([SHOP, IDLE, DONE]);
  assert.deepEqual(lines.map((l) => [l.name, l.agents, l.finished]), [['SHOP', 4, false], ['IDLE', 0, false], ['DONE', 0, true]]);
  assert.deepEqual(lines[0]?.work, { procs: 10, cores: 3.25, memMb: 650, queued: false }, 'the lead 2 + agents 3, 4, 1, 0 processes; the same for cores and memory');
  assert.equal(lines[0]?.step, 'W1 The import');
  assert.equal(lines[1]?.percent, 46.5, 'a project whose items say 40 of 86 shows 46.5, never the 0 of the agent-less read');
  assert.equal(lines[2]?.left, 'done');
});

test('the status line draws one row for each project, and none for an agent (red with a row per agent planted back)', () => {
  const cache = join(scratchDir('one-row-'), 'runs.json');
  writeJson(cache, { runs: [SHOP, IDLE, DONE], unreachable: [], updated: new Date(NOW).toISOString() });
  const paint = (text: string): string => text;
  const rows = runsSegments(cache, NOW, paint, 'none');
  assert.equal(rows.length, 3, rows.join('\n'));
  assert.match(rows[0] ?? '', /SHOP .*40%.*6 of 10 items left.*W1 The import.*4 agents.*10 proc · 3\.3 cpu · 650M ram/);
  assert.match(rows[1] ?? '', /IDLE .*47%.*46 of 86 items left.*W0 Set up/);
  assert.match(rows[2] ?? '', /DONE .*100%.*done/);
  assert.ok(rows.every((r) => !/> /.test(r)), 'no agent row: nothing says `name > step`');
});
