// refusals-judged: a turn ends only when every refusal this session met has its verdict (KWB-next: 41 left open in supernova2).
// An opt-in hook: its fixture enables it.
import { enabledFixture, holdsTheContract } from '../hook-rig.mts';
import { join } from 'node:path';
import { assert, hookRun, mkdirSync, test, writeFileSync } from '../../kit-cli.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';

const dir = (): string => enabledFixture('refusals-judged', 'base', 'hooks/refusals-judged.mjs');
const logs = (project: string, refusals: object[], verdicts: object[] = []): string => {
  mkdirSync(join(project, '.claude/logs'), { recursive: true });
  writeFileSync(join(project, '.claude/logs/refusals.jsonl'), refusals.map((r) => `${toJson(r)}\n`).join(''));
  writeFileSync(join(project, '.claude/logs/verdicts.jsonl'), verdicts.map((v) => `${toJson(v)}\n`).join(''));
  return project;
};
const refused = (id: string, session = 's1', code = 2): object => ({ id, t: '2026-11-13T13:00:00.000Z', hook: 'no-find', code, reason: 'BLOCKED', session });
const stop = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ hook_event_name: 'Stop', session_id: 's1', ...extra });

holdsTheContract({ hook: 'refusals-judged.mjs', dir, same: (project) => { logs(project, [refused('aa11')]); return { payload: stop(), status: 2 }; } });

test('refusals-judged: sends a turn back while one of its refusals has no verdict, and names it', () => {
  const project = logs(dir(), [refused('aa11'), refused('bb22')], [{ id: 'aa11', verdict: 'right', why: 'x' }]);
  const r = hookRun(project, 'refusals-judged.mjs', stop());
  assert.equal(r.status, 2);
  assert.match(r.stderr, /bb22/);
  assert.doesNotMatch(r.stderr, /aa11/);
});

test('refusals-judged: passes when all are judged, for another session\'s, for a crash, and once sent back', () => {
  const project = dir();
  assert.equal(hookRun(logs(project, [refused('aa11')], [{ id: 'aa11', verdict: 'wrong', why: 'x' }]), 'refusals-judged.mjs', stop()).status, 0);
  assert.equal(hookRun(logs(project, [refused('cc33', 's2')]), 'refusals-judged.mjs', stop()).status, 0);
  assert.equal(hookRun(logs(project, [refused('dd44', 's1', 1)]), 'refusals-judged.mjs', stop()).status, 0);
  assert.equal(hookRun(logs(project, [refused('ee55')]), 'refusals-judged.mjs', stop({ stop_hook_active: true })).status, 0);
});
