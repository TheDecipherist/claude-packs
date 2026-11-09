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
const REVIEWED = ['.claude/hooks/protect-vendor.mjs', '.claude/skills/analyse-reference-look/SKILL.md', '.claude/hooks/lib/house.py', '.claude/rules/oscillators-bandlimited.md', '.claude/hooks/secrets-guard.mjs', '.claude/rules/no-time-or-date.md', '.clang-tidy', '.claude/hooks/build-guard.mjs', '.claude/hooks/idle-wake.mjs', '.claude/hooks/lib/cpp-scan.mjs', '.claude/hooks/lib/hook-log.mjs', '.claude/hooks/lib/shell-writes.mjs', '.claude/hooks/making-check.mjs', '.claude/hooks/run-hooks.mjs', '.claude/hooks/time-guard.mjs', '.claude/hooks/user-asks.mjs', '.claude/rules/clang-tidy-core-guidelines.md', '.claude/rules/hooks-and-gates.md', '.claude/rules/plan-and-logs.md', '.claude/skills/copy-and-prove/SKILL.md',
  '.claude/skills/new-panel-control/SKILL.md', '.claude/skills/test-quietly/SKILL.md'];   // 1.5.2: new-panel-control's step 7, the switch gate (KWB-105); test-quietly's step 7, the user's files (KWB-106)
export const CHANGED = ['brief-guard.mjs', 'file-size-guard.mjs', 'folder-law.mjs', 'git-guard.mjs', 'making.mjs', 'once-only.mjs', 'placement-law.mjs',
  'shape-law.mjs', 'stage-guard.mjs', 'lesson-checks.mjs', 'dispatch-once.mjs', 'lib/layout.mjs', 'lib/glob.mjs', 'lib/pushed.mjs', 'lib/git-guard-selftest.mjs', 'lib/dup-index.mjs', 'lib/dup.mjs', 'lib/making-check-selftest.mjs', 'lib/project.mjs', 'lib/shape.mjs', 'lib/writes.mjs']
  .map((f) => `.claude/hooks/${f}`).concat(['.claude/rules/instances-by-index-identities-by-id.md', '.claude/skills/prove-instances-identical/SKILL.md',
    '.claude/tools/shape-symmetry.mjs', '.claude/tools/shape-symmetry-selftest.mjs',
    '.claude/tools/freeze.mjs', '.claude/tools/lib/wav.mjs', '.claude/rules/subagent-dispatch.md', '.claude/rules/bug-fix-starts-red.md',
    '.claude/rules/house-control-behaviours.md', '.claude/skills/prove-control/SKILL.md', '.claude/skills/build-step/SKILL.md']);   // 0.22.1: one control per template, the rest by a read   // 0.11.0: their if-chains are tables (lookup-over-if-chains)

function updated(project, config = 'synth-creator') {
  const dir = fresh(`noop-${project}-`);
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, 'package.json'), '{}\n'); // these projects hold the kit as a dev dependency: a project with none is told another command (KWB-76)
  const b = (f) => join(FX, project, 'before', f);
  const layout = JSON.parse(readFileSync(b('layout.json'), 'utf8'));
  if (config) layout.configuration = config;
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
const LANDING = ['.claude/skills/new-project/SKILL.md', '.claude/skills/write-a-workorder/SKILL.md', '.claude/rules/test-the-template-once.md', '.claude/rules/finished-work-lands.md', '.claude/skills/land-branch/SKILL.md', '.claude/rules/a-refusal-is-exit-2.md', '.claude/skills/prove-a-hook/SKILL.md'];   // 0.17.0: with git-guard, which every project has
// 1.1.0: what a crash does (KF-18), what no hook could read (KF-40) and how git-guard proves the account (KF-12)
const FAIL_OPEN = ['crash-policy', 'unread-writes', 'git-auth', 'shape-prose', 'shape-lists'].map((f) => `.claude/hooks/lib/${f}.mjs`);
const REPAIRED = ['.claude/hooks/lib/program-read.mjs', '.claude/hooks/param-id-lock.mjs', '.claude/hooks/lib/turn.mjs', '.claude/rules/cpu-worst-case-per-block.md', '.claude/rules/scoped-no-denormals.md', '.claude/rules/ui-matches-reference-look.md', '.claude/skills/prove-control/SKILL.md', '.claude/skills/analyse-reference-look/SKILL.md', '.claude/hooks/lib/shape-code.mjs', '.claude/hooks/lib/shape.mjs'];   // 1.1.0: the crash on a helper's path (KF-40), the lock from the first id (KF-15); 1.3.2: a picker's accessor is no selector (KWB-91)
const RUST = ['.claude/hooks/lib/rust-scan.mjs'];   // 1.1.0: what reads Rust right (KWB-75)
const QUIET = ['.claude/skills/test-quietly/SKILL.md', '.claude/tools/quiet-test.mjs'];   // 1.2.0: every test through one script, off the desktop
const EDITOR = ['.claude/rules/editor-paints-what-changed.md', '.claude/skills/editor-frame-bench/SKILL.md', '.claude/rules/presses-held-for-the-firmware.md', '.claude/skills/new-panel-control/switch-gate-harness.md'];   // KWB-105: a state is applied where it changes and gated by the redrawn region (new-panel-control's SKILL.md changes, it is not new); 1.3.2: an editor paints what changed, and its frame time is measured (audio-core); 1.4.3 (KWB-102): a press lasts as long as the firmware needs
const SKILL_FIRST = ['.claude/hooks/lib/skill-first-selftest.mjs', '.claude/hooks/lib/look-gate-selftest.mjs'];   // 1.3.1, 1.3.2: the selftests of skill-first and look-gate; the hooks themselves are new, so they are held back
const NEW_PROJECTS = ['.claude/rules/unattended-runs.md', '.claude/tools/buildq.mjs', '.claude/rules/a-control-is-proved-through-its-input.md'];   // 1.1.0: KF-7 and KF-1
const TIME_GUARD = ['.claude/rules/long-work-in-the-background.md'];   // only where the project has time-guard: the rule goes where its hook goes
const OWN = ['.claude/hooks/lib/own-processes.mjs', '.claude/hooks/lib/time-guard-selftest.mjs', '.claude/hooks/lib/identifier-runs.mjs'];   // 1.3.2 (KWB-87): which processes a session started; time-guard's selftest in its own file; (KWB-93) a camelCase concept's runs of parts
const TRUNK = ['trunk-lag', 'trunk-lag-selftest', 'hub-rig'].map((f) => `.claude/hooks/lib/${f}.mjs`);
const PREFIX = ['.claude/hooks/lib/command-prefix.mjs'];   // 1.4.1 (KWB-101): one reader of the wrappers in front of a command, for git-guard and shell-writes   // 1.4.0 (KWB-96): git-guard's Stop sees the main checkout a landing left behind; its selftest's scratch repo shared
const SHELL_LEX = ['.claude/hooks/lib/shell-lex.mjs'];   // 1.5.6 (KWB-118): shell-writes' reader of the text, split out of it at the line limit
const SHELL_CHANGED = ['.claude/hooks/lib/shell-writes-selftest.mjs'];   // 1.5.6 (KWB-118): its cases for a cd inside a child shell
const SMOOTHING = ['.claude/hooks/lib/smoothing-checks.mjs'];   // 1.5.12 (KWB-126): realtime-guard's smoothing judgement, audio-core, off until layout.json has guards.smoothing
const SMOOTHING_CHANGED = ['.claude/hooks/realtime-guard.mjs', '.claude/rules/smooth-continuous-parameters.md'];   // its cases; the rule names the guard
const USER_FILES = ['.claude/rules/tests-never-touch-user-files.md'];
const START = ['.claude/skills/start-from-a-workorder/SKILL.md'];   // 1.5.11: a build starts from a finished work order and its design, in base   // 1.5.2 (KWB-106): a test gets copies of the user's files, in base, so in every project
const BUDGET = ['core-budget', 'compile-cache'].map((f) => `.claude/hooks/lib/${f}.mjs`);   // 1.5.4 (KWB-111, KWB-112): the machine's core share for the queue and the tests; whether a build folder compiles through the shared cache
// 1.4.0 (admiral-fleet W4): moved from audio-core to base, installed at the same place, so a synth project keeps it (its new text is in REPAIRED)
const MOVED = { '.claude/skills/analyse-reference-look/SKILL.md': 'packs/base/skills/analyse-reference-look/SKILL.md' };
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
    delete layout.concepts['look-analysis'];   // 1.1.0: audio-core's, so straight-on-and-aligned loads where the analysis happens
    assert.equal(`${JSON.stringify(layout, null, 2)}\n`, expected(project, 'layout.json'), 'layout.json, the key aside');
    const lock = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
    const was = JSON.parse(expected(project, 'lock.json'));
    assert.deepEqual(lock.packs, was.packs, 'the packs the lock names');
    const added = [...V7, ...TIME, ...WRITING, ...LANDING, ...ELEMENTS, ...FAIL_OPEN, ...RUST, ...NEW_PROJECTS, ...QUIET, ...SKILL_FIRST, ...OWN, ...TRUNK, ...PREFIX, ...BUDGET, ...USER_FILES, ...START, ...SHELL_LEX, ...(lock.packs.includes('audio-core') ? [...EDITOR, ...SMOOTHING] : []), ...(was.files['.claude/hooks/time-guard.mjs'] ? TIME_GUARD : []), ...(lock.packs.includes('gpu-painter') ? HOVER : [])];   // 0.10.1: the hover law's rule and skill, new to a project that has gpu-painter
    assert.deepEqual(Object.keys(lock.files).sort(), [...Object.keys(was.files), ...added].sort(), 'the same files, no more, no fewer');
    const changed = Object.keys(was.files).filter((f) => lock.files[f] !== was.files[f]).sort();
    assert.deepEqual(changed.filter((f) => ![...CHANGED, ...REVIEWED, ...REPAIRED, ...SHELL_CHANGED, ...SMOOTHING_CHANGED, '.claude/rules/test-only-what-changed.md', '.claude/rules/audio-ui-thread-handoff.md'].includes(f)), [], 'only the base files changed on purpose differ in content');
    for (const [file, from] of Object.entries(MOVED)) {
      assert.ok(was.files[file] && lock.files[file], `${file}: kept in the lock after the move`);
      assert.equal(readFileSync(join(dir, file), 'utf8'), readFileSync(join(KIT, from), 'utf8'), `${file}: moved, not lost`);
    }
  });
}

test('an install that names no configuration gets synth-creator from its packs, and the same result', () => {
  const { dir, out } = updated('sub37', false);
  assert.match(out, /configuration: synth-creator \(from its packs: base, audio-core\)/);
  assert.equal(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), expected('sub37', 'settings.json'));
});

// admiral-fleet W3 (KWB-97): full-stack's template moved under packages/ and gained a web folder. A project installed with the
// template before it (test/fixtures/noop/full-stack/before/: the kit at f747567, the web app in channel/, the API in api/src)
// keeps its own layout on update: no template folder or concept added, the same CLAUDE.md, the same files. A file the kit
// changes on purpose later goes in FULL_STACK_CHANGED (look-gate and its selftest: a report is keyed by the code, KWB-121), and a new one in FULL_STACK_ADDED, with why.
const FULL_STACK_CHANGED = ['.claude/skills/write-a-workorder/SKILL.md', '.claude/hooks/look-gate.mjs', '.claude/hooks/lib/look-gate-selftest.mjs', '.claude/hooks/git-guard.mjs', '.claude/hooks/lib/shell-writes.mjs', '.claude/hooks/lib/git-guard-selftest.mjs', '.claude/hooks/lib/project.mjs', '.claude/skills/pdf-to-md/SKILL.md', '.claude/tools/quiet-test.mjs', '.claude/skills/test-quietly/SKILL.md', '.claude/hooks/brief-guard.mjs', '.claude/hooks/lib/shape-prose.mjs', '.claude/hooks/lib/shape.mjs', '.claude/hooks/making-check.mjs', '.claude/hooks/lib/making-check-selftest.mjs'];   // 1.5.9 (KWB-122): making-check judges the file as it stands   // 1.4.7 (KWB-117): a path names a file   // 1.5.2 (KWB-106): test-quietly's step on the user's files   // 1.5.4 (KWB-111): quiet-test runs a test with the machine's core share   // 1.4.4 (KWB-103): project.mjs exports its common-dir reader; 1.4.5: pdf-to-md caps docling at two runs   // 1.4.1 (KWB-101): both read a command past its wrappers
const FULL_STACK_ADDED = ['.claude/skills/analyse-reference-look/SKILL.md', '.claude/rules/page-matches-reference-look.md', ...PREFIX, ...BUDGET, ...USER_FILES, ...START, ...SHELL_LEX];   // W4: the skill in base, the page law in ui-craft
test('full-stack: an update keeps an existing project\'s own layout, and changes only the listed files', () => {
  const { dir } = updated('full-stack', 'full-stack');
  const before = (f) => readFileSync(join(FX, 'full-stack', 'before', f), 'utf8');
  const was = JSON.parse(before('layout.json'));
  const layout = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
  assert.deepEqual(layout.folders, was.folders, 'its folders, no more, no fewer');
  assert.deepEqual(layout.concepts, was.concepts, 'its concepts');
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), before('claude-md.txt'), 'CLAUDE.md');
  const lock = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
  const old = JSON.parse(before('lock.json'));
  assert.deepEqual(Object.keys(lock.files).sort(), [...Object.keys(old.files), ...FULL_STACK_ADDED].sort(), 'the same files, and the listed new ones');
  assert.deepEqual(Object.keys(old.files).filter((f) => lock.files[f] !== old.files[f] && ![...FULL_STACK_CHANGED, ...SHELL_CHANGED].includes(f)), [], 'only the listed files changed');
});
