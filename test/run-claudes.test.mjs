// KWB-161: a work order driven from a Claude Code session (claude -p, the CLI, the VS Code extension's claude binary) has no
// run.sh process; it is found by what it does. The process list and the working folders are planted, so no test reads this
// machine's processes.
import assert from 'node:assert/strict';
import { mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { claudesIn, orderProjectOf, sessionOrders } from '../packs/base/hooks/lib/run-claudes.mjs';
import { fresh } from './kit-cli.mts';

const HOUR = 60 * 60 * 1000;
const put = (file, text = 'x\n') => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, text); };
const age = (file, ms) => { const t = (Date.now() - ms) / 1000; utimesSync(file, t, t); };

/** a project with three orders: live (status.json now), done (a DONE file), cold (untouched for two hours) */
function project() {
  const dir = fresh('runs-');
  put(join(dir, 'docs/workorders/live/status.json'), '{}\n');
  put(join(dir, 'docs/workorders/done/status.json'), '{}\n');
  put(join(dir, 'docs/workorders/done/DONE'), 'done\n');
  put(join(dir, 'docs/workorders/cold/progress.md'), '- old\n');
  age(join(dir, 'docs/workorders/cold/progress.md'), 2 * HOUR);
  mkdirSync(join(dir, '.claude/worktrees/agent-x/src'), { recursive: true });
  return dir;
}

const PS = (lines) => lines.map(([pid, args]) => `${pid} ${args}`).join('\n');

test('every kind of Claude Code process is a candidate, and nothing else', () => {
  const ps = PS([[11, 'claude --dangerously-skip-permissions'], [12, '/Users/u/.vscode/extensions/anthropic.claude-code-2.1.0/resources/native-binary/claude --output-format stream-json'],
    [13, 'claude -p Run docs/workorders/x/PROMPT.md'], [14, 'node /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js'],
    [15, 'node /Users/u/.claude/statusbar/statusline.cjs'], [16, 'bash docs/workorders/x/run.sh'], [17, 'grep claude']]);
  assert.deepEqual(claudesIn(ps), [11, 12, 13, 14]);
});

test('a folder inside a worktree gives its main checkout', () => {
  const dir = project();
  assert.equal(orderProjectOf(join(dir, '.claude/worktrees/agent-x/src')), dir);
  assert.equal(orderProjectOf(join(dir, 'docs')), dir);
  assert.equal(orderProjectOf(fresh('nothing-')), null);
});

test('a session\'s order is found with no run.sh; a DONE order and one untouched for over an hour are not', () => {
  const dir = project();
  const found = sessionOrders({ ps: PS([[4242, 'claude']]), cwds: () => new Map([[4242, join(dir, '.claude/worktrees/agent-x/src')]]), platform: 'darwin', nowMs: Date.now(), trees: () => [] });
  assert.deepEqual(found.runs.map((r) => r.order), ['live']);
  assert.equal(found.runs[0].project, dir);
});

test('an order whose files are old runs while a worktree on its work/<order>-* branch was touched in the hour', () => {
  const dir = project();
  const trees = () => [{ name: 'agent-x', branch: 'work/cold-agent', touched: Date.now() - 60_000 }, { name: 'other', branch: 'work/done-x', touched: Date.now() }];
  const found = sessionOrders({ ps: PS([[7, 'claude']]), cwds: () => new Map([[7, dir]]), platform: 'linux', nowMs: Date.now(), trees });
  assert.deepEqual(found.runs.map((r) => r.order).sort(), ['cold', 'live']);
});

test('on Windows it says it is not supported yet, and never crashes', () => {
  const found = sessionOrders({ ps: PS([[7, 'claude']]), platform: 'win32', nowMs: Date.now() });
  assert.deepEqual(found.runs, []);
  assert.match(found.unsupported, /not supported on Windows yet/);
});
