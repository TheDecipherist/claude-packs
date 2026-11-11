// shape-law in an install (split from shape-law.test.mts so no file sums over a minute): what a new install carries, and what update switches on.
import { join } from 'node:path';
import { assert, cli, existsSync, readFileSync, rmSync, selftest, test, writeFileSync } from '../../kit-cli.mts';
import { readHookTable } from '../../../packs/base/hooks/lib/hook-table.mts';
import { fixture } from '../hook-rig.mts';

// 0.9.0 (KWB-1): the engine-scoped checks no-instance-index-literal and no-instance-id-literal are retired; shape-law judges
// every folder against design/shape.json, so the world and UI code that let B-200 through are judged too.
test('the rule and shape-law install with every project; the engine-scoped instance checks are gone', () => {
  const dir = fixture('audio-core');
  assert.ok(existsSync(join(dir, '.claude/rules/instances-by-index-identities-by-id.md')));
  assert.ok(existsSync(join(dir, '.claude/hooks/shape-law.mjs')));
  assert.ok(!existsSync(join(dir, '.claude/checks/no-instance-index-literal.json')));
  assert.ok(!existsSync(join(dir, '.claude/checks/no-instance-id-literal.json')));
  const self = selftest(dir, 'shape-law.mjs');
  assert.equal(self.status, 0, self.stdout + self.stderr);
});

test('the shape hooks are the law: on in a new install and switched on by update in a project that had the kit', () => {
  const dir = fixture('audio-core');
  const lockFile = join(dir, '.claude/claude-packs.lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8')) as { files: Record<string, string> };
  for (const h of ['shape-law.mjs', 'brief-guard.mjs']) { delete lock.files[`.claude/hooks/${h}`]; rmSync(join(dir, '.claude/hooks', h)); }
  writeFileSync(lockFile, JSON.stringify(lock));
  const tableFile = join(dir, '.claude/hooks/hooks.json');   // the runner's table names the hooks (W8.1): the project that had the kit had neither
  const before = (readHookTable(join(dir, '.claude/hooks')) ?? []).filter((r) => !/shape-law|brief-guard/.test(r.hook));
  writeFileSync(tableFile, JSON.stringify(before));
  const r = cli(dir, 'update');
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/brief-guard\.mjs/);
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/shape-law\.mjs/);
  const table = readHookTable(join(dir, '.claude/hooks')) ?? [];
  assert.ok(table.some((row) => row.hook === 'shape-law'), 'shape-law is a row again');
  assert.ok(table.some((row) => row.hook === 'brief-guard' && row.matcher === 'Agent|Task'), 'brief-guard reads every agent brief');
});
