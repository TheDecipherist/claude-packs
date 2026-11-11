// 0.18.0: a hook that crashed is red in doctor until it changes (split from hook-proof.test.mts so no file sums over a minute).
import { appendFileSync, assert, cli, join, mkdirSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

test('a hook that crashed is red until it changes; a refusal is not a crash', () => {
  const dir = fixture('base');
  const line = (code: number): string => `${new Date(Date.now() + 60_000).toISOString()}\tPreToolUse\tfolder-law\t3\t${code}\tWrite\n`;
  const log = join(dir, '.claude/hooks.log');
  appendFileSync(log, line(2) + line(0));
  assert.equal(cli(dir, 'doctor').status, 0, 'a refusal and a pass are answers');
  appendFileSync(log, line(1));
  const r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /folder-law\.mjs crashed on 1 call\(s\)/);
  writeFileSync(log, `${new Date(Date.now() - 3_600_000).toISOString()}\tPreToolUse\tfolder-law\t3\t1\tWrite\n`);
  assert.equal(cli(dir, 'doctor').status, 0, 'a crash from before the hook last changed is history');
});

test('a crash stays red after its log line has rotated away', () => {
  const dir = fixture('base');
  mkdirSync(join(dir, '.claude/logs'), { recursive: true });
  writeFileSync(join(dir, '.claude/logs/hooks-20260101-000000.log'), `${new Date(Date.now() + 60_000).toISOString()}\tPreToolUse\tfolder-law\t3\t1\tWrite\n`);
  const r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /folder-law\.mjs crashed on 1 call\(s\)/);
});
