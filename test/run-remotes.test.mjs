// 1.8.1: the runs of other machines (packs/base/hooks/lib/run-remotes.mjs). The user, as a run moved to the Mac: "but we
// still need to get some kind of report here for whats happening". No test reaches a real machine: the ssh call is a stand-in.
import { assert, fresh, join, mkdirSync, test, writeFileSync } from './kit-cli.mjs';
import { toJson } from '../packs/base/hooks/lib/json.mjs';
import { askCommand, machineName, remoteRuns, remotesOf, remotesReport } from '../packs/base/hooks/lib/run-remotes.mjs';
import { runRows, runsReport } from '../lib/run-status.mjs';
import { statusReport } from '../lib/status-cli.mjs';
import { runsSegments } from '../packs/base/tools/statusline-runs.mjs';

const MAC = { name: 'mac', ssh: 'mac', dir: '~/projects/shop' };
const RUN = { project: '/Users/u/projects/shop', order: 'shop', items: 10, done: 5, percent: 50, finished: false,
  steps: [{ id: 'W1', title: 'The import', items: 10, done: 5 }], agents: [{ name: 'api', step: 'W1', title: 'The import', percent: 50, now: '' }] };
const answers = (text) => () => text;
const fails = (stderr) => () => { throw Object.assign(new Error('Command failed'), { stderr }); };

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
  assert.match(askCommand({ name: 'b', ssh: 'b' })[1][5], /'claude-packs status --json'$/);
  assert.equal(askCommand({ name: 'k', ssh: 'k', kit: '~/.cache/kit' })[1][5], "$SHELL -lc 'node ~/.cache/kit/bin/claude-packs.mjs status --json'");
});

test('a machine\'s runs come back marked with its name, and the rows put the name before the project', () => {
  const got = remoteRuns(MAC, answers(toJson({ runs: [RUN] })));
  assert.equal(got.unreachable, null);
  assert.equal(got.runs[0].host, 'mac');
  assert.equal(runRows(got.runs[0], Date.now()).project.name, 'MAC: SHOP');
});

test('a machine that cannot be asked, or whose kit gives no status, is a row that says so, never silence', () => {
  const { runs, unreachable } = remotesReport([MAC, { name: 'old', ssh: 'old' }], (_cmd, args) => (args[4] === 'mac' ? fails('ssh: connect to host mac port 22: Operation timed out')() : 'Usage: claude-packs <command>'));
  assert.deepEqual(runs, []);
  assert.deepEqual(unreachable.map((u) => u.host), ['mac', 'old']);
  assert.match(unreachable[0].why, /timed out/);
  assert.match(unreachable[1].why, /no status from its kit/);
});

test('status and the status line show a remote run beside the local ones, and an unreachable machine in red', () => {
  const report = runsReport({ remotes: [MAC], ask: answers(toJson({ runs: [RUN] })) });
  assert.ok(report.runs.some((r) => r.host === 'mac'));
  const lines = statusReport({ remotes: [MAC], ask: fails('Connection refused') });
  assert.ok(lines.includes('MAC: not reached (Connection refused)'));
  const dir = fresh('remotes-bar-');
  mkdirSync(join(dir, 'c'), { recursive: true });
  const cache = join(dir, 'c', 'runs.json');
  writeFileSync(cache, toJson({ updated: new Date().toISOString(), runs: [{ ...RUN, host: 'mac' }], unreachable: [{ host: 'pc', why: 'timed out' }] }));
  const rows = runsSegments(cache, Date.now(), (t) => t, 'none');
  assert.match(rows[0], /^MAC: SHOP\s/);
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
  const report = runsReport({ remotes: [MAC], ask: answers(toJson({ runs: [RUN] })), here: 'pc' });
  assert.ok(report.runs.length > 0 && report.runs.every((r) => r.host === 'pc' || r.host === 'mac'), report.runs.map((r) => r.host).join());
  assert.ok(runsReport({ remotes: [], here: 'pc' }).runs.every((r) => !r.host), 'one machine alone: no names');
});

test('one project\'s report (--dir) asks no machine', () => {
  let asked = 0;
  runsReport({ dir: fresh('remotes-dir-'), remotes: [MAC], ask: () => { asked += 1; return '{}'; } });
  assert.equal(asked, 0);
});
