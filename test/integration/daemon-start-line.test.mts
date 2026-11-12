// The daemon writes one daemon-start line to hooks.log when it starts listening, and doctor reads the calls after it as a cold start
// (lib/hook-budget.mts, commit-cost). A second daemon (after a stop) writes a second line.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DAEMON_START } from '../../packs/base/hooks/lib/hook-log.mts';
import { assert, test } from '../kit-cli.mts';
import { fire, pidOf, proxyRig } from './proxy-fire-rig.mts';

test('a daemon start writes a daemon-start line before its first event line', () => {
  const rig = proxyRig('daemon-start-');
  try {
    const event = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', session_id: 's', cwd: rig.project, tool_input: { command: 'git status' } });
    for (let i = 0; i < 4 && pidOf(rig) === 0; i += 1) assert.equal(fire(rig, event), 0);   // the first events may be answered by the runner while the daemon starts
    assert.ok(pidOf(rig) > 0, 'a daemon is running');
    fire(rig, event);
    const lines = readFileSync(join(rig.project, '.claude/hooks.log'), 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
    const at = lines.findIndex((c) => c[2] === DAEMON_START);
    assert.ok(at >= 0, 'a daemon-start line');
    assert.ok(lines.slice(at + 1).some((c) => c[2] === 'event'), 'the event line follows it');
  } finally { const pid = pidOf(rig); if (pid) process.kill(pid); }
});
