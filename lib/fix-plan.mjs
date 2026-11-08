// claude-packs fix: a scan's findings as a work order Claude can follow, step by step, with the kit's own laws. Each finding is a box to tick,
// in the order a senior engineer would fix them: what can leak first, what loses data next, then the copies, then the rest.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { kitCommand } from './kit-command.mjs';
import { scan } from './scan.mjs';

const pointerOf = (dir) => join(tmpdir(), `claude-packs-last-scan-${createHash('sha256').update(resolve(dir)).digest('hex').slice(0, 12)}`);
export const rememberScan = (dir, json) => writeFileSync(pointerOf(dir), json);

const box = (text) => `- [ ] ${text}`;
const code = (text) => `\`${String(text).replace(/`/g, "'")}\``;

function checksOf(results, kind) {
  return results.filter((r) => r.kind === kind).sort((a, b) => b.hits.length - a.hits.length)
    .flatMap((r) => [`### ${r.id} (${r.hits.length})`, '', r.why, r.rule ? `Law: \`${r.rule}\`` : '', '', ...r.hits.map((h) => box(`${h.file}:${h.line}: ${code(h.text)}`)), ''].filter((l, i, a) => l !== '' || a[i - 1] !== ''));
}

const section = (title, intro, lines) => (lines.length ? [`## ${title}`, '', intro, '', ...lines, ''] : []);

function repeatBox(r) {
  const differs = r.parameters?.length ? ` Differs in: ${r.parameters.map(code).join(', ')}.` : '';
  return box(`${r.copies} copies of ${r.what}: ${r.at.join(', ')}. Make it ${r.template}.${differs}`);
}

export function planText(dir, s) {
  const CLI = kitCommand(dir);
  const packs = [...(s.pick?.packs ?? []).map((p) => p.pack)];
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

export async function fixPlan(dir, { from = null, out = null, log = console.log } = {}) {
  const pointer = pointerOf(dir);
  let json = from ?? (existsSync(pointer) ? readFileSync(pointer, 'utf8').trim() : null);
  if (!json || !existsSync(json)) json = join((await scan(dir, { log: () => {} })).copy, 'claude-packs-scan.json');
  const file = out ?? join(dir, '.claude/fix-plan.md');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, planText(dir, JSON.parse(readFileSync(json, 'utf8'))));
  log(`Fix plan: ${file}`);
  log('Give it to Claude: "work through .claude/fix-plan.md" (skill: fix-from-scan).');
  return file;
}
