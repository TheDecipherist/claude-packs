// One task's row of build/evidence/W11/ab.md (W11.0): the original run's record against a new run's transcript and clone.
//   node scripts/ab-compare.mts --original RECORD.json --transcript NEW.jsonl --clone DIR [--gates new-gates.json] [--out ab.md]
// RECORD.json is a RunRecord; a number that lives only on the other computer is null and reads "not on this machine". The clone
// holds the original's tip as a commit, so the diff against the original is git's. new-gates.json is {"gate": "pass"|"fail"}.
import { appendFileSync } from 'node:fs';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { isRecord, readJson } from '../packs/base/hooks/lib/json.mts';
import { flag, git, gitOk } from './ab-args.mts';
import { summariseTranscript, type Tokens } from './ab-transcript.mts';

export interface RunRecord {
  task: string; model: string | null; turns: number | null; tokens: Tokens | null; wallMs: number | null; hookMs: number | null;
  refusals: number | null; retries: number | null; base: string; originalTip: string; gates: { name: string; pass: boolean | null }[];
  /** The commit the new run starts from when it is not `base` (the clone's kit install sits on top of it). */
  cloneBase?: string;
  /** A repository to fetch `originalTip` from when the clone does not hold it (the clone never does, so a run cannot read the answer). */
  source?: string;
  /** The files the original agent's own commits changed, when the tip also carries other work (merges of the trunk). */
  originalFiles?: string[];
}
export interface CompareInput { original: RunRecord; transcript: string; clone: string; gatesFile: string | null }

const NOT_HERE = 'not on this machine';
const seconds = (ms: number | null): string => (ms === null ? NOT_HERE : String(Math.round(ms / 1000)));
const count = (n: number | null): string => (n === null ? NOT_HERE : String(n));

const lines = (text: string): string[] => text.split('\n').filter((l) => l !== '');

/** The files the new run changed against the base: tracked changes in the work tree and the untracked ones. */
export const newFiles = (clone: string, base: string): string[] =>
  [...new Set([...lines(git(clone, ['diff', '--name-only', base])), ...lines(git(clone, ['ls-files', '-o', '--exclude-standard']))])].sort();

/** The new run's gate results by name, from the file the lead writes after running the brief's gate commands. */
function newGates(file: string | null): Record<string, string> {
  const raw = file === null ? null : readJson<unknown>(file);
  if (!isRecord(raw)) return {};
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v)]));
}

/** Each file in both sets read against the original's tip: identical, or differing by so many lines. */
function sharedFiles(clone: string, tip: string, shared: string[]): { same: string[]; differs: string[] } {
  const same: string[] = []; const differs: string[] = [];
  for (const f of shared) {
    const stat = lines(git(clone, ['diff', '--numstat', tip, '--', f]))[0];
    if (stat === undefined) { same.push(f); continue; }
    const [add, del] = stat.split('\t');
    differs.push(`${f} (+${add} -${del})`);
  }
  return { same, differs };
}

/** The original's tip, fetched into the clone only now (the run never held it), when a source is named and the clone lacks it. */
function ensureTip(clone: string, original: RunRecord): void {
  if (original.source === undefined || gitOk(clone, ['cat-file', '-e', `${original.originalTip}^{commit}`])) return;
  git(clone, ['fetch', '-q', '--no-tags', '--upload-pack=git -c uploadpack.allowAnySHA1InWant=true upload-pack', original.source, original.originalTip]);
}

/** One task's section: gates by name, files, the diff against the original, then the cost rows. */
export function compareRow({ original, transcript, clone, gatesFile }: CompareInput): string {
  const run = summariseTranscript(transcript);
  const fresh = newGates(gatesFile);
  const gateNames = [...new Set([...original.gates.map((g) => g.name), ...Object.keys(fresh)])];
  const was = (name: string): string => {
    const g = original.gates.find((x) => x.name === name);
    return g === undefined ? 'not in the original' : g.pass === null ? 'not measured' : g.pass ? 'pass' : 'fail';
  };
  ensureTip(clone, original);
  const oldFiles = original.originalFiles ?? lines(git(clone, ['diff', '--name-only', original.base, original.originalTip]));
  const nowFiles = newFiles(clone, original.cloneBase ?? original.base);
  const { same, differs } = sharedFiles(clone, original.originalTip, nowFiles.filter((f) => oldFiles.includes(f)));
  const list = (items: string[]): string => (items.length === 0 ? 'none' : items.join(', '));
  const tok = (t: Tokens | null, key: keyof Tokens): string => (t === null ? NOT_HERE : String(t[key]));
  return [
    `### ${original.task}`, '',
    `model: ${original.model ?? NOT_HERE} (original), ${run.model ?? 'unknown'} (new)`, '',
    '| gate | original | new run |', '| --- | --- | --- |',
    ...gateNames.map((n) => `| ${n} | ${was(n)} | ${fresh[n] ?? 'not run'} |`), '',
    '| measure | original | new run |', '| --- | --- | --- |',
    `| files changed | ${oldFiles.length} | ${nowFiles.length} |`,
    `| turns | ${count(original.turns)} | ${run.turns} |`,
    `| tokens in | ${tok(original.tokens, 'input')} | ${run.tokens.input} |`,
    `| tokens out | ${tok(original.tokens, 'output')} | ${run.tokens.output} |`,
    `| tokens cached read | ${tok(original.tokens, 'cacheRead')} | ${run.tokens.cacheRead} |`,
    `| tokens cached write | ${tok(original.tokens, 'cacheWrite')} | ${run.tokens.cacheWrite} |`,
    `| wall (s) | ${seconds(original.wallMs)} | ${seconds(run.wallMs)} |`,
    `| hook waiting (s) | ${seconds(original.hookMs)} | ${seconds(run.hookMs)} |`,
    `| refusals | ${count(original.refusals)} | ${run.refusals} |`,
    `| retries | ${count(original.retries)} | ${run.retries} |`, '',
    `- same as the original's: ${list(same)}`,
    `- differs from the original's: ${list(differs)} (each to be read and judged better, equal or worse)`,
    `- only in the original: ${list(oldFiles.filter((f) => !nowFiles.includes(f)))}`,
    `- only in the new run: ${list(nowFiles.filter((f) => !oldFiles.includes(f)))}`, '',
  ].join('\n');
}

if (isMain(import.meta.url)) {
  const record = flag('--original'); const transcript = flag('--transcript'); const clone = flag('--clone');
  const original = record === null ? null : readJson<RunRecord>(record);
  const text = transcript === null ? null : readText(transcript);
  if (original === null || text === null || clone === null) {
    console.error('usage: node scripts/ab-compare.mts --original RECORD.json --transcript NEW.jsonl --clone DIR [--gates FILE] [--out ab.md]');
    process.exit(2);
  }
  const row = compareRow({ original, transcript: text, clone, gatesFile: flag('--gates') });
  const out = flag('--out');
  if (out === null) console.log(row); else appendFileSync(out, `${row}\n`);
}
