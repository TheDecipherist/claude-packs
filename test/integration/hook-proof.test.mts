// 0.18.0: whenever a hook is supposed to exit 2 and it exits 0, it is caught. Only exit 2 blocks, so a crash, a hook no
// settings entry runs, and an `exit 1` all let the call through in silence.
// (A crashed hook: hook-proof-crashes.test.mts, split so no file sums over a minute.)
import { KIT, assert, cli, holdToExamples, join, readFileSync, readdirSync, test, writeFileSync } from '../kit-cli.mts';
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

test('each fail-open form is refused through the hook, and its good form passes', () => {
  const checks = readdirSync(join(KIT, 'packs/hook-proof/checks')).map((f) => parseJson<HookCheck>(readFileSync(join(KIT, 'packs/hook-proof/checks', f), 'utf8')));
  const held = checks.filter((c): c is HookCheck => c !== null);
  assert.equal(held.length, 5);
  const hookFiles = new Set(held.filter((c) => c.concepts.includes('hook-files')).map((c) => c.id));
  holdToExamples(installed(), held, (c) => (hookFiles.has(c.id) ? '.claude/hooks/mine.sh' : '.claude/settings.local.json'));
});
