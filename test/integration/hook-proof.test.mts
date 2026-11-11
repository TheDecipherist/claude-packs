// 0.18.0: whenever a hook is supposed to exit 2 and it exits 0, it is caught. Only exit 2 blocks, so a crash, a hook no
// settings entry runs, and an `exit 1` all let the call through in silence.
import { KIT, appendFileSync, assert, cli, holdToExamples, join, mkdirSync, readFileSync, readdirSync, test, writeFileSync } from '../kit-cli.mts';
import type { CheckExamples } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { parseJson } from '../../packs/base/hooks/lib/json.mts';

type HookCheck = CheckExamples & { concepts: string[] };
const installed = (): string => fixture('base');

test('a clean install is green; a hook no settings entry runs is red', () => {
  const dir = installed();
  assert.equal(cli(dir, 'doctor').status, 0);
  writeFileSync(join(dir, '.claude/hooks/orphan.mjs'), '// --selftest\nprocess.exit(0);\n');
  const r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /orphan\.mjs is in \.claude\/hooks but no settings entry runs it/);
});

test('a hook that crashed is red until it changes; a refusal is not a crash', () => {
  const dir = installed();
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
  const dir = installed();
  mkdirSync(join(dir, '.claude/logs'), { recursive: true });
  writeFileSync(join(dir, '.claude/logs/hooks-20260101-000000.log'), `${new Date(Date.now() + 60_000).toISOString()}\tPreToolUse\tfolder-law\t3\t1\tWrite\n`);
  const r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /folder-law\.mjs crashed on 1 call\(s\)/);
});

test('each fail-open form is refused through the hook, and its good form passes', () => {
  const checks = readdirSync(join(KIT, 'packs/hook-proof/checks')).map((f) => parseJson<HookCheck>(readFileSync(join(KIT, 'packs/hook-proof/checks', f), 'utf8')));
  const held = checks.filter((c): c is HookCheck => c !== null);
  assert.equal(held.length, 5);
  const hookFiles = new Set(held.filter((c) => c.concepts.includes('hook-files')).map((c) => c.id));
  holdToExamples(installed(), held, (c) => (hookFiles.has(c.id) ? '.claude/hooks/mine.sh' : '.claude/settings.local.json'));
});
