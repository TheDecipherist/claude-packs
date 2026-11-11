// shape-law in an install (split from shape-law.test.mts so no file sums over a minute): what a new install carries, and what update switches on.
import { join } from 'node:path';
import { assert, cli, existsSync, readFileSync, rmSync, selftest, test, writeFileSync } from '../../kit-cli.mts';
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
  interface Group { matcher?: string; hooks: { command: string }[] }
  const sf = join(dir, '.claude/settings.json');
  const before = JSON.parse(readFileSync(sf, 'utf8')) as { hooks: Record<string, Group[]> };
  for (const ev of Object.keys(before.hooks)) before.hooks[ev] = (before.hooks[ev] ?? []).map((g) => ({ ...g, hooks: g.hooks.filter((h) => !/shape-law|brief-guard/.test(h.command)) })).filter((g) => g.hooks.length);
  writeFileSync(sf, JSON.stringify(before));
  const r = cli(dir, 'update');
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/brief-guard\.mjs/);
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/shape-law\.mjs/);
  const s = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  assert.match(s, /hooks\/shape-law\.mjs/);
  const agent = (JSON.parse(s) as { hooks: { PreToolUse: Group[] } }).hooks.PreToolUse.find((g) => g.matcher === 'Agent|Task');
  assert.ok(agent?.hooks.some((h) => h.command.includes('brief-guard.mjs')), 'brief-guard reads every agent brief');
});
