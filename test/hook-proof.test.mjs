// 0.18.0 (Tim, 2026-11-04): whenever a hook is supposed to exit 2 and it exits 0, it is caught. Only exit 2 blocks, so a crash, a hook no
// settings entry runs, and an `exit 1` all let the call through in silence.
import { KIT, appendFileSync, assert, cli, fresh, holdToExamples, join, readFileSync, readdirSync, run, test, writeFileSync } from './kit-cli.mjs';

const installed = () => { const dir = fresh('hp-'); run(dir, 'init', '--config', 'base'); return dir; };

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
  const line = (code) => `${new Date(Date.now() + 60_000).toISOString()}\tPreToolUse\tfolder-law\t3\t${code}\tWrite\n`;
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

test('each fail-open form is refused through the hook, and its good form passes', () => {
  const checks = readdirSync(join(KIT, 'packs/hook-proof/checks')).map((f) => JSON.parse(readFileSync(join(KIT, 'packs/hook-proof/checks', f), 'utf8')));
  assert.equal(checks.length, 5);
  holdToExamples(installed(), checks, (c) => (c.concepts.includes('hook-files') ? '.claude/hooks/mine.sh' : '.claude/settings.local.json'));
});
