// 0.10.0 (STEP 3 item 3): synth-creator is everything the kit installed before configurations, unchanged for Stellix and
// Sub37. test/fixtures/noop/<project>/before/ is that project's own install state (layout.json, settings.json, the lock and
// CLAUDE.md, copied 2026-11-03), expected/ is what the 0.9.15 kit's `update` made of it. The 0.10.0 update, in the
// synth-creator configuration, must make the same: the same settings, the same CLAUDE.md, the same files in the lock, and
// layout.json with "configuration" its one new key. Files whose content changed on purpose are listed below, each with why.
import { KIT, assert, cli, copyFileSync, execFileSync, fresh, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';

// base files changed on purpose, what they do for a synth unchanged: their synth examples made neutral (item 2: base names no
// synth word); lib/writes.mjs gains judgeEvent, the one guard frame the new hooks and folder-law share (once-only); placement-law
// reads a kind's own "extensions" (KWB-36) and folder-law a layout's "sourceFiles" (KWB-37), both absent in a synth layout;
// 0.11.0: lesson-checks gains the "needs" mode, glob.mjs and git-guard turn their if-chains into tables (lookup-over-if-chains),
// git-guard and lib/pushed.mjs take a push over SSH (KWB-39)
// 0.36.1: git-guard does not judge another repo against guards.git.repo (KWB-48), its selftest gains the case
const FX = join(KIT, 'test/fixtures/noop');
// 0.25.0: the person's name out of every file, a // in a string read right, and what the reviews changed.
const REVIEWED = ['.claude/hooks/protect-vendor.mjs', '.claude/skills/analyse-reference-look/SKILL.md', '.claude/hooks/lib/house.py', '.claude/rules/oscillators-bandlimited.md', '.claude/hooks/secrets-guard.mjs', '.claude/rules/no-time-or-date.md', '.clang-tidy', '.claude/hooks/build-guard.mjs', '.claude/hooks/idle-wake.mjs', '.claude/hooks/lib/cpp-scan.mjs', '.claude/hooks/lib/hook-log.mjs', '.claude/hooks/lib/shell-writes.mjs', '.claude/hooks/making-check.mjs', '.claude/hooks/run-hooks.mjs', '.claude/hooks/time-guard.mjs', '.claude/hooks/user-asks.mjs', '.claude/rules/clang-tidy-core-guidelines.md', '.claude/rules/hooks-and-gates.md', '.claude/rules/plan-and-logs.md', '.claude/skills/copy-and-prove/SKILL.md'];
export const CHANGED = ['brief-guard.mjs', 'file-size-guard.mjs', 'folder-law.mjs', 'git-guard.mjs', 'making.mjs', 'once-only.mjs', 'placement-law.mjs',
  'shape-law.mjs', 'stage-guard.mjs', 'lesson-checks.mjs', 'dispatch-once.mjs', 'lib/glob.mjs', 'lib/pushed.mjs', 'lib/git-guard-selftest.mjs', 'lib/dup-index.mjs', 'lib/dup.mjs', 'lib/making-check-selftest.mjs', 'lib/project.mjs', 'lib/shape.mjs', 'lib/writes.mjs']
  .map((f) => `.claude/hooks/${f}`).concat(['.claude/rules/instances-by-index-identities-by-id.md', '.claude/skills/prove-instances-identical/SKILL.md',
    '.claude/tools/shape-symmetry.mjs', '.claude/tools/shape-symmetry-selftest.mjs',
    '.claude/tools/freeze.mjs', '.claude/tools/lib/wav.mjs', '.claude/rules/subagent-dispatch.md', '.claude/rules/bug-fix-starts-red.md',
    '.claude/rules/house-control-behaviours.md', '.claude/skills/prove-control/SKILL.md', '.claude/skills/build-step/SKILL.md']);   // 0.22.1: one control per template, the rest by a read   // 0.11.0: their if-chains are tables (lookup-over-if-chains)

function updated(project, named = true) {
  const dir = fresh(`noop-${project}-`);
  mkdirSync(join(dir, '.claude'));
  const b = (f) => join(FX, project, 'before', f);
  const layout = JSON.parse(readFileSync(b('layout.json'), 'utf8'));
  if (named) layout.configuration = 'synth-creator';
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(layout, null, 2));
  copyFileSync(b('settings.json'), join(dir, '.claude/settings.json'));
  copyFileSync(b('lock.json'), join(dir, '.claude/claude-packs.lock.json'));
  copyFileSync(b('claude-md.txt'), join(dir, 'CLAUDE.md'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  const out = cli(dir, 'update').stdout;   // doctor's verdict is the copy's (no design/shape.json, Stellix's own hooks' tools): not judged here
  return { dir, out };
}

const HOVER = ['.claude/rules/hover-every-pressable.md', 'lib/painter/.claude/skills/hover-state/SKILL.md'];
// 0.11.0 (v7 additions): base's three dispatch laws. Their rules come to every project; their hook (dispatch-once) and checks
// (lookup-over-if-chains, field-map-over-if-runs) are new, so an existing install holds them back until "enable" names them.
const V7 = ['.claude/rules/lookup-over-if-chains.md', '.claude/rules/field-map-over-if-runs.md', '.claude/rules/behaviour-lives-with-its-kind.md'];
// 0.13.0 (KWB-41): the time laws. A rule tied to a hook the project has comes with it; suite-once is new, so its rule is held back with it.
const TIME = ['.claude/rules/git-right-first-time.md', '.claude/rules/reuse-before-writing.md', '.claude/rules/making-line-first.md', '.claude/rules/split-before-the-limit.md',
  '.claude/skills/pick-tests/SKILL.md', '.claude/skills/build-through-the-queue/SKILL.md'];
// 0.15.0: the writing pack comes with every configuration. Its rules and skills reach a project with no refusing in them; its checks are held back.
const ELEMENTS = ['.claude/hooks/lib/elements.mjs', '.claude/hooks/lib/code-shapes.mjs', '.claude/hooks/lib/languages.mjs', '.claude/hooks/lib/near-copies.mjs', '.claude/hooks/lib/repo-index.mjs', '.claude/hooks/lib/function-shapes.mjs', '.claude/hooks/lib/content.mjs', '.claude/hooks/lib/git-adds.mjs', '.claude/hooks/lib/event-log.mjs', '.claude/hooks/lib/secret-patterns.mjs', '.claude/rules/refusals-are-judged.md', '.claude/skills/pdf-to-md/SKILL.md', '.claude/rules/timing-from-synthcore.md', '.claude/rules/straight-on-and-aligned.md', '.claude/rules/a-control-is-seen-to-fire.md', '.claude/skills/make-it-a-template/SKILL.md', '.claude/skills/fix-from-scan/SKILL.md'];   // 0.23.0, 0.24.0: the shared reader and its skill; template-law itself is held back
const WRITING = [...['cut-the-padding', 'rhythm-like-talk', 'no-stock-language', 'no-scaffolding', 'no-time-or-date', 'ascii-no-em-dash', 'write-from-your-own-corner', 'direct-voice', 'no-cargo-cult'].map((r) => `.claude/rules/${r}.md`),
  ...['humanize', 'reply-stance', 'should-i-reply', 'reply-moves', 'reddit-post', 'pick-subreddit', 'reddit-title', 'argument-post', 'launch-post', 'post-voice'].map((s) => `.claude/skills/${s}/SKILL.md`), '.claude/hooks/lib/prose.mjs'];
const LANDING = ['.claude/rules/test-the-template-once.md', '.claude/rules/finished-work-lands.md', '.claude/skills/land-branch/SKILL.md', '.claude/rules/a-refusal-is-exit-2.md', '.claude/skills/prove-a-hook/SKILL.md'];   // 0.17.0: with git-guard, which every project has
// 1.1.0: what a crash does (KF-18), what no hook could read (KF-40) and how git-guard proves the account (KF-12)
const FAIL_OPEN = ['crash-policy', 'unread-writes', 'git-auth', 'shape-prose', 'shape-lists'].map((f) => `.claude/hooks/lib/${f}.mjs`);
const REPAIRED = ['.claude/hooks/lib/program-read.mjs', '.claude/hooks/param-id-lock.mjs', '.claude/hooks/lib/turn.mjs'];   // 1.1.0: the crash on a helper's path (KF-40), the lock from the first id (KF-15)
const TIME_GUARD = ['.claude/rules/long-work-in-the-background.md'];   // only where the project has time-guard: the rule goes where its hook goes
const expected = (project, f) => readFileSync(join(FX, project, 'expected', f), 'utf8');

for (const project of ['stellix', 'sub37']) {
  test(`${project}: update in synth-creator makes what 0.9.15 made, but for the configuration key`, () => {
    const { dir } = updated(project);
    assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), expected(project, 'settings.json'), 'settings.json');
    assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), expected(project, 'claude-md.txt'), 'CLAUDE.md');
    const layout = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
    assert.equal(layout.configuration, 'synth-creator');
    delete layout.configuration;
    delete layout.concepts.js;   // 0.11.0: base's js concept (raw globs, so a complete layout gains it), for the dispatch laws
    delete layout.concepts['public-text'];   // 0.15.0: the writing pack's concept, raw globs too
    delete layout.concepts['hook-files']; delete layout.concepts['hook-config'];   // 0.18.0: the hook-proof pack's
    assert.equal(`${JSON.stringify(layout, null, 2)}\n`, expected(project, 'layout.json'), 'layout.json, the key aside');
    const lock = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
    const was = JSON.parse(expected(project, 'lock.json'));
    assert.deepEqual(lock.packs, was.packs, 'the packs the lock names');
    const added = [...V7, ...TIME, ...WRITING, ...LANDING, ...ELEMENTS, ...FAIL_OPEN, ...(was.files['.claude/hooks/time-guard.mjs'] ? TIME_GUARD : []), ...(lock.packs.includes('gpu-painter') ? HOVER : [])];   // 0.10.1: the hover law's rule and skill, new to a project that has gpu-painter
    assert.deepEqual(Object.keys(lock.files).sort(), [...Object.keys(was.files), ...added].sort(), 'the same files, no more, no fewer');
    const changed = Object.keys(was.files).filter((f) => lock.files[f] !== was.files[f]).sort();
    assert.deepEqual(changed.filter((f) => ![...CHANGED, ...REVIEWED, ...REPAIRED].includes(f)), [], 'only the base files changed on purpose differ in content');
  });
}

test('an install that names no configuration gets synth-creator from its packs, and the same result', () => {
  const { dir, out } = updated('sub37', false);
  assert.match(out, /configuration: synth-creator \(from its packs: base, audio-core\)/);
  assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), expected('sub37', 'settings.json'));
});
