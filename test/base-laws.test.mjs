// 0.10.0 (Tim, STEP 3 item 2): base gains secrets-guard (KWB-33) and the SHA-256 boundary law, untrusted-boundary (KWB-34),
// each with a rule that states it. A new project gets both; a project that had base before gets neither until it names them in
// "enable" (a new law never switches on by itself), and a rule that states a hook's law ("# hook:" in its frontmatter) is held
// back with its hook.
import { assert, existsSync, fresh, join, readFileSync, rmSync, run, selftest, test, writeFileSync } from './kit-cli.mjs';

const NEW = [['hooks/secrets-guard.mjs', 'rules/secrets-never-committed.md'], ['hooks/untrusted-boundary.mjs', 'rules/untrusted-content-boundary.md']];

test('a new project of every configuration gets both laws, and both selftests pass', () => {
  for (const config of ['base', 'synth-creator']) {
    const dir = fresh('laws-');
    run(dir, 'init', '--config', config);
    const settings = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
    for (const [hook, rule] of NEW) {
      assert.ok(existsSync(join(dir, '.claude', rule)), `${config}: ${rule}`);
      assert.match(settings, new RegExp(hook.replace('hooks/', '').replace('.', '\\.')), `${config}: ${hook} wired`);
      const r = selftest(dir, hook.replace('hooks/', ''));
      assert.equal(r.status, 0, r.stdout + r.stderr);
    }
  }
});

test('a project that had base before 0.10.0 gets neither law until it enables it; the rule waits with its hook', () => {
  const dir = fresh('laws-');
  run(dir, 'init', 'audio-core');
  // what a 0.9.15 install looks like: neither hook, rule, lock entry nor settings entry
  const lockFile = join(dir, '.claude/claude-packs.lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  for (const [hook, rule] of NEW) for (const rel of [hook, rule]) { rmSync(join(dir, '.claude', rel)); delete lock.files[`.claude/${rel}`]; }
  writeFileSync(lockFile, JSON.stringify(lock, null, 2));
  const sf = join(dir, '.claude/settings.json');
  writeFileSync(sf, readFileSync(sf, 'utf8').replace(/ \.claude\/hooks\/(secrets-guard|untrusted-boundary)\.mjs/g, ''));
  const out = run(dir, 'update');
  assert.match(out, /held back, not switched on .*hooks\/secrets-guard\.mjs, hooks\/untrusted-boundary\.mjs/);
  for (const [hook, rule] of NEW) {
    assert.ok(!existsSync(join(dir, '.claude', hook)), hook);
    assert.ok(!existsSync(join(dir, '.claude', rule)), `${rule} waits with its hook`);
  }
  const lf = join(dir, '.claude/layout.json');
  writeFileSync(lf, JSON.stringify({ ...JSON.parse(readFileSync(lf, 'utf8')), enable: ['hooks/secrets-guard.mjs'] }, null, 2));
  run(dir, 'update');
  assert.ok(existsSync(join(dir, '.claude/hooks/secrets-guard.mjs')));
  assert.ok(existsSync(join(dir, '.claude/rules/secrets-never-committed.md')), 'the rule comes with its hook');
  assert.ok(!existsSync(join(dir, '.claude/rules/untrusted-content-boundary.md')));
});
