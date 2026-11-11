// W7 (a): new-pack and add-lesson-check scaffold from lib/pack-template.mts, and what they make passes the whole conformance gate
// (test/pack-content-rig.mts): a pack with a hook that proves itself once a project enables it, and a check that is proved before it is written.
import { assert, existsSync, fresh, join, readFileSync, selftest, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { configsAt } from '../../lib/configs.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { KIT } from '../kit-cli.mts';
import { conceptsOf, conformance } from '../pack-content-rig.mts';
import { kit } from './custom-packs-rig.mts';

const NAME = 'scaffold-pack';
const findings = (repo: string): string[] => {
  const packs = join(repo, 'packs');
  return conformance(packs, conceptsOf(packs, configsAt(KIT))).map((f) => `${f.id} ${f.file}: ${f.note}`);
};
const made = (...flags: string[]): string => {
  const home = fresh('scaffold-');
  const r = kit(home, 'new-pack', NAME, '--repo', 'git@host:team/scaffold.git', ...flags);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return join(home, NAME);
};
const CHECK = ['--pack', NAME, '--why', 'The retired call is refused.', '--rule', `${NAME}-example.md`, '--globs', '**/*.ts', '--pattern', '\\bretiredCall\\(', '--bad', 'retiredCall(1);\\n', '--good', 'currentCall(1);   // the call that replaced it\\n'];

test('new-pack, with and without --hook, scaffolds a pack that passes the whole conformance gate', () => {
  assert.deepEqual(findings(made()), []);
  const withHook = made('--hook');
  assert.deepEqual(findings(withHook), []);
  const hook = readFileSync(join(withHook, `packs/${NAME}/hooks/${NAME}-example.mjs`), 'utf8');
  for (const part of [/runAsHook\(import\.meta\.url/, /export function selftest\(/, /export const worktreeCase/, /writtenSince\(/]) assert.match(hook, part);
});

test('the scaffolded hook proves itself in a project that enables it', () => {
  const repo = made('--hook');
  const project = fixture('base');
  assert.equal(kit(project, 'add', NAME, '--from', `file://${repo}`).status, 0);
  const layout = readLayout(project);
  writeFileSync(join(project, '.claude/layout.json'), JSON.stringify({ ...layout, enable: [...(layout.enable ?? []), `hooks/${NAME}-example.mjs`] }, null, 2));
  assert.equal(kit(project, 'update').status, 0);
  const proved = selftest(project, `${NAME}-example.mjs`);
  assert.equal(proved.status, 0, proved.stdout + proved.stderr);
  assert.match(proved.stdout, /selftest: OK/);
});

test('add-lesson-check writes a check with exclude, rule and kind filled, proved, and named in its rule', () => {
  const repo = made();
  const r = kit(repo, 'add-lesson-check', 'retired-call', ...CHECK);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const check = JSON.parse(readFileSync(join(repo, `packs/${NAME}/checks/retired-call.json`), 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(check), ['id', 'why', 'rule', 'globs', 'exclude', 'code', 'pattern', 'kind', 'bad', 'good']);
  assert.equal(check.rule, `.claude/rules/${NAME}-example.md`);
  assert.equal(check.kind, 'correctness');
  assert.ok(Array.isArray(check.exclude) && check.exclude.length > 0);
  assert.match(readFileSync(join(repo, `packs/${NAME}/rules/${NAME}-example.md`), 'utf8'), /`retired-call` refuses/);
  assert.deepEqual(findings(repo), []);
});

test('add-lesson-check refuses an unproved check, a missing rule, a stub good and a repeated id, and writes nothing', () => {
  const repo = made();
  const refused = (id: string, ...flags: string[]): string => {
    const r = kit(repo, 'add-lesson-check', id, ...flags);
    assert.equal(r.status, 2, r.stdout);
    assert.ok(!existsSync(join(repo, `packs/${NAME}/checks/${id}.json`)), `${id} is not written`);
    return r.stderr;
  };
  assert.match(refused('misses-bad', ...CHECK, '--pattern', '\\bnever-there\\b'), /does not catch its "bad" example/);
  assert.match(refused('flags-good', ...CHECK, '--good', 'retiredCall(1); // the call stays here\\n'), /wrongly flags its "good" example/);
  assert.match(refused('stub-good', ...CHECK, '--good', 'ok();'), /"good" is a stub/);
  assert.match(refused('no-rule', ...CHECK, '--rule', 'missing.md'), /does not exist: write the rule first/);
  assert.match(refused('bad-kind', ...CHECK, '--kind', 'vibes'), /kind "vibes" is not one of/);
  assert.match(refused('no-why', ...CHECK.filter((word, i, all) => word !== '--why' && all[i - 1] !== '--why')), /needs --why/);
  assert.equal(kit(repo, 'add-lesson-check', 'once', ...CHECK).status, 0);
  assert.match(kit(repo, 'add-lesson-check', 'once', ...CHECK).stderr, /already exists/);
});

test('add-lesson-check in a project writes to its .claude, beside the rule that it names', () => {
  const project = fixture('base');
  const r = kit(project, 'add-lesson-check', 'retired-call', '--why', 'The retired call is refused.', '--rule', 'a-control-is-seen-to-fire.md', '--globs', '**/*.ts', '--pattern', '\\bretiredCall\\(', '--bad', 'retiredCall(1);\\n', '--good', 'currentCall(1);   // the call that replaced it\\n', '--kind', 'quality');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(project, '.claude/checks/retired-call.json')));
  assert.match(readFileSync(join(project, '.claude/rules/a-control-is-seen-to-fire.md'), 'utf8'), /`retired-call` refuses/);
});
