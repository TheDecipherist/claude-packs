// run-rows.mts: one order's rows, the same for `status` and the status line: its name, what is left, one row per agent or the lead.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AgentStatus, OrderStatus } from '../../../packs/base/hooks/lib/run-rows.mts';
import { projectOf, runRows } from '../../../packs/base/hooks/lib/run-rows.mts';

const agent = (over: Partial<AgentStatus> = {}): AgentStatus => ({ name: 'api', step: 'W1', title: '', now: '', state: null, updated: null, percent: null, beat: null, path: '/p/api', stale: false, fresh: false, ...over });
const order = (over: Partial<OrderStatus> = {}): OrderStatus => ({ project: '/u/shop', order: 'shop', steps: [{ id: 'W1', title: 'The import', items: 4, done: 1, agent: null }], agents: [], items: 4, done: 1, percent: 25, source: 'status.json', finished: false, lead: null, ...over });
const NOW = Date.parse('2026-01-01T00:00:00Z');

test('a run in a worktree belongs to its project, and the order is named beside it only when it differs', () => {
  assert.equal(projectOf('/p/vsynthgt/.claude/worktrees/W12-look/src'), '/p/vsynthgt');
  assert.equal(projectOf('/p/vsynthgt'), '/p/vsynthgt');
  assert.equal(runRows(order(), NOW).project.name, 'SHOP');
  assert.equal(runRows(order({ order: 'rebuild', host: 'mac' }), NOW).project.name, 'MAC: SHOP (rebuild)');
});

test('the state says what is left and how many agents; a finished order says done and has no rows', () => {
  const two = runRows(order({ agents: [agent(), agent({ name: 'web' })] }), NOW);
  assert.equal(two.project.state, '3 of 4 items left, 2 agents');
  assert.equal(runRows(order({ agents: [agent()] }), NOW).project.state, '3 of 4 items left, 1 agent');
  const done = runRows(order({ finished: true, agents: [agent()] }), NOW);
  assert.equal(done.project.state, 'done');
  assert.deepEqual(done.agents, []);
});

test('an agent takes its title and percent from its step; one with no step says why in words, never a question mark', () => {
  const [a] = runRows(order({ agents: [agent()] }), NOW).agents;
  assert.equal(a?.title, 'The import');
  assert.equal(a?.percent, 25);
  const [fresh] = runRows(order({ agents: [agent({ step: null, fresh: true })] }), NOW).agents;
  assert.equal(fresh?.title, 'not started yet');
  const [none] = runRows(order({ agents: [agent({ step: null })] }), NOW).agents;
  assert.equal(none?.title, 'no status file yet');
});

test('an agent stopped on purpose is never quiet; with no agent the lead is the row of the first open step', () => {
  const [paused] = runRows(order({ agents: [agent({ state: 'paused', updated: '2025-12-31T00:00:00Z' })] }), NOW).agents;
  assert.equal(paused?.paused, true);
  assert.equal(paused?.quiet, 0);
  const lead = runRows(order(), NOW).agents;
  assert.equal(lead.length, 1);
  assert.equal(lead[0]?.who, 'lead');
  assert.equal(lead[0]?.id, 'W1');
  // planted: every step done and no agent, so there is no lead row to invent
  assert.deepEqual(runRows(order({ steps: [{ id: 'W1', title: 'x', items: 2, done: 2, agent: null }] }), NOW).agents, []);
});
