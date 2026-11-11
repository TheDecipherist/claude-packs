// claude-packs fix: a scan's findings as a work order Claude can follow, step by step, with the kit's own laws. Each finding is a box to tick,
// in the order a senior engineer would fix them: what can leak first, what loses data next, then the copies, then the rest.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { put, readText } from '../packs/base/hooks/lib/files.mts';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { kitCommand } from './kit-command.mts';
import type { NearCopyRow, RemadeName, Repeat } from './repeats.mts';
import { pointerOf, scan } from './scan.mts';
import type { ScanPick, ScanResult, ScanSecret } from './scan.mts';

/** `claude-packs-scan.json`, as a scan writes it; every part optional, since a plan is made from whatever the file holds. */
export interface ScanFile {
  pick?: { config?: string; packs?: readonly Pick<ScanPick['packs'][number], 'pack'>[] };
  secrets?: readonly ScanSecret[];
  results?: readonly ScanResult[];
  repeats?: readonly Repeat[];
  near?: readonly NearCopyRow[];
  remade?: readonly RemadeName[];
  longFiles?: readonly string[];
  weight?: { big?: readonly { file: string; mb: number }[]; rootImages?: readonly string[] };
}

const box = (text: string): string => `- [ ] ${text}`;
const code = (text: unknown): string => `\`${String(text).replace(/`/g, "'")}\``;

function checksOf(results: readonly ScanResult[], kind: string): string[] {
  return results.filter((r) => r.kind === kind).sort((a, b) => b.hits.length - a.hits.length)
    .flatMap((r) => [`### ${r.id} (${r.hits.length})`, '', r.why, r.rule ? `Law: \`${r.rule}\`` : '', '', ...r.hits.map((h) => box(`${h.file}:${h.line}: ${code(h.text)}`)), ''].filter((l, i, a) => l !== '' || a[i - 1] !== ''));
}

const section = (title: string, intro: string, lines: readonly string[]): string[] => (lines.length ? [`## ${title}`, '', intro, '', ...lines, ''] : []);

function repeatBox(r: Repeat): string {
  const differs = r.parameters?.length ? ` Differs in: ${r.parameters.map(code).join(', ')}.` : '';
  return box(`${r.copies} copies of ${r.what}: ${r.at.join(', ')}. Make it ${r.template}.${differs}`);
}

/** The fix plan's text for a project, from its scan. */
export function planText(dir: string, s: ScanFile): string {
  const CLI = kitCommand(dir);
  const packs = (s.pick?.packs ?? []).map((p) => p.pack);
  const howMany = (s.secrets?.length ?? 0) + (s.results ?? []).reduce((n, r) => n + r.hits.length, 0) + (s.repeats?.length ?? 0) + (s.near?.length ?? 0) + (s.remade?.length ?? 0) + (s.longFiles?.length ?? 0);
  return [
    '# Fix plan', '',
    `A work order from the scan of ${dir}: ${howMany} finding(s). Work it from the top; each box is one fix. Skill: \`fix-from-scan\`.`, '',
    '## How to work this plan', '',
    '- A finding is a candidate, not a fact. Read the code first. If it is not real, tick the box and say why on its line.',
    '- One work branch per section, pushed from its first commit. Commit each fix by name.',
    '- A bug gets a failing test first (`bug-fix-starts-red`). Run only the tests a change reaches; when the section is done, the tests its changes reach against the trunk, then land it.',
    '- Never change a behaviour to quiet a finding. Ask when the fix would change what users see.', '',
    '## 0. Install the kit', '',
    box(`${CLI} init --auto${s.pick?.config ? ` (configuration ${s.pick.config}${packs.length ? `, packs ${packs.join(', ')}` : ''})` : ''}`),
    box('Fit `.claude/layout.json` to the project, then run `doctor --strict`'), '',
    ...section('1. Secrets', 'Any that is real has leaked: rotate it first, then move it to an ignored `.env` and read it by name.', (s.secrets ?? []).map((x) => box(`${x.file}:${x.line}: ${x.name}`))),
    ...section('2. Security', 'What an attacker can reach.', checksOf(s.results ?? [], 'security')),
    ...section('3. Failures and lost data', 'What breaks in production, or loses work silently.', checksOf(s.results ?? [], 'failures and lost data')),
    ...section('4. Copies become templates', 'Largest first, with `make-it-a-template`: take the copies out, then write the one template, then test it once.', [
      ...(s.near ?? []).map((n) => box(`${n.file}:${n.line} is close to ${n.other}:${n.from}-${n.to} (${n.matched} of ${n.of} statements). Make it one function.`)),
      ...(s.repeats ?? []).map(repeatBox),
      ...(s.remade ?? []).map((m) => box(`${m.name} is defined ${m.at.length} times: ${m.at.join(', ')}. Keep one and call it, or name each for its job.`)),
    ]),
    ...section('5. Quality', 'Group by check: one law, fixed everywhere at once.', checksOf(s.results ?? [], 'quality')),
    ...section('6. Long files', 'Split by what the code does, so each file has one job.', (s.longFiles ?? []).map((f) => box(f))),
    ...section('7. Repo weight', 'Move these out of git: to object storage, a release, or the bin.', [...(s.weight?.big ?? []).map((b) => box(`${b.file}: ${b.mb} MB`)), ...(s.weight?.rootImages ?? []).map((f) => box(f))]),
    ...section('8. Public text', 'Read it as the author. Dates and quotes that are facts stay.', checksOf(s.results ?? [], 'public text')),
    '## 9. What no check can see', '',
    box(`Run the review: ${code(`${CLI} scan --prompt`)}. Its findings become boxes here.`), '',
    '## Done when', '',
    `Every box is ticked, and ${code(`${CLI} scan`)} finds nothing new. What it still lists has its reason written here.`, '',
  ].join('\n');
}

export interface FixPlanOptions { from?: string | null; out?: string | null; log?: Logger }

/** Writes `.claude/fix-plan.md` (or `out`) from the scan `from` names, else the project's last scan, else a scan made now; the file. */
export async function fixPlan(dir: string, { from = null, out = null, log = console.log }: FixPlanOptions = {}): Promise<string> {
  const pointer = pointerOf(dir);
  let json = from ?? (existsSync(pointer) ? (readText(pointer) ?? '').trim() : null);
  if (!json || !existsSync(json)) json = join((await scan(dir, { log: () => {} })).copy, 'claude-packs-scan.json');
  const found = readJson<ScanFile>(json);
  if (found === null) throw new Error(`${json} is not valid JSON: run the scan again`);
  const file = out ?? join(dir, '.claude/fix-plan.md');
  put(file, planText(dir, found));
  log(`Fix plan: ${file}`);
  log('Give it to Claude: "work through .claude/fix-plan.md" (skill: fix-from-scan).');
  return file;
}
