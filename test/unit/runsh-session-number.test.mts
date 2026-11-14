// KWB-next: a resumed run numbered its sessions from 1 again and wrote over the logs a report is measured from. The template's
// numbering, run on its own in bash against a logs folder, starts after the highest session-<n>.jsonl.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assert, fresh, mkdirSync, test, writeFileSync } from '../kit-cli.mts';

const TEMPLATE = readFileSync(join(import.meta.dirname, '../../prompts/workorder/run.sh'), 'utf8');

/** The template's numbering lines: from its comment to the end of the loop that reads the logs. */
const numbering = (): string => {
  const from = TEMPLATE.indexOf('# numbered on from the last session');
  const loop = TEMPLATE.indexOf('done\n', from);
  assert.ok(from >= 0 && loop > from, 'the numbering block is in the template');
  return TEMPLATE.slice(from, loop + 5);
};

const firstSession = (files: readonly string[], block = numbering()): string => {
  const logs = join(fresh('runsh-'), 'logs');
  mkdirSync(logs, { recursive: true });
  for (const f of files) writeFileSync(join(logs, f), '{}\n');
  const r = spawnSync('bash', ['-c', `logs="$1"\n${block}\necho "$session"`, 'x', logs], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

test('a run started over earlier logs numbers on from the highest one, and an empty folder starts at 1', () => {
  assert.equal(firstSession(['session-1.jsonl', 'session-2.jsonl', 'session-12.jsonl', 'session-3.err', 'runner.log']), '13');
  assert.equal(firstSession([]), '1');
  assert.equal(firstSession(['session-x.jsonl']), '1');
});

test('planted: the old `session=1` line starts over the logs, and the test sees it', () => {
  assert.equal(firstSession(['session-1.jsonl', 'session-2.jsonl'], 'session=1'), '1');
  assert.notEqual(firstSession(['session-1.jsonl', 'session-2.jsonl'], 'session=1'), firstSession(['session-1.jsonl', 'session-2.jsonl']));
});

test('the loop counts the sessions it runs apart from their numbers, so MAX_SESSIONS is never cut by old logs', () => {
  assert.match(TEMPLATE, /while \[\[ "\$ran" -lt "\$max_sessions" \]\]; do/);
  assert.match(TEMPLATE, /ran=\$\(\(ran \+ 1\)\)/);
});
