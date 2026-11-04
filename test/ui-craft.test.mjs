// 0.17.0 (Tim, 2026-11-04): application and page design, from Vercel's guidelines, Anthropic's frontend-design, Impeccable and taste-skill
// (docs/ui-craft-sources.md says what came from each). A check blocks only what is objective or what the sources agree on; taste stays a rule.
import { KIT, assert, cli, existsSync, fresh, hookRun, join, mkdirSync, readFileSync, readdirSync, run, test, writeFileSync } from './kit-cli.mjs';

const write = (dir, rel, content) => hookRun(dir, 'lesson-checks.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
const checks = readdirSync(join(KIT, 'packs/ui-craft/checks')).map((f) => JSON.parse(readFileSync(join(KIT, 'packs/ui-craft/checks', f), 'utf8')));

test('the UI presets and full-stack bring the pack; every check names a rule that is there, and every rule names checks that are', () => {
  const dir = fresh('uic-');
  run(dir, 'init', 'next-app');
  assert.ok(existsSync(join(dir, '.claude/rules/no-generated-look.md')));
  for (const c of checks) assert.ok(existsSync(join(KIT, 'packs/ui-craft', c.rule.replace('.claude/', ''))), c.id);
  for (const r of readdirSync(join(KIT, 'packs/ui-craft/rules'))) {
    for (const [, id] of readFileSync(join(KIT, 'packs/ui-craft/rules', r), 'utf8').matchAll(/`(ui-[a-z-]+)`/g)) assert.ok(checks.some((c) => c.id === id), `${r} names ${id}`);
  }
});

test('each check refuses its bad example and passes its good one through the hook, in a real install', () => {
  const dir = fresh('uic-all-');
  run(dir, 'init', 'next-app');
  for (const c of checks) {
    const file = c.concepts.includes('ui-styles') && !c.bad.includes('<') ? 'src/app.css' : 'src/ui/Thing.tsx';
    const r = write(dir, file, c.bad);
    assert.equal(r.status, 2, c.id);
    assert.match(r.stderr, new RegExp(c.id));
    assert.equal(write(dir, file, c.good).status, 0, `${c.id}: good`);
  }
});

test('doctor is red for UI code with no page gate, and green with one or with a reason', () => {
  const dir = fresh('uic-gate-');
  run(dir, 'init', 'next-app');
  const layoutFile = join(dir, '.claude/layout.json');
  const layout = () => JSON.parse(readFileSync(layoutFile, 'utf8'));
  const set = (gates) => writeFileSync(layoutFile, JSON.stringify({ ...layout(), gates }, null, 2));
  assert.equal(cli(dir, 'doctor').status, 0, 'no UI code yet: nothing to prove');
  mkdirSync(join(dir, 'src/ui'), { recursive: true });
  writeFileSync(join(dir, 'src/ui/Page.tsx'), 'export const Page = () => <main />;\n');
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /no a11y gate declared/);
  assert.match(red.stdout, /prove-page/);
  set({ a11y: 'none: a throwaway prototype' });
  assert.equal(cli(dir, 'doctor').status, 0);
  set({ a11y: 'node tools/page-gate.mjs' });
  assert.match(cli(dir, 'doctor').stdout, /tools\/page-gate\.mjs, which is not there/);
});

test('finished work lands: the rule and the skill come with git-guard, in every install', () => {
  const dir = fresh('uic-land-');
  run(dir, 'init', '--config', 'base');
  assert.match(readFileSync(join(dir, '.claude/rules/finished-work-lands.md'), 'utf8'), /merged into the trunk and pushed/);
  assert.match(readFileSync(join(dir, '.claude/skills/land-branch/SKILL.md'), 'utf8'), /^---\nname: land-branch\ndescription: Use when /);
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
});
