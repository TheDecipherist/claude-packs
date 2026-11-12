// Which of a project's agent tasks are fit to do again, and the draw of five (W11.0). Reads a git repository, never writes in it.
//   node scripts/ab-pick.mts --repo ~/projects/bandwarp --seed 20261112 [--trunk work/bandwarp] [--out build/evidence/W11/ab-pick.md] [--json FILE]
// A task qualifies when its agent has a brief (a section in briefs/*.md, or a status file in agents/), a merge commit on the trunk,
// and a progress line that names the agent or its step beside a gate. One each of ui-panel, ui-settings, dsp and presets is drawn,
// then one from the rest; a kind with no qualifying task is said so, and the draw is filled from what qualifies.
import { put } from '../packs/base/hooks/lib/files.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { isRecord, parseJson, toJson } from '../packs/base/hooks/lib/json.mts';
import { flag, git, gitOk } from './ab-args.mts';

export type Kind = 'ui-panel' | 'ui-settings' | 'dsp' | 'presets' | 'rest';
export interface Task {
  name: string; branch: string; step: string; kind: Kind; base: string | null; tip: string;
  brief: string | null; merge: string | null; progress: string | null; qualifies: boolean; why: string;
  /** Whether its base holds the commit that made the tree build on this machine (null when not asked). */
  buildsHere: boolean | null;
}

export const KINDS: [Kind, RegExp][] = [['ui-panel', /^W8/], ['ui-settings', /^W9/], ['presets', /^W11/], ['dsp', /^(?:W3|W4b|B-102)/]];
const WORK = 'docs/workorders/bandwarp';
const DEFAULT_WANT = 5;
const HASH_RANGE = 4294967296;

export const kindOf = (step: string): Kind => KINDS.find(([, re]) => re.test(step))?.[0] ?? 'rest';

/** The step ids a status file names ("W3b-W3f", "B-102", "W4b"). */
export const stepIds = (step: string): string[] => [...new Set(step.match(/W\d+[a-z]?|B-\d+/g) ?? [])];

/** The first progress line that names the agent or one of its steps beside a gate or a measure. */
function progressLine(progress: string, name: string, ids: string[]): string | null {
  const named = (l: string): boolean => l.includes(`agent ${name}`) || ids.some((id) => new RegExp(`\\b${id}(?![0-9a-z])`).test(l));
  return progress.split('\n').find((l) => l.startsWith('- ') && named(l) && /gate|measured|twin/i.test(l)) ?? null;
}

const nonEmpty = (text: string): string[] => text.split('\n').filter((l) => l !== '');

/** The status file of an agent on its branch: the json in agents/ whose name is the agent's. */
function statusOf(repo: string, branch: string, name: string): { file: string | null; step: string } {
  for (const file of nonEmpty(git(repo, ['ls-tree', '--name-only', branch, `${WORK}/agents/`]))) {
    const json = parseJson<unknown>(git(repo, ['show', `${branch}:${file}`]));
    if (isRecord(json) && json['name'] === name) return { file, step: typeof json['step'] === 'string' ? json['step'] : '' };
  }
  return { file: null, step: '' };
}

/** Every agent branch of the project, with what is known of it from git alone. */
export function listTasks(repo: string, trunk: string, buildsFrom: string | null = null): Task[] {
  // the agent's first commit is the oldest on its branch's first-parent chain that the trunk's own chain lacks
  const onTrunk = new Set(nonEmpty(git(repo, ['rev-list', '--first-parent', trunk])));
  const progress = git(repo, ['show', `${trunk}:${WORK}/progress.md`]);
  const briefs = nonEmpty(git(repo, ['ls-tree', '--name-only', trunk, `${WORK}/briefs/`]))
    .map((file) => ({ file, text: git(repo, ['show', `${trunk}:${file}`]) }));
  const branches = nonEmpty(git(repo, ['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin/work/bandwarp-*']));
  return branches.map((branch): Task => {
    const name = branch.replace('origin/work/bandwarp-', '');
    const { file, step } = statusOf(repo, branch, name);
    const section = briefs.find((b) => new RegExp(`^## ${name}\\b`, 'm').test(b.text));
    const first = nonEmpty(git(repo, ['rev-list', '--first-parent', '--reverse', branch])).find((c) => !onTrunk.has(c)) ?? '';
    const tip = git(repo, ['rev-parse', branch]);
    const merged = gitOk(repo, ['merge-base', '--is-ancestor', tip, trunk]);
    const merge = merged ? (nonEmpty(git(repo, ['log', '--merges', '--ancestry-path', '--reverse', '--format=%h %s', `${tip}..${trunk}`]))[0] ?? null) : null;
    const line = progressLine(progress, name, stepIds(step));
    const brief = section ? `${section.file} (section "${name}")` : file;
    const missing = [brief === null ? 'no brief' : '', merge === null ? 'not merged into the trunk' : '', line === null ? 'no progress line with a gate' : ''].filter((m) => m !== '');
    return {
      name, branch, step, kind: kindOf(step), base: first === '' ? null : (git(repo, ['rev-parse', `${first}^`]) || null), tip,
      brief, merge, progress: line, qualifies: missing.length === 0, why: missing.length === 0 ? 'brief, merge and gate line all found' : missing.join('; '),
      buildsHere: buildsFrom === null ? null : first !== '' && gitOk(repo, ['merge-base', '--is-ancestor', buildsFrom, `${first}^`]),
    };
  });
}

/** mulberry32: a small seeded generator, so the same seed draws the same five. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / HASH_RANGE;
  };
}

export interface Draw { picks: { task: Task; slot: string }[]; notes: string[] }

/** One of each named kind, then one from the rest, then (while fewer than `want`) any that qualify and were not drawn. */
export function draw(tasks: Task[], seed: number, want = DEFAULT_WANT, eligible: (t: Task) => boolean = (t) => t.qualifies): Draw {
  const rand = seeded(seed);
  const ok = tasks.filter(eligible);
  const picks: Draw['picks'] = [];
  const notes: string[] = [];
  const take = (pool: Task[], slot: string): void => {
    const free = pool.filter((t) => !picks.some((p) => p.task === t));
    const t = free[Math.floor(rand() * free.length)];
    if (t !== undefined) picks.push({ task: t, slot });
  };
  for (const [kind] of KINDS) {
    const pool = ok.filter((t) => t.kind === kind);
    if (pool.length > 0) { take(pool, kind); continue; }
    const why = tasks.filter((t) => t.kind === kind).map((t) => `${t.name}: ${t.why}`).join('; ') || 'no agent of this kind';
    notes.push(`kind ${kind}: no task qualifies (${why})`);
  }
  const rest = ok.filter((t) => t.kind === 'rest');
  if (rest.length > 0) take(rest, 'rest'); else notes.push('kind rest: no task qualifies');
  while (picks.length < want && ok.some((t) => !picks.some((p) => p.task === t))) take(ok, 'filled from what qualifies');
  if (picks.length < want) notes.push(`only ${picks.length} of ${want} tasks qualify on this machine`);
  return { picks, notes };
}

/** One draw as a table, with its notes. */
function drawTable(title: string, d: Draw): string[] {
  return [
    title, '',
    '| slot | task | base (parent of the first commit) | tip |', '| --- | --- | --- | --- |',
    ...d.picks.map((p) => `| ${p.slot} | ${p.task.name} (${p.task.step}) | ${p.task.base ?? '-'} | ${p.task.tip.slice(0, 7)} |`), '',
    ...d.notes.map((n) => `- ${n}`), '',
  ];
}

/** The evidence file: the full list with each task's verdict, the seed, the draw and the notes; `alt` is a second draw. */
export function render(tasks: Task[], seed: number, d: Draw, alt: Draw | null = null): string {
  const yes = (v: boolean | null): string => (v === null ? '-' : v ? 'yes' : 'no');
  const row = (t: Task): string => `| ${t.name} | ${t.step || '-'} | ${t.kind} | ${t.brief ?? '-'} | ${t.merge ?? '-'} | ${yes(t.buildsHere)} | ${t.qualifies ? 'yes' : 'no'}: ${t.why} |`;
  return [
    '# W11.0: the pick', '',
    '## Every agent branch of the project', '',
    '| agent | step | kind | brief | merge commit | builds here | qualifies |', '| --- | --- | --- | --- | --- | --- | --- |', ...tasks.map(row), '',
    ...drawTable(`## The draw (seed ${seed})`, d),
    ...(alt === null ? [] : drawTable(`## The draw among tasks that build here, merge not required (seed ${seed})`, alt)),
  ].join('\n');
}

if (isMain(import.meta.url)) {
  const repo = flag('--repo');
  const seed = Number(flag('--seed') ?? Number.NaN);
  if (repo === null || Number.isNaN(seed)) {
    console.error('usage: node scripts/ab-pick.mts --repo DIR --seed N [--trunk BRANCH] [--builds-from COMMIT] [--out FILE] [--json FILE]');
    process.exit(2);
  }
  const buildsFrom = flag('--builds-from');
  const tasks = listTasks(repo, flag('--trunk') ?? 'work/bandwarp', buildsFrom);
  const d = draw(tasks, seed);
  const alt = buildsFrom === null ? null : draw(tasks, seed, DEFAULT_WANT, (t) => t.brief !== null && t.progress !== null && t.buildsHere === true);
  const text = render(tasks, seed, d, alt);
  const out = flag('--out');
  if (out === null) console.log(text); else put(out, text);
  const json = flag('--json');
  const picks = (x: Draw): unknown[] => x.picks.map((p) => ({ slot: p.slot, ...p.task }));
  if (json !== null) put(json, toJson({ seed, picks: picks(d), altPicks: alt === null ? null : picks(alt), notes: d.notes }, { pretty: true }));
}
