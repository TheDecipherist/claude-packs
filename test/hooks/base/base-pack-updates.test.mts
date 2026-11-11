// What an update does to an install of base, with no hook of its own (split from base-pack.test.mts so no file sums over a minute): the
// old paint pattern replaced and a project's own kept, and a project that had base before 0.10.0 getting the new laws only when it enables them.
import { join } from 'node:path';
import { assert, existsSync, readFileSync, rmSync, run, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

test('an install that copied the old paint pattern gets the new one; a project pattern is kept', () => {
  const dir = fixture('audio-core');
  const file = join(dir, '.claude/layout.json');
  type Editor = { content: string; contentWas?: string };
  const layoutOf = (): { kinds: { editor: Editor } } => JSON.parse(readFileSync(file, 'utf8')) as { kinds: { editor: Editor } };
  const set = (content: string): void => { const l = layoutOf(); l.kinds.editor.content = content; writeFileSync(file, JSON.stringify(l)); };
  const now = (): string => layoutOf().kinds.editor.content;
  set('\\bvoid\\s+paint\\s*\\(\\s*(juce::)?Graphics\\b');
  run(dir, 'update');
  assert.equal(now(), '\\bvoid\\s+(?:\\w+::)*paint\\s*\\(\\s*(?:juce::)?Graphics\\b');
  assert.ok(!('contentWas' in layoutOf().kinds.editor));
  set('\\bvoid\\s+draw\\b');
  run(dir, 'update');
  assert.equal(now(), '\\bvoid\\s+draw\\b');
});

// 0.10.0 (STEP 3 item 2): base gains secrets-guard (KWB-33) and the SHA-256 boundary law, untrusted-boundary (KWB-34), each with a
// rule that states it. A new project gets both (base-pack-laws.test.mts); a project that had base before gets neither until it names them in "enable" (a new
// law never switches on by itself), and a rule that states a hook's law ("# hook:" in its frontmatter) is held back with its hook.
const NEW_LAWS = [['hooks/secrets-guard.mjs', 'rules/secrets-never-committed.md'], ['hooks/untrusted-boundary.mjs', 'rules/untrusted-content-boundary.md']] as const;

test('a project that had base before 0.10.0 gets neither law until it enables it; the rule waits with its hook', () => {
  const dir = fixture('audio-core');
  // what a 0.9.15 install looks like: neither hook, rule, lock entry nor settings entry
  const lockFile = join(dir, '.claude/claude-packs.lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8')) as { files: Record<string, string> };
  for (const [hook, rule] of NEW_LAWS) for (const rel of [hook, rule]) { rmSync(join(dir, '.claude', rel)); delete lock.files[`.claude/${rel}`]; }
  writeFileSync(lockFile, JSON.stringify(lock, null, 2));
  const sf = join(dir, '.claude/settings.json');
  writeFileSync(sf, readFileSync(sf, 'utf8').replace(/ \.claude\/hooks\/(secrets-guard|untrusted-boundary)\.mjs/g, ''));
  const out = run(dir, 'update');
  assert.match(out, /held back, not switched on .*hooks\/secrets-guard\.mjs, hooks\/untrusted-boundary\.mjs/);
  for (const [hook, rule] of NEW_LAWS) {
    assert.ok(!existsSync(join(dir, '.claude', hook)), hook);
    assert.ok(!existsSync(join(dir, '.claude', rule)), `${rule} waits with its hook`);
  }
  const lf = join(dir, '.claude/layout.json');
  writeFileSync(lf, JSON.stringify({ ...(JSON.parse(readFileSync(lf, 'utf8')) as Record<string, unknown>), enable: ['hooks/secrets-guard.mjs'] }, null, 2));
  run(dir, 'update');
  assert.ok(existsSync(join(dir, '.claude/hooks/secrets-guard.mjs')));
  assert.ok(existsSync(join(dir, '.claude/rules/secrets-never-committed.md')), 'the rule comes with its hook');
  assert.ok(!existsSync(join(dir, '.claude/rules/untrusted-content-boundary.md')));
});
