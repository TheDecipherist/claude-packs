// own-processes.mts: the session's own processes, with its pid passed in (W3.3).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { descendants, etimeS, ownProcesses, sessionPid } from '../../../packs/base/hooks/lib/own-processes.mts';
import type { ProcessRow } from '../../../packs/base/hooks/lib/own-processes.mts';

const row = (pid: number, ppid: number, cmd: string): ProcessRow => ({ pid, ppid, age: 0, cmd });
const table = [row(2, 1, 'launchd-child'), row(10, 2, '/usr/local/bin/claude --x'), row(11, 10, 'node hook.mjs'), row(12, 10, 'bash'), row(13, 12, 'sleep 9'), row(30, 2, 'runner.sh'), row(31, 30, 'sleep 1')];

test('etimeS: ps elapsed time to seconds', () => {
  assert.equal(etimeS('05'), 5);
  assert.equal(etimeS('01:05'), 65);
  assert.equal(etimeS('1:01:05'), 3665);
  assert.equal(etimeS('2-01:00:00'), 2 * 86400 + 3600);
});

test('sessionPid and ownProcesses: from the pid the caller gives; another session or the runner is not its own', () => {
  assert.equal(sessionPid(table, 11), 10);
  assert.equal(sessionPid(table, 31), null);          // no claude above the runner's child
  assert.equal(sessionPid(table, 999), null);         // a pid the table does not have
  assert.deepEqual([...(ownProcesses(table, 11) ?? [])].sort(), [11, 12, 13]);
  assert.equal(ownProcesses(table, 11)?.has(31), false);
  assert.equal(ownProcesses([row(5, 1, 'bash')], 5), null);
  assert.deepEqual([...descendants(table, 30)], [31]);
});
