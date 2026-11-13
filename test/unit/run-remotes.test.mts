// 1.8.1: the runs of other machines (packs/base/hooks/lib/run-remotes.mts). The user, as a run moved to the Mac: "but we
// still need to get some kind of report here for whats happening". No test reaches a real machine: the ssh call is a stand-in.
import { assert, fresh, join, mkdirSync, test, writeFileSync } from '../kit-cli.mts';
import { toJson } from '../../packs/base/hooks/lib/json.mts';
import { askCommand, machineName, remoteRuns, remotesOf, remotesReport } from '../../packs/base/hooks/lib/run-remotes.mts';
import type { Asker, Remote } from '../../packs/base/hooks/lib/run-remotes.mts';
import { projectGroups, runRows, runsReport } from '../../lib/run-status.mts';
import type { OrderStatus } from '../../lib/run-status.mts';
import { statusReport } from '../../lib/status-cli.mts';
import { runsSegments } from '../../packs/base/tools/statusline-runs.mts';

const HERE = { env: process.env, platform: process.platform };
const MAC: Remote = { name: 'mac', ssh: 'mac', dir: '~/projects/shop' };
const RUN: OrderStatus = { project: '/Users/u/projects/shop', order: 'shop', items: 10, done: 5, percent: 50, finished: false, source: 'workorder.md', lead: null,
  steps: [{ id: 'W1', title: 'The import', items: 10, done: 5, agent: 'api' }],
  agents: [{ name: 'api', step: 'W1', title: 'The import', percent: 50, now: '', state: null, updated: null, beat: null, path: '/p/api', stale: false, fresh: true }] };
const answers = (text: string): Asker => () => text;
const fails = (stderr: string): Asker => () => { throw Object.assign(new Error('Command failed'), { stderr }); };

test('the machines come from remotes.json; a missing or broken file is none, and a folder that is not a plain path is left out', () => {
  const dir = fresh('remotes-');
  const file = join(dir, 'remotes.json');
  assert.deepEqual(remotesOf(file), []);
  writeFileSync(file, '{ half');
  assert.deepEqual(remotesOf(file), []);
  writeFileSync(file, toJson({ remotes: [MAC, { name: 'x', ssh: 'x', dir: '~/a; rm -rf ~' }, { name: 'z', ssh: 'z', kit: '$(id)' }, { name: 'y' }] }));
  assert.deepEqual(remotesOf(file).map((r) => r.name), ['mac']);
});

test('a machine is asked with no password prompt, a connect limit and its own login shell, through the kit in the named folder', () => {
  const [cmd, args] = askCommand(MAC);
  assert.equal(cmd, 'ssh');
  assert.deepEqual(args.slice(0, 4), ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5']);
  assert.equal(args[4], 'mac');
  assert.equal(args[5], "$SHELL -lc 'cd ~/projects/shop && npx --no-install @thedecipherist/claude-packs status --json'");
  assert.match(askCommand({ name: 'b', ssh: 'b' })[1][5] ?? '', /'claude-packs status --json'$/);
  assert.equal(askCommand({ name: 'k', ssh: 'k', kit: '~/.cache/kit' })[1][5], "$SHELL -lc 'node ~/.cache/kit/bin/claude-packs.mjs status --json'");
});

test('a machine\'s runs come back marked with its name, and the rows put the name before the project', () => {
  const got = remoteRuns<OrderStatus>(MAC, answers(toJson({ runs: [RUN] })));
  assert.equal(got.unreachable, null);
  const first = got.runs[0];
  assert.ok(first);
  assert.equal(first.host, 'mac');
  assert.equal(runRows(first, Date.now()).project.name, 'MAC: SHOP');
  // a run in one of a project's worktrees is named by the project, its order beside it
  assert.equal(runRows({ ...RUN, project: '/p/vsynthgt/.claude/worktrees/W12-look', order: 'ui-look' }, Date.now()).project.name, 'VSYNTHGT (ui-look)');
});

test('a machine that cannot be asked, or whose kit gives no status, is a row that says so, never silence', () => {
  const { runs, unreachable } = remotesReport([MAC, { name: 'old', ssh: 'old' }], (cmd, args) => (args[4] === 'mac' ? fails('ssh: connect to host mac port 22: Operation timed out')(cmd, args) : 'Usage: claude-packs <command>'));
  assert.deepEqual(runs, []);
  assert.deepEqual(unreachable.map((u) => u.host), ['mac', 'old']);
  assert.match(unreachable[0]?.why ?? '', /timed out/);
  assert.match(unreachable[1]?.why ?? '', /no status from its kit/);
});

test('status and the status line show a remote run beside the local ones, and an unreachable machine in red', () => {
  const report = runsReport({ ...HERE, remotes: [MAC], ask: answers(toJson({ runs: [RUN] })) });
  assert.ok(report.runs.some((r) => r.host === 'mac'));
  const lines = statusReport({ remotes: [MAC], ask: fails('Connection refused') });
  assert.ok(lines.includes('MAC: not reached (Connection refused)'));
  const dir = fresh('remotes-bar-');
  mkdirSync(join(dir, 'c'), { recursive: true });
  const cache = join(dir, 'c', 'runs.json');
  writeFileSync(cache, toJson({ updated: new Date().toISOString(), runs: [{ ...RUN, host: 'mac' }], unreachable: [{ host: 'pc', why: 'timed out' }] }));
  const rows = runsSegments(cache, Date.now(), (t) => t, 'none');
  assert.match(rows[0] ?? '', /^MAC: SHOP\s/);
  assert.equal(rows.at(-1), 'PC: not reached (timed out)');
  writeFileSync(cache, toJson({ runs: [], unreachable: [{ host: 'mac', why: 'asleep' }] }));
  assert.deepEqual(runsSegments(cache, Date.now(), (t) => t, 'none'), ['MAC: not reached (asleep)']);
});

test('with other machines listed every run says where it runs, this machine\'s too: its name from remotes.json, else its platform', () => {
  const dir = fresh('remotes-name-');
  const file = join(dir, 'remotes.json');
  assert.equal(machineName(file, 'darwin'), 'mac');
  assert.equal(machineName(file, 'linux'), 'pc');
  writeFileSync(file, toJson({ name: 'studio', remotes: [] }));
  assert.equal(machineName(file, 'linux'), 'studio');
  const report = runsReport({ ...HERE, remotes: [MAC], ask: answers(toJson({ runs: [RUN] })), here: 'pc' });
  assert.ok(report.runs.length > 0 && report.runs.every((r) => r.host === 'pc' || r.host === 'mac'), report.runs.map((r) => r.host).join());
  assert.ok(runsReport({ ...HERE, remotes: [], here: 'pc' }).runs.every((r) => !r.host), 'one machine alone: no names');
});

test('a project with two orders is one row, its percent theirs together; a project with one keeps its row', () => {
  const a: OrderStatus = { ...RUN, host: 'pc', project: '/p/vsynthgt', order: 'rebuild', items: 80, done: 48, percent: 60 };
  const b: OrderStatus = { ...RUN, host: 'pc', project: '/p/vsynthgt/.claude/worktrees/W12-look', order: 'ui-look', items: 20, done: 10, percent: 50 };
  const groups = projectGroups([a, b, { ...RUN, host: 'mac' }]);
  assert.deepEqual(groups.map((g) => `${g.name}:${g.runs.length}:${g.percent}`), ['PC: VSYNTHGT:2:58', 'MAC: SHOP:1:50']);
  const dir = fresh('remotes-group-');
  const cache = join(dir, 'runs.json');
  writeFileSync(cache, toJson({ runs: [a, b, { ...RUN, host: 'mac' }] }));
  const rows = runsSegments(cache, Date.now(), (t) => t, 'none');
  assert.equal(rows.length, 2, 'one row a project, the orders of VSYNTHGT together');   // W8.9: no row for an order or an agent
  assert.match(rows[0] ?? '', /^PC: VSYNTHGT .* 58%  42 of 100 items left · W1 The import · \d+ agents?/);
  assert.match(rows[1] ?? '', /^MAC: SHOP /);
  assert.equal(new Set(rows.map((r) => r.indexOf('█'))).size, 1, 'every row\'s bar in one column');
});

test('one project\'s report (--dir) asks no machine', () => {
  let asked = 0;
  runsReport({ ...HERE, dir: fresh('remotes-dir-'), remotes: [MAC], ask: () => { asked += 1; return '{}'; } });
  assert.equal(asked, 0);
});
