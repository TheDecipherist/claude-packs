// claude-packs scan (0.16.0: a project owner runs it before choosing to install anything). A real install's review found bugs that
// "could have been super bad on production", so the scan is that review, on a copy:
//   1. the project's files are copied to a temp folder (what git tracks or would track; never .env, keys, node_modules or build output),
//      so the project itself, its .git included, is never written to;
//   2. the recommended packs are installed into the copy (lib/scan-detect.mjs says which, with the evidence);
//   3. every check runs over every file, and the secret patterns, the line limit and coverage with them;
//   4. the report and every hit go beside the copy. A hit is a candidate, not a bug: a real install's run had 189 real of 302 counted.
// The bugs that hurt most are the ones no check sees, so the report ends with the review step: `scan --prompt` (prompts/scan-review.md).
import { copyFileSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isContent } from '../packs/base/hooks/lib/content.mts';
import { ensureDir, scratchDir } from '../packs/base/hooks/lib/files.mts';
import { tmpKeyed } from '../packs/base/hooks/lib/hash.mts';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import { writeJson } from '../packs/base/hooks/lib/json.mts';
import { isSecretFile } from '../packs/base/hooks/lib/secret-patterns.mts';
import type { InstalledGlobModule, InstalledLessonChecksModule, LessonCheck, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { sourceFilesOf } from './configs.mts';
import { SOURCE, coverage } from './coverage.mts';
import { onceOnlyDoctor } from './once-only-report.mts';
import { PACKS_DIR, availablePacks } from './packs.mts';
import { SKIP, filesOf } from './project-files.mts';
import { nearCopies, remadeNames, repeatLine, repeatedShapes } from './repeats.mts';
import type { NearCopyRow, RemadeName, Repeat, Texts } from './repeats.mts';
import { kitCommand } from './kit-command.mts';
import { repoWeight, weightLines } from './repo-weight.mts';
import type { RepoWeight } from './repo-weight.mts';
import { recommend } from './scan-detect.mjs';
import { sync } from './sync.mts';

const MAX_BYTES = 1_000_000;
const SHOWN = 5;
const TEXT = 'public text';
const KINDS: readonly (readonly [kind: string, test: RegExp])[] = [
  ['security', /\b(?:secrets?|tokens?|xss|injection|credentials?|passwords?|csrf|redirects?|sanitize\w*|escape[sd]?|untrusted|helmet|cookies?)\b/i],
  ['failures and lost data', /\b(?:swallow\w*|lost|silently|crash\w*|shutdown|unhandled\w*|delete\w*|drops?|transaction\w*|floating|never stops?)\b/i],
  ['quality', /./],
];

/** The installed `lesson-checks.mjs` as scan reads it from the copy: its checks loaded, each with the file it came from, and a check's hits in a text. */
export interface ScannedCheck extends LessonCheck { file: string }
export interface ScanChecksModule extends InstalledLessonChecksModule {
  loadChecks(root: string): ScannedCheck[];
  hitsOf(check: ScannedCheck, text: string): { line: number; text: string }[];
}
/** The installed `secrets-guard.mjs`: the secret patterns, each a name and a regex. */
export interface ScanSecretsModule { SECRETS: readonly (readonly [name: string, pattern: RegExp])[] }

export interface ScanHit { file: string; line: number; text: string }
export interface ScanResult { id: string; why: string; rule?: string; pack: string; kind: string; hits: ScanHit[] }
export interface ScanSecret { file: string; line: number; name: string }
/** What `recommend` (scan-detect) says to install, with its evidence. */
export interface ScanPick {
  config: string;
  why: string;
  always: readonly string[];
  packs: readonly { pack: string; why: string }[];
  leftOut: readonly string[];
  early: boolean;
  fullStack: boolean;
}

// Which scan a project's `fix` reads: a pointer in the temp folder, named for the project's path. `scan` writes it and `fix-plan` reads it.
export const pointerOf = (dir: string): string => tmpKeyed('claude-packs-last-scan-', resolve(dir));
export const rememberScan = (dir: string, json: string): void => writeFileSync(pointerOf(dir), json);

const copyable = (dir: string, rel: string): boolean => {
  if (SKIP.test(rel) || isSecretFile(rel)) return false;
  try { const s = lstatSync(join(dir, rel)); return s.isFile() && s.size <= MAX_BYTES; } catch { return false; }
};

function snapshot(dir: string, files: readonly string[]): string {
  const copy = scratchDir('claude-packs-scan-');
  for (const rel of files) {
    ensureDir(dirname(join(copy, rel)));
    copyFileSync(join(dir, rel), join(copy, rel));
  }
  return copy;
}

// A line as it may be shown: long tokens masked, so a report can be passed around.
const shown = (text: string): string => text.replace(/[A-Za-z0-9_+/=-]{24,}/g, '[masked]').slice(0, 110);
const packOf = (file: string): string => availablePacks().find((p) => { try { return lstatSync(join(PACKS_DIR, p, 'checks', file)).isFile(); } catch { return false; } }) ?? '?';

interface Checked { results: ScanResult[]; secrets: ScanSecret[]; texts: Texts; samples: number }

async function runChecks(copy: string, files: readonly string[]): Promise<Checked> {
  const hook = (name: string): string => pathToFileURL(join(copy, '.claude/hooks', name)).href;
  const { loadChecks, hitsOf }: ScanChecksModule = await import(hook('lesson-checks.mjs'));
  const { matchesAny }: InstalledGlobModule = await import(hook('lib/glob.mjs'));
  const { SECRETS }: ScanSecretsModule = await import(hook('secrets-guard.mjs'));
  const texts: [string, string][] = files.map((rel): [string, string] => [rel, readFileSync(join(copy, rel), 'utf8')]).filter(([, t]) => !t.includes('\0'));
  const results: ScanResult[] = [];
  let samples = 0;
  for (const c of loadChecks(copy)) {
    const hits = texts.filter(([rel]) => matchesAny(rel, c.globs ?? []) && !matchesAny(rel, c.exclude ?? []))
      .flatMap(([rel, text]) => hitsOf(c, text).map((h) => ({ file: rel, line: h.line, text: shown(h.text) })));
    const pack = packOf(c.file);
    const own = pack === 'writing' ? hits : hits.filter((h) => !isContent(h.file));
    samples += hits.length - own.length;
    const kind = pack === 'writing' ? TEXT : c.kind ?? KINDS.find(([, re]) => re.test(`${c.id} ${c.why}`))?.[0] ?? 'quality';
    if (own.length) results.push({ id: c.id, why: c.why, rule: c.rule, pack, kind, hits: own });
  }
  const secrets = texts.flatMap(([rel, text]) => SECRETS.flatMap(([name, re]) => [...text.matchAll(re)].map((m) => ({ file: rel, line: text.slice(0, m.index).split('\n').length, name }))));
  return { results, secrets, texts, samples };
}

interface ReportInput {
  dir: string;
  copy: string;
  pick: ScanPick;
  results: readonly ScanResult[];
  secrets: readonly ScanSecret[];
  skipped: readonly string[];
  longFiles: readonly string[];
  cov: { uncovered: readonly string[] };
  dups: string;
  handBuilt: readonly Repeat[];
  near: readonly NearCopyRow[];
  remade: readonly RemadeName[];
  samples: number;
  weight: RepoWeight;
  count: number;
}

const inTests = (s: ScanSecret): boolean => /(^|\/)(tests?|__tests__|fixtures?)\/|\.(test|spec)\./.test(s.file) || isContent(s.file);

// The head of the report: the count of hits, and what to install.
function headLines({ dir, pick, results, secrets, samples, count }: ReportInput): string[] {
  const code = results.filter((r) => r.kind !== TEXT);
  const total = code.reduce((n, r) => n + r.hits.length, 0);
  const inText = results.filter((r) => r.kind === TEXT).reduce((n, r) => n + r.hits.length, 0);
  const packs = [...pick.always, ...pick.packs.map((p) => p.pack)];
  const live = secrets.filter((s) => !inTests(s));
  const files = new Set(code.flatMap((r) => r.hits.map((h) => h.file))).size;
  const out = ['# claude-packs scan', '', `${dir}: ${count} files read, on a copy. Nothing in the project was changed.`, ''];
  if (live.length) out.push(`**Look at this first: ${live.length} possible secret(s) in the code, listed below. Any that is real is leaked: rotate it.**`, '');
  const counted = `${total} check hits in ${files} files${inText ? `, and ${inText} in public text, listed last` : ''}`;
  const apart = samples ? `. ${samples} more in content folders are samples, left out` : '';
  out.push(`${counted}${apart}. A hit is a candidate, not a confirmed bug: someone has to read it. ` +
    'The worst bugs are usually the ones no check can see, so the review step at the end matters more than this list.', '');
  out.push('## What to install', '', `Configuration \`${pick.config}\` (${pick.why}), packs: ${packs.join(', ')}.`, '');
  for (const p of pick.packs) out.push(`- \`${p.pack}\`: ${p.why}`);
  if (pick.leftOut.length) out.push('', `Left out, nothing found for them: ${pick.leftOut.join(', ')}.`);
  if (pick.fullStack) out.push('', 'Next.js and Fastify are both here: the `full-stack` configuration may fit, but it fixes a folder layout and has fewer checks. Compare before choosing.');
  out.push('', '```', `${kitCommand(dir)} init ${pick.packs.map((p) => p.pack).join(' ')} --config ${pick.config}`, '```', '');
  return out;
}

// The structure lines: long files, copies, near copies, names made again.
function structureLines({ longFiles, dups, handBuilt, near, remade }: ReportInput): string[] {
  const colon = (n: number): string => (n ? ':' : '');
  return [
    '## Structure', '',
    `- ${longFiles.length} source file(s) over 300 lines${longFiles.length ? `: ${longFiles.slice(0, 8).join(', ')}` : ''}`,
    `- ${dups}`,
    `- ${handBuilt.length} repeat(s) written by hand, each of which should be one template${colon(handBuilt.length)}`,
    ...handBuilt.slice(0, 12).map(repeatLine),
    `- ${near.length} near cop(ies), the same code with lines changed${colon(near.length)}`,
    ...near.slice(0, 8).map((n) => `  - ${n.file}:${n.line} ~ ${n.other}:${n.from}-${n.to} (${n.matched} of ${n.of} statements)`),
    `- ${remade.length} function(s) made again under the same name${colon(remade.length)}`,
    ...remade.slice(0, 8).map((m) => `  - ${m.name}: ${m.at.join(', ')}`),
  ];
}

function report(input: ReportInput): string {
  const { dir, copy, results, secrets, skipped, cov, weight } = input;
  const out = headLines(input);
  const live = secrets.filter((s) => !inTests(s));
  if (secrets.length) {
    out.push('## Secrets', '', 'Values are never shown. Secret-shaped text in test files and content folders is usually an example, and is listed apart.', '');
    for (const s of live) out.push(`- ${s.file}:${s.line}: ${s.name}`);
    const planted = secrets.filter(inTests);
    if (planted.length) out.push('', `In test files and content folders (${planted.length}):`, ...planted.map((s) => `- ${s.file}:${s.line}: ${s.name}`));
    out.push('');
  }
  out.push('## Check hits', '', 'Grouped by a keyword match on what each check is for, so the groups are rough.', '');
  for (const kind of [...KINDS.map(([k]) => k), TEXT]) {
    const rows = results.filter((r) => r.kind === kind).sort((a, b) => b.hits.length - a.hits.length);
    if (!rows.length) continue;
    out.push(`### ${kind}`, '');
    for (const r of rows) {
      out.push(`**${r.id}** (${r.pack}): ${r.hits.length}. ${r.why}`, '');
      for (const h of r.hits.slice(0, SHOWN)) out.push(`- ${h.file}:${h.line}: \`${h.text.replace(/`/g, "'")}\``);
      if (r.hits.length > SHOWN) out.push(`- and ${r.hits.length - SHOWN} more (all in claude-packs-scan.json)`);
      out.push('');
    }
  }
  out.push(...structureLines(input), ...weightLines(weight));
  out.push(`- ${cov.uncovered.length} source file(s) no rule covers yet; the layout is fitted to the project at install`, '');
  if (skipped.length) out.push(`Not read: ${skipped.length} file(s), secret files, symlinks or over 1 MB. ${skipped.filter(isSecretFile).length} of them are secret files, left out on purpose.`, '');
  const why = 'The checks find patterns. For runaway loops, security holes between files and work that disappears silently, run the review on the copy:';
  const review = `${kitCommand(dir)} scan --prompt   # give what it prints to Claude Code here`;
  out.push('## Next step', '', why, '', '```', `cd ${copy}`, review, '```', '', `The copy holds your code: delete ${copy} when you are done.`, '');
  return out.join('\n');
}

export interface ScanOptions { out?: string | null; log?: Logger }
export interface ScanOutcome { file: string; copy: string; pick: ScanPick; results: ScanResult[]; secrets: ScanSecret[] }

/** Scans a project on a copy (the project is never written to) and writes the report and `claude-packs-scan.json` beside the copy. */
export async function scan(projectDir: string, { out = null, log = console.log }: ScanOptions = {}): Promise<ScanOutcome> {
  const listed = filesOf(projectDir);
  const weight = repoWeight(projectDir, listed);
  const built = weight.built.map((b) => b.folder);
  const files = listed.filter((rel) => copyable(projectDir, rel) && !built.some((folder) => rel.startsWith(folder)));
  const pick: ScanPick = recommend(projectDir, files);
  const copy = snapshot(projectDir, files);
  await sync(copy, pick.packs.map((p) => p.pack), { config: pick.config, mkdirs: true, log: () => {} });
  const { results, secrets, texts: all, samples } = await runChecks(copy, files);
  const texts = all.filter(([rel]) => !isContent(rel));
  const source = sourceFilesOf(copy, [...pick.always, ...pick.packs.map((p) => p.pack)]) ?? SOURCE; // base and synths name none
  const cov = await coverage(copy, source);
  const longFiles = texts.filter(([rel, t]) => source.test(rel) && t.split('\n').length - 1 > 300).map(([rel]) => rel);
  const said: string[] = [];
  onceOnlyDoctor(copy, (l) => said.push(l.trim()));
  const layout = readLayout(projectDir);
  const handBuilt = repeatedShapes(texts, layout);
  const near = nearCopies(texts, layout);
  const remade = remadeNames(texts, layout);
  const dups = said.find((l) => l.startsWith('duplicates')) ?? 'duplicates: not measured (jscpd not found)';
  const skipped = listed.filter((rel) => !files.includes(rel));
  const text = report({ dir: projectDir, copy, pick, results, secrets, skipped, longFiles, cov, dups, handBuilt, near, remade, samples, weight, count: files.length });
  const file = out ?? join(copy, 'claude-packs-scan.md');
  writeFileSync(file, text);
  const json = join(copy, 'claude-packs-scan.json');
  if (!writeJson(json, { pick, results, secrets, repeats: handBuilt, near, remade, longFiles, weight }, { pretty: true })) throw new Error(`could not write ${json}`);
  rememberScan(projectDir, json);
  log(`Scanned ${files.length} files on a copy; the project was not changed.`);
  log(`  ${pick.config}: ${[...pick.always, ...pick.packs.map((p) => p.pack)].join(', ')}`);
  const inCode = secrets.filter((s) => !isContent(s.file)).length;
  log(`  ${results.filter((r) => r.kind !== TEXT).reduce((n, r) => n + r.hits.length, 0)} check hits, ${inCode} possible secret(s)${samples ? `; ${samples} sample hits in content folders left out` : ''}`);
  log(`Report: ${file}`);
  log(`Copy:   ${copy} (delete it when you are done; it holds your code)`);
  log('Next:   `fix` turns this into a work order for Claude; `init --auto` installs what it suggests.');
  return { file, copy, pick, results, secrets };
}
