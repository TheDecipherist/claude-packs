// `claude-packs workorder check <name>`: the pre-flight a run passes before its first session, so a run never starts on an order that
// cannot finish (planner W2). It reads docs/workorders/<name>/workorder.md and refuses, naming each: a placeholder left, a step with no
// measured Done when, a skill the project has not installed, and a red `doctor --strict`. An order with no install block is warned.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor } from './doctor.mjs';
import { readLock } from './manifest.mjs';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const FENCE = /^\s*(```|~~~)/;
// What is markup, not a placeholder: the constraints tags every order carries, and an HTML comment.
const NOT_PLACEHOLDER = /^<\/?constraints>$|^<!--/;
// A path to a test: a file in a test folder, or a file named as a test.
const TEST_PATH = /\b[\w./-]*tests?\/[\w./-]+|\b[\w./-]+[._-]test\.\w+/;

// Every skill the kit knows by name: a pack's skill, or a planner skill (claude.ai's side, never installed in a project).
export function kitSkills() {
  const skills = new Map();
  for (const pack of readdirSync(join(KIT, 'packs'))) {
    const dir = join(KIT, 'packs', pack, 'skills');
    if (existsSync(dir)) for (const s of readdirSync(dir)) skills.set(s, { pack });
  }
  for (const s of readdirSync(join(KIT, 'planner'), { withFileTypes: true })) if (s.isDirectory()) skills.set(s.name, { planner: true });
  return skills;
}

// The order's lines with their numbers, each marked as inside a code fence or not.
function orderLines(text) {
  let fenced = false;
  return text.split('\n').map((line, i) => {
    const fence = FENCE.test(line);
    const inside = fenced || fence;
    if (fence) fenced = !fenced;
    return { n: i + 1, line, fenced: inside };
  });
}

const placeholders = (lines) => lines.filter((l) => !l.fenced).flatMap((l) => [...l.line.matchAll(/<[^<>\n]+>/g)]
  .map((m) => m[0]).filter((p) => !NOT_PLACEHOLDER.test(p)).map((p) => `line ${l.n}: a placeholder is left: ${p}`));

// Each `## W` step and its Done when: there must be one, and it must hold a number or a path to a test. Its text is the line and
// what follows it up to a blank line, so a Done when written as a list under the line is read whole.
function doneWhens(lines) {
  const steps = [];
  let open = null;
  for (const l of lines) {
    if (open && (l.line.trim() === '' || l.fenced)) open = null;
    if (open) open.text += `\n${l.line}`;
    if (l.fenced) continue;
    if (/^## W\d/.test(l.line)) steps.push({ head: l, done: null });
    else if (steps.length && !steps.at(-1).done && /^\*\*Done when:\*\*/.test(l.line)) {
      open = { n: l.n, text: l.line.replace(/^\*\*Done when:\*\*/, '') };
      steps.at(-1).done = open;
    }
  }
  return steps.flatMap(({ head, done }) => {
    const step = head.line.replace(/^##\s*/, '');
    if (!done) return [`line ${head.n}: step "${step}" has no **Done when:** line`];
    return /\d/.test(done.text) || TEST_PATH.test(done.text) ? []
      : [`line ${done.n}: the Done when of "${step}" holds no number and no path to a test, so nothing can measure it`];
  });
}

const installedSkill = (dir, files, name) => existsSync(join(dir, '.claude', 'skills', name, 'SKILL.md'))
  || files.some((f) => f.endsWith(`.claude/skills/${name}/SKILL.md`));

// Every skill the order names in backticks that the kit has: installed in the project, or the pack to add is named.
function missingSkills(dir, lines) {
  const known = kitSkills();
  const files = Object.keys(readLock(join(dir, '.claude')).files ?? {});
  const named = new Map();
  for (const l of lines) for (const m of l.line.matchAll(/`([a-z0-9-]+)`/g)) if (known.has(m[1]) && !named.has(m[1])) named.set(m[1], l.n);
  const byPack = new Map();
  for (const [name, n] of named) if (!installedSkill(dir, files, name)) byPack.set(known.get(name).pack ?? null, [...(byPack.get(known.get(name).pack ?? null) ?? []), `\`${name}\` (line ${n})`]);
  return [...byPack].map(([pack, names]) => (pack
    ? `not installed here: ${names.join(', ')}; \`add ${pack}\` brings ${names.length > 1 ? 'them' : 'it'}`
    : `planner skills for claude.ai, which a run in Claude Code cannot use: ${names.join(', ')}`));
}

export const hasInstallBlock = (text) => /^\s*```claude-packs\s*$/m.test(text);

// The refusals and warnings for one order, in a project. `withDoctor` false leaves doctor out (an order just written, mid set-up).
export async function checkWorkorder(dir, name, { withDoctor = true } = {}) {
  const file = join(dir, 'docs', 'workorders', name, 'workorder.md');
  if (!existsSync(file)) throw new Error(`no work order at docs/workorders/${name}/workorder.md`);
  const text = readFileSync(file, 'utf8');
  const lines = orderLines(text);
  const refusals = [...placeholders(lines), ...doneWhens(lines), ...missingSkills(dir, lines)];
  if (withDoctor) {
    const said = [];
    if (await doctor(dir, (l) => said.push(String(l)), { strict: true }) !== 0) {
      refusals.push(`doctor --strict is red: ${said.filter((l) => /PROBLEM/.test(l)).map((l) => l.trim()).join('; ') || said.at(-1)}`);
    }
  }
  const warnings = hasInstallBlock(text) ? [] : ['no install block (a ```claude-packs fence): the run cannot install from the order'];
  return { refusals, warnings };
}

export async function workorderCheck(dir, name, { log = console.log, withDoctor = true } = {}) {
  if (!name) throw new Error('name the work order: `workorder check <name>`');
  const { refusals, warnings } = await checkWorkorder(dir, name, { withDoctor });
  for (const w of warnings) log(`  WARNING: ${w}`);
  for (const r of refusals) log(`  REFUSED: ${r}`);
  log(refusals.length ? `workorder check ${name}: ${refusals.length} refusal(s); a run cannot start until each is fixed`
    : `workorder check ${name}: OK${withDoctor ? '' : ' (doctor not run)'}`);
  return refusals.length ? 1 : 0;
}
