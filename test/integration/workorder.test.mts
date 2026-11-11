// 1.1.0: a project can build itself, and a reader can find out how. The templates come from two whole builds run with nobody there. KWB-84: `new` used to
// install a synth's laws on any project.
import { CLI, KIT, assert, cli, execFileSync, existsSync, fresh, join, mkdirSync, readdirSync, readFileSync, spawnSync, statSync, test, writeFileSync } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';
import { kitCommand } from '../../lib/kit-command.mts';

const FOLDER = 'docs/workorders/billing';
const TEMPLATES = 'prompts/workorder/templates';
const README = readFileSync(join(KIT, 'README.md'), 'utf8');

test('workorder writes the steps, the prompt and the runner, with its name in them', () => {
  const dir = fresh('wo-');
  const r = cli(dir, 'workorder', 'billing');
  assert.equal(r.status, 0, r.stderr);
  for (const file of ['workorder.md', 'PROMPT.md', 'run.sh']) {
    const text = readFileSync(join(dir, FOLDER, file), 'utf8');
    assert.doesNotMatch(text, /\{\{/, file);
    assert.match(text, /billing/, file);
  }
  assert.ok(statSync(join(dir, FOLDER, 'run.sh')).mode & 0o100, 'the runner can be run');
  execFileSync('bash', ['-n', join(dir, FOLDER, 'run.sh')]);
});

test('workorder never writes over a work order that exists', () => {
  const dir = fresh('wo-');
  cli(dir, 'workorder', 'billing');
  writeFileSync(join(dir, FOLDER, 'workorder.md'), 'my steps\n');
  const again = cli(dir, 'workorder', 'billing');
  assert.equal(again.status, 2);
  assert.match(again.stderr, /already exists: nothing was written/);
  assert.equal(readFileSync(join(dir, FOLDER, 'workorder.md'), 'utf8'), 'my steps\n');
});

test('a work order needs a plain name', () => {
  const dir = fresh('wo-');
  assert.equal(cli(dir, 'workorder').status, 2);
  assert.equal(cli(dir, 'workorder', '../out').status, 2);
  assert.ok(!existsSync(join(dir, '..', 'out')));
  // KWB-142: a flag is never a name; `workorder --help` wrote docs/workorders/--help/, and `new --help` would make a project of it
  assert.equal(cli(dir, 'workorder', '--help').status, 2);
  assert.ok(!existsSync(join(dir, 'docs', 'workorders', '--help')), 'nothing written for a flag');
  assert.equal(cli(dir, 'new', '--help').status, 2);
  assert.ok(!existsSync(join(dir, '--help')), 'no project made of a flag');
});

test('the prompt holds what two builds taught: nobody asked, decisions recorded, only a traced order obeyed, and an end on a DONE file', () => {
  const dir = fresh('wo-');
  cli(dir, 'workorder', 'billing');
  const prompt = readFileSync(join(dir, FOLDER, 'PROMPT.md'), 'utf8');
  for (const law of [/Never stop, never ask/, /decisions\.md/, /progress\.md/, /cannot trace/, /BLOCKED BY KIT/, /DONE/]) assert.match(prompt, law);
});

test('the runner says what it switches off, and stops when nothing moves', () => {
  const run = readFileSync(join(KIT, 'prompts/workorder/run.sh'), 'utf8');
  assert.match(run, /permission prompts off/);
  assert.match(run, /three sessions moved nothing/);
  // KWB-124: its sessions say nobody is there, so agents-held keeps their agents in the foreground
  assert.match(run, /^export CLAUDE_PACKS_UNATTENDED=1$/m);
  assert.match(README, /It runs Claude with permission prompts off/);
});

test('the runner dates its log with a format BSD and GNU date both take (KWB-95)', () => {
  // The user starts run.sh from their own terminal, which on a Mac has the BSD tools: GNU-only flags leave the log undated
  const run = readFileSync(join(KIT, 'prompts/workorder/run.sh'), 'utf8');
  for (const call of run.match(/\bdate\b[^)"|]*/g) ?? []) assert.doesNotMatch(call, /\s-(I|-iso|d\b|-date|R\b|-rfc)/, `GNU-only: ${call}`);
  assert.match(run, /date \+%Y-%m-%dT%H:%M:%S%z/);
});

// The runner in a scratch repo, with stand-ins on PATH: `claude` runs `session` (a bash body), and `npx` is the kit's pre-flight,
// `workorder check`, which exits `check` (0 passes the order, 1 refuses it).
function runOrder(prefix: string, session: string, { check = 0, env = {} }: { check?: number; env?: Readonly<Record<string, string>> } = {}): { dir: string; run: Spawned } {
  const dir = fresh(prefix);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  assert.equal(cli(dir, 'workorder', 'billing').status, 0);
  const bin = join(dir, '.bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'claude'), `#!/usr/bin/env bash\n${session}\n`, { mode: 0o755 });
  writeFileSync(join(bin, 'npx'), `#!/usr/bin/env bash\necho "check: $*" >> "${join(dir, '.checks')}"\nexit ${check}\n`, { mode: 0o755 });
  const run = spawnSync('bash', [join(dir, FOLDER, 'run.sh')], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ...env } });
  return { dir, run };
}

// KWB-98: each session's transcript holds the user's paths and name, so the runner's logs never reach git. The runner is run with
// a stand-in `claude` on PATH that writes the session's lines and the DONE file, and git sees nothing of logs/.
test('the runner keeps its session logs out of git (KWB-98)', () => {
  const { dir, run } = runOrder('wo-logs-', `echo '{"type":"system","cwd":"/home/someone"}'\ntouch "$PWD/${FOLDER}/DONE"`);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  // KWB-100: the first session starts before progress.md exists, and the runner says nothing about it
  assert.equal(run.stderr, '', run.stderr);
  assert.ok(existsSync(join(dir, FOLDER, 'logs/session-1.jsonl')), 'the session was logged');
  const seen = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: dir, encoding: 'utf8' });
  assert.doesNotMatch(seen, /logs\//, seen);
});

// KWB-125: a session refused for the account's usage limit moved nothing because it could not run, not because the work is stuck.
// The stand-in `claude` is refused four times, more than the three still sessions that stop a run, then finishes the order.
test('the runner waits out a usage limit and carries on, never counting it as a still session (KWB-125)', () => {
  const refused = '{"type":"result","is_error":true,"api_error_status":429,"api_error":"usage_limit_reached","result":"You have hit your weekly limit"}';
  const session = `echo x >> "$PWD/.calls"\nif [ "$(wc -l < "$PWD/.calls")" -le 4 ]; then echo '${refused}'; exit 1; fi\ntouch "$PWD/${FOLDER}/DONE"`;
  const { dir, run } = runOrder('wo-limit-', session, { env: { LIMIT_WAIT: '0' } });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.ok(existsSync(join(dir, FOLDER, 'DONE')), 'the order finished after the limit');
  const log = readFileSync(join(dir, FOLDER, 'logs/runner.log'), 'utf8');
  assert.equal(log.match(/usage limit/g)?.length, 4, log);
  assert.ok(existsSync(join(dir, FOLDER, 'logs/session-1.jsonl')), 'the session that ran is logged under its own number');
  assert.ok(!existsSync(join(dir, FOLDER, 'logs/session-2.jsonl')), 'a refused try is not a session');
});

// planner W2: the runner calls `workorder check` before its first session and starts none on a refusal.
test('the runner starts no session on an order workorder check refuses', () => {
  const { dir, run } = runOrder('wo-check-', `touch "$PWD/${FOLDER}/DONE"`, { check: 1 });
  assert.equal(run.status, 5, run.stdout + run.stderr);
  assert.match(readFileSync(join(dir, '.checks'), 'utf8'), /workorder check billing --dir /);
  assert.ok(!existsSync(join(dir, FOLDER, 'logs/session-1.jsonl')), 'no session started');
  assert.match(readFileSync(join(dir, FOLDER, 'logs/runner.log'), 'utf8'), /workorder check refused the order/);
  const passed = runOrder('wo-check-ok-', `touch "$PWD/${FOLDER}/DONE"`);
  assert.equal(passed.run.status, 0, passed.run.stdout + passed.run.stderr);
  assert.ok(existsSync(join(passed.dir, '.checks')), 'the check ran before the first session');
  const prompt = readFileSync(join(dir, FOLDER, 'PROMPT.md'), 'utf8');
  assert.match(prompt, /run `npx @thedecipherist\/claude-packs workorder check billing`/, 'the prompt runs it too, in the project\'s own form');
});

// 1.5.11: a rebuild of a hardware instrument starts from the steps four rebuilds taught, not a blank order.
test('workorder --template rebuild writes the rebuild steps; an unknown template writes nothing', () => {
  const dir = fresh('wo-rebuild-');
  assert.equal(cli(dir, 'workorder', 'rebuild', '--template', 'rebuild').status, 0);
  const order = readFileSync(join(dir, 'docs/workorders/rebuild/workorder.md'), 'utf8');
  assert.match(order, /^# Work order: the <maker> <machine>, rebuilt/);
  assert.match(order, /## W5\. The oracle/);
  assert.doesNotMatch(order, /\{\{(name|date)\}\}/, 'the name and the date are filled in');
  assert.ok(existsSync(join(dir, 'docs/workorders/rebuild/PROMPT.md')) && existsSync(join(dir, 'docs/workorders/rebuild/run.sh')));
  const plain = fresh('wo-plain-');
  assert.equal(cli(plain, 'workorder', 'billing').status, 0);
  const blank = readFileSync(join(plain, FOLDER, 'workorder.md'), 'utf8');
  assert.match(blank, /^# Work order: billing/, 'the plain form keeps the blank steps');
  // the template carries {{kit}} since W7 (b), filled with the project's own form of the kit's command (KWB-192)
  assert.equal(blank, readFileSync(join(KIT, `${TEMPLATES}/generic.md`), 'utf8').replaceAll('{{name}}', 'billing').replaceAll('{{kit}}', kitCommand(plain)).replace(/\{\{date\}\}/, blank.match(/Written (\S+)\./)?.[1] ?? ''), 'no flag is generic');
  const bad = fresh('wo-bad-');
  const r = cli(bad, 'workorder', 'x', '--template', 'nope');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /generic, plugin, rebuild/, 'the refusal names the templates there are');
  assert.ok(!existsSync(join(bad, 'docs/workorders/x')), 'nothing was written');
});

// planner W1: the three templates, chosen by --template and never by configuration (d-1).
test('each template writes from a scratch folder with nothing left to fill in by the kit', () => {
  const dir = fresh('wo-each-');
  for (const t of ['generic', 'plugin', 'rebuild']) {
    assert.equal(cli(dir, 'workorder', t, '--template', t).status, 0, t);
    for (const file of ['workorder.md', 'PROMPT.md', 'run.sh']) assert.doesNotMatch(readFileSync(join(dir, 'docs/workorders', t, file), 'utf8'), /\{\{/, `${t}/${file}`);
  }
});

const HTML_NEVER = '- Prototype the panel or a page in HTML or a web page: it is a second design that drifts from the first. The reference picture is measured into numbers and the panel is drawn in code from that table.';
const template = (t: string): string => readFileSync(join(KIT, `${TEMPLATES}/${t}.md`), 'utf8');
const unfenced = (text: string): string => text.replace(/^```[\s\S]*?^```/gm, '').replace(/<\/?constraints>/g, '');

test('the plugin template is the house decided: no angle bracket from the stack on, the HTML line, the install block', () => {
  const text = template('plugin');
  const fixed = unfenced(text.slice(text.indexOf('**The stack.**')));
  assert.ok(text.includes('**The stack.**'));
  assert.doesNotMatch(fixed, /[<>]/, `a placeholder in the decided text: ${fixed.match(/.*[<>].*/)?.[0]}`);
  assert.ok(text.includes(HTML_NEVER), 'the HTML line in its Never list');
  assert.match(text, /^```claude-packs\nconfiguration: synth-creator\n/m, 'the install block');
});

// The source's markers, read from the synced claude.ai template (workorder-writer/templates/workorder-rebuild.md) on 2026-11-09.
const REBUILD_IFS = ['...', 'the firmware computes the sound or the control', 'a real unit is owned', "a sibling model's firmware is mapped", 'the firmware computes the sound or the control',
  'digital', 'analogue', 'a real unit is owned', 'it has one', 'it takes microcode and has no data sheet', 'W10 ran and recordings exist'];

test('the rebuild template keeps every [if marker its source has, the HTML line and an install block', () => {
  const text = template('rebuild');
  assert.deepEqual([...text.matchAll(/\*\*\[if ([^\]]*)\]\*\*/g)].map((m) => m[1]), REBUILD_IFS);
  assert.ok(text.includes(HTML_NEVER), 'the HTML line in its Never list');
  assert.match(text, /^```claude-packs\nconfiguration: synth-creator\n/m, 'the install block');
});

// KWB-128: the prompt held a branch per step and a full suite at the end, both against the kit's own laws.
test('the prompt lands one branch per order and gates it with the tests the branch reaches (KWB-128)', () => {
  const prompt = readFileSync(join(KIT, 'prompts/workorder/PROMPT.md'), 'utf8');
  assert.doesNotMatch(prompt, /work\/W<n>|full test suite|whole suite/);
  assert.match(prompt, /one branch for this order, `work\/\{\{name\}\}`/);
  assert.match(prompt, /tests the branch's changes reach/);
});

// Every skill, rule and tool the rebuild template names is one the kit has, so a run never looks for one that is not there.
test('the rebuild template names only skills, rules and tools the kit has', () => {
  const text = template('rebuild');
  // **The foundation** lists them as "its skills `a`, `b`; its tool `c`; and its rules `d` and `e`."
  const named = (kind: string): string[] => [...text.matchAll(new RegExp(`its ${kind} ([^;.]*)`, 'g'))].flatMap((m) => [...(m[1] ?? '').matchAll(/`([\w-]+)`/g)].map((n) => n[1] ?? ''));
  const have = (kind: string, name: string): boolean => readdirSync(join(KIT, 'packs')).some((p) => existsSync(join(KIT, 'packs', p, kind, name)));
  const skills = named('skills');
  assert.ok(skills.length >= 10, `the foundation names its skills: ${skills}`);
  for (const s of skills) assert.ok(have('skills', s), `skill ${s}`);
  for (const r of [...named('rules'), 'test-the-template-once']) assert.ok(have('rules', `${r}.md`), `rule ${r}`);
  for (const t of named('tool')) assert.ok(have('tools', `${t}.mjs`), `tool ${t}`);
});

test('a new project with no packs named takes base alone, never a synth pack (KWB-84)', () => {
  const parent = fresh('new-');
  const r = spawnSync('node', [CLI, 'new', 'shop', '--dir', parent], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual((JSON.parse(readFileSync(join(parent, 'shop/.claude/claude-packs.lock.json'), 'utf8')) as { packs: string[] }).packs, ['base']);
});

test('a new reader meets the benefits first, and every file the page says a project keeps is one the kit names', () => {
  assert.ok(README.indexOf('https://www.npmjs.com/package/@thedecipherist/claude-packs') < README.indexOf('## Getting started'), 'the npm link is at the top');
  assert.ok(README.indexOf('## Getting started') < README.indexOf('## See it work'));
  for (const heading of ['## What a project keeps', '## How it is tested', '## Let it build on its own']) assert.ok(README.includes(heading), heading);
  const made = readFileSync(join(KIT, 'lib/new.mts'), 'utf8');
  for (const file of ['CLAUDE.md', 'build.md', 'bugs.md', 'workflow-bugs.md', 'docs/versions.md']) assert.ok(made.includes(file), file);
  const logged = readFileSync(join(KIT, 'packs/base/hooks/lib/event-log.mts'), 'utf8') + readFileSync(join(KIT, 'packs/base/hooks/lib/hook-log.mts'), 'utf8');
  for (const file of ['events.jsonl', 'refusals.jsonl', 'crashes.jsonl', 'hooks.log']) assert.ok(logged.includes(file), file);
});

test('every template ends its build with the README, written by its skill, before the last review (1.7.1)', () => {
  // the user: "a final step when the UI is completed that a full pro README.md is made with a screnshot of the unit on top"
  for (const name of ['plugin', 'rebuild', 'generic']) {
    const text = readFileSync(join(KIT, TEMPLATES, `${name}.md`), 'utf8');
    const steps = [...text.matchAll(/^## W(\d+)\. (.+)$/gm)].map((m) => ({ n: Number(m[1]), title: m[2] ?? '' }));
    const readme = steps.find((s) => s.title === 'The README');
    assert.ok(readme, `${name}: a README step`);
    const review = steps.find((s) => /^Before (you call it|calling it) finished/.test(s.title));
    assert.ok(review, `${name}: a last review step`);
    assert.equal(review.n, readme.n + 1, `${name}: the README comes right before the last review`);
    assert.deepEqual(steps.map((s) => s.n), steps.map((_, i) => i), `${name}: the steps are numbered in order, none skipped`);
    const body = text.slice(text.indexOf(`## W${readme.n}. The README`), text.indexOf(`## W${review.n}.`));
    assert.match(body, /`write-the-readme`/, `${name}: names the skill`);
    assert.match(body, /renders of itself/, `${name}: screenshots of the product itself`);
    assert.match(body, /never a mock-up/, `${name}: never a mock-up`);
  }
  assert.ok(existsSync(join(KIT, 'packs/base/skills/write-the-readme/SKILL.md')), 'the skill it names is in base');
});
