// `claude-packs workorder check <name>`: the pre-flight a run passes before its first session, so a run never starts on an order that
// cannot finish (planner W2). It reads docs/workorders/<name>/workorder.md and refuses, naming each: a placeholder left, a step with no
// measured Done when, a skill the project has not installed, and a red `doctor --strict`. An order with no install block is warned.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { doctor } from './doctor.mts';
import type { DoctorOptions } from './doctor.mts';
import { readLock } from './manifest.mts';
import { ghidraRefusals } from './ghidra-check.mts';
import { installBlockOf } from './install-block.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const FENCE = /^\s*(```|~~~)/;
// What is markup, not a placeholder: the constraints tags every order carries, and an HTML comment.
const NOT_PLACEHOLDER = /^<\/?constraints>$|^<!--/;
// A path to a test: a file in a test folder, or a file named as a test.
const TEST_PATH = /\b[\w./-]*tests?\/[\w./-]+|\b[\w./-]+[._-]test\.\w+/;

/** Where a skill the kit knows by name lives: in a pack, or in the planner (claude.ai's side). */
export interface KitSkill { pack?: string; planner?: boolean }

/** Every skill the kit knows by name: a pack's skill, or a planner skill (claude.ai's side, never installed in a project). */
export function kitSkills(): Map<string, KitSkill> {
  const skills = new Map<string, KitSkill>();
  for (const pack of readdirSync(join(KIT, 'packs'))) {
    const dir = join(KIT, 'packs', pack, 'skills');
    if (existsSync(dir)) for (const s of readdirSync(dir)) skills.set(s, { pack });
  }
  for (const s of readdirSync(join(KIT, 'planner'), { withFileTypes: true })) if (s.isDirectory()) skills.set(s.name, { planner: true });
  return skills;
}

/** One line of the order, with its number and whether it is inside a code fence. */
interface OrderLine { n: number; line: string; fenced: boolean }

// The order's lines with their numbers, each marked as inside a code fence or not.
function orderLines(text: string): OrderLine[] {
  let fenced = false;
  return text.split('\n').map((line, i) => {
    const fence = FENCE.test(line);
    const inside = fenced || fence;
    if (fence) fenced = !fenced;
    return { n: i + 1, line, fenced: inside };
  });
}

const placeholders = (lines: readonly OrderLine[]): string[] => lines.filter((l) => !l.fenced).flatMap((l) => [...l.line.matchAll(/<[^<>\n]+>/g)]
  .map((m) => m[0]).filter((p) => !NOT_PLACEHOLDER.test(p)).map((p) => `line ${l.n}: a placeholder is left: ${p}`));

/** A step's Done when: where it starts and its text, the line and what follows it up to a blank line. */
interface Done { n: number; text: string }

// Each `## W` step and its Done when: there must be one, and it must hold a number or a path to a test. Its text is the line and
// what follows it up to a blank line, so a Done when written as a list under the line is read whole.
function doneWhens(lines: readonly OrderLine[]): string[] {
  const steps: { head: OrderLine; done: Done | null }[] = [];
  let open: Done | null = null;
  for (const l of lines) {
    if (open && (l.line.trim() === '' || l.fenced)) open = null;
    if (open) open.text += `\n${l.line}`;
    if (l.fenced) continue;
    const last = steps.at(-1);
    if (/^## W\d/.test(l.line)) steps.push({ head: l, done: null });
    else if (last && !last.done && /^\*\*Done when:\*\*/.test(l.line)) {
      open = { n: l.n, text: l.line.replace(/^\*\*Done when:\*\*/, '') };
      last.done = open;
    }
  }
  return steps.flatMap(({ head, done }) => {
    const step = head.line.replace(/^##\s*/, '');
    if (!done) return [`line ${head.n}: step "${step}" has no **Done when:** line`];
    return /\d/.test(done.text) || TEST_PATH.test(done.text) ? []
      : [`line ${done.n}: the Done when of "${step}" holds no number and no path to a test, so nothing can measure it`];
  });
}

const installedSkill = (dir: string, files: readonly string[], name: string): boolean => existsSync(join(dir, '.claude', 'skills', name, 'SKILL.md'))
  || files.some((f) => f.endsWith(`.claude/skills/${name}/SKILL.md`));

// Every skill the order names in backticks that the kit has: installed in the project, or the pack to add is named.
function missingSkills(dir: string, lines: readonly OrderLine[]): string[] {
  const known = kitSkills();
  const files = Object.keys(readLock(join(dir, '.claude')).files);
  const named = new Map<string, number>();
  for (const l of lines) for (const m of l.line.matchAll(/`([a-z0-9-]+)`/g)) { const name = m[1]; if (name && known.has(name) && !named.has(name)) named.set(name, l.n); }
  const byPack = new Map<string | null, string[]>();
  for (const [name, n] of named) {
    if (installedSkill(dir, files, name)) continue;
    const pack = known.get(name)?.pack ?? null;
    byPack.set(pack, [...(byPack.get(pack) ?? []), `\`${name}\` (line ${n})`]);
  }
  return [...byPack].map(([pack, names]) => (pack
    ? `not installed here: ${names.join(', ')}; \`add ${pack}\` brings ${names.length > 1 ? 'them' : 'it'}`
    : `planner skills for claude.ai, which a run in Claude Code cannot use: ${names.join(', ')}`));
}

export const hasInstallBlock = (text: string): boolean => /^\s*```claude-packs\s*$/m.test(text);

export interface CheckOptions { withDoctor?: boolean; env?: DoctorOptions['env'] }

/** The refusals and warnings for one order, in a project. `withDoctor` false leaves doctor out (an order just written, mid set-up). */
export async function checkWorkorder(dir: string, name: string, { withDoctor = true, env }: CheckOptions = {}): Promise<{ refusals: string[]; warnings: string[] }> {
  const text = readText(join(dir, 'docs', 'workorders', name, 'workorder.md'));
  if (text === null) throw new Error(`no work order at docs/workorders/${name}/workorder.md`);
  const lines = orderLines(text);
  // what the install block asks of the tools is checked before the run; a broken block is init's to refuse, not this check's
  const wanted = (() => { try { return installBlockOf(text).ghidra; } catch { return []; } })();
  const refusals = [...placeholders(lines), ...doneWhens(lines), ...missingSkills(dir, lines), ...ghidraRefusals(wanted, env ?? process.env)];
  if (withDoctor) {
    const said: string[] = [];
    if (await doctor(dir, (l) => said.push(String(l)), { strict: true, ...(env ? { env } : {}) }) !== 0) {
      refusals.push(`doctor --strict is red: ${said.filter((l) => /PROBLEM/.test(l)).map((l) => l.trim()).join('; ') || said.at(-1)}`);
    }
  }
  const warnings = hasInstallBlock(text) ? [] : ['no install block (a ```claude-packs fence): the run cannot install from the order'];
  return { refusals, warnings };
}

export interface WorkorderCheckOptions extends CheckOptions { log?: Logger }

/** The `workorder check <name>` command: prints each warning and refusal, and a closing line; 1 when anything is refused. */
export async function workorderCheck(dir: string, name: string | undefined, { log = console.log, withDoctor = true, env }: WorkorderCheckOptions = {}): Promise<number> {
  if (!name) throw new Error('name the work order: `workorder check <name>`');
  const { refusals, warnings } = await checkWorkorder(dir, name, { withDoctor, ...(env ? { env } : {}) });
  for (const w of warnings) log(`  WARNING: ${w}`);
  for (const r of refusals) log(`  REFUSED: ${r}`);
  log(refusals.length ? `workorder check ${name}: ${refusals.length} refusal(s); a run cannot start until each is fixed`
    : `workorder check ${name}: OK${withDoctor ? '' : ' (doctor not run)'}`);
  return refusals.length ? 1 : 0;
}
