// git-guard's detached refresh (`--refresh-stop`, started after a commit or push) is one of its worker's process groups when a daemon
// runs the hook, so `daemon stop` ends it. Before: the children were reparented to init and ran on for up to 30 s after the stop.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assert, CLI, test } from '../kit-cli.mts';
import { fire, pidOf, proxyRig } from './proxy-fire-rig.mts';

test('daemon stop ends the refresh children its hooks started', () => {
  const r = proxyRig('refresh-stop-');
  const sh = (c: string): string => execSync(c, { cwd: r.project, encoding: 'utf8', env: { ...process.env, HOME: r.env.HOME } });
  const hub = `../hub-${process.pid}.git`;
  const setup = ['git init -q -b main', 'git config user.email a@b.c', 'git config user.name t', `git init -q --bare ${hub}`, 'git add -A', 'git commit -qm i'];
  for (const c of [...setup, `git remote add origin ${hub}`, 'git push -q -u origin main', 'git switch -q -c work/1.0.0-x']) sh(c);
  const file = join(r.project, '.claude/layout.json');
  const layout = JSON.parse(readFileSync(file, 'utf8')) as { enable?: string[]; guards?: Record<string, unknown> };
  writeFileSync(file, JSON.stringify({ ...layout, enable: [...(layout.enable ?? []), 'guards/git-house'], guards: { ...layout.guards, git: { house: true } } }));
  const event = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', session_id: 's', cwd: r.project, tool_input: { command: 'git commit -m x -- a && git push origin work/1.0.0-x' } });
  const rows = (): string[] => execSync(`ps -axo pid=,ppid=,command= | grep -e '--refresh-stop' | grep -F '${r.project}' | grep -v grep || true`, { encoding: 'utf8' }).split('\n').filter(Boolean);
  const mine = (): string[] => rows().map((l) => l.trim().split(/\s+/)[0] ?? '');   // every refresh child of this project
  let ofDaemon: string[] = [];
  try {
    for (let i = 0; i < 4 && pidOf(r) === 0; i += 1) fire(r, event);   // the first events may be answered by the runner while the daemon starts
    assert.ok(pidOf(r) > 0, 'a daemon is running');
    for (const pid of mine()) process.kill(Number(pid), 'SIGKILL');   // the early events were answered before the daemon ran: their children are not the daemon's
    fire(r, event);
    const daemon = String(pidOf(r));
    ofDaemon = mine();   // the worker starts it through `sh` (startOrphan, the W10b zombie fix), so its parent is init, not the daemon: its group is the daemon's to end
    assert.ok(ofDaemon.length > 0, `a refresh child is running under the daemon ${daemon}; rows: ${JSON.stringify(rows())}`);
    spawnSync('node', [CLI, 'daemon', 'stop', '--dir', r.project], { env: r.env });
    assert.deepEqual(mine().filter((pid) => ofDaemon.includes(pid)), [], 'no refresh child of the daemon outlives the stop');
  } finally {
    for (const pid of mine()) process.kill(Number(pid), 'SIGKILL');
    const pid = pidOf(r);
    if (pid) process.kill(pid);
  }
});
