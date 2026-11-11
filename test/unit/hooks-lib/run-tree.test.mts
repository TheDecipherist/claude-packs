// run-tree.mts: the runs as a tree, one shape for `status` and the status line: projects, their orders, each order's agents.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AgentStatus, OrderStatus } from '../../../packs/base/hooks/lib/run-rows.mts';
import { projectGroups, runTree } from '../../../packs/base/hooks/lib/run-tree.mts';

const agent = (name: string): AgentStatus => ({ name, step: 'W1', title: 'T', now: '', state: null, updated: null, percent: 50, beat: null, path: `/p/${name}`, stale: false, fresh: false });
const run = (over: Partial<OrderStatus> = {}): OrderStatus => ({ project: '/p/shop', order: 'shop', steps: [{ id: 'W1', title: 'T', items: 10, done: 5, agent: null }], agents: [], items: 10, done: 5, percent: 50, source: 'status.json', finished: false, lead: null, ...over });
const NOW = Date.parse('2026-01-01T00:00:00Z');

test('orders of one project on one machine are one group with their items summed; another machine is its own group', () => {
  const groups = projectGroups([run({ host: 'pc', order: 'a', items: 80, done: 48 }), run({ host: 'pc', project: '/p/shop/.claude/worktrees/w1', order: 'b', items: 20, done: 10 }), run({ host: 'mac' })]);
  assert.deepEqual(groups.map((g) => `${g.name}:${g.runs.length}:${g.items}:${g.done}:${g.percent}`), ['PC: SHOP:2:100:58:58', 'MAC: SHOP:1:10:5:50']);
  assert.equal(groups[0]?.state, '42 of 100 items left, 2 orders');
  assert.equal(projectGroups([run({ finished: true, order: 'a' }), run({ finished: true, order: 'b' })])[0]?.state, 'done');
  assert.deepEqual(projectGroups([]), []);
});

test('a lone order is its own head row, its agents hang from it with the last one closing the branch', () => {
  const rows = runTree([run({ agents: [agent('api'), agent('web')] })], NOW);
  assert.deepEqual(rows.map((r) => `${r.kind}:${r.prefix}`), ['order:', 'agent:├ ', 'agent:└ ']);
  assert.match(rows[0] && 'state' in rows[0] ? rows[0].state : '', /2 agents/);
});

test('two orders get a project row, each hanging from it; an order\'s agents hang from the order', () => {
  const rows = runTree([run({ order: 'a', agents: [agent('x')] }), run({ order: 'b', agents: [agent('y')] })], NOW);
  assert.deepEqual(rows.map((r) => `${r.kind}:${r.prefix}`), ['project:', 'order:├ ', 'agent:│ └ ', 'order:└ ', 'agent:  └ ']);
});

test('the lead alone is said on its order\'s row, never a row of its own; nothing running gives no rows', () => {
  const rows = runTree([run()], NOW);
  assert.equal(rows.length, 1);
  assert.match(rows[0] && 'state' in rows[0] ? rows[0].state : '', /lead on W1 T/);
  assert.deepEqual(runTree([], NOW), []);
});
