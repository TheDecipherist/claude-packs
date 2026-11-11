// What a new install of base carries, with no hook of its own (split from base-pack.test.mts so no file sums over a minute): full-stack as a
// composition of packs, and the two laws every new project gets with their selftests.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assert, selftest, test } from '../../kit-cli.mts';
import { extraFixture, fixture } from '../hook-rig.mts';

test('full-stack is a composition: the stack choice is its own pack, and the rest is packs any project can take', () => {
  const dir = extraFixture('http-api-zod-node', ['http-api', 'zod', '--config', 'node']);
  for (const f of ['rules/routes-are-thin.md', 'rules/one-error-contract.md', 'rules/apis-are-versioned.md', 'rules/zod-4-schemas.md', 'hooks/schemas-only.mjs']) assert.ok(existsSync(join(dir, '.claude', f)), f);
  assert.ok(!existsSync(join(dir, '.claude/hooks/stack-guard.mjs')), 'the stack choice stays with full-stack');
  const stack = fixture('full-stack');
  for (const f of ['hooks/stack-guard.mjs', 'hooks/schemas-only.mjs', 'rules/tests-use-inject.md', 'rules/dockerfile-multistage.md', 'rules/pointer-feedback.md', 'rules/three-layers.md']) assert.ok(existsSync(join(stack, '.claude', f)), f);
});

// 0.10.0 (STEP 3 item 2): base gains secrets-guard (KWB-33) and the SHA-256 boundary law, untrusted-boundary (KWB-34), each with a rule that states it.
const NEW_LAWS = [['hooks/secrets-guard.mjs', 'rules/secrets-never-committed.md'], ['hooks/untrusted-boundary.mjs', 'rules/untrusted-content-boundary.md']] as const;

test('a new project of every configuration gets both laws, and both selftests pass', () => {
  for (const config of ['base', 'synth-creator'] as const) {
    const dir = fixture(config);
    const settings = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
    for (const [hook, rule] of NEW_LAWS) {
      assert.ok(existsSync(join(dir, '.claude', rule)), `${config}: ${rule}`);
      assert.match(settings, new RegExp(hook.replace('hooks/', '').replace('.', '\\.')), `${config}: ${hook} wired`);
      const r = selftest(dir, hook.replace('hooks/', ''));
      assert.equal(r.status, 0, r.stdout + r.stderr);
    }
  }
});
