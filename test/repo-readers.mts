// The readers the repo lint runs (test/repo-lint.test.mts): each reads the kit's tree and returns what is wrong, as a list of lines,
// so a test asserts it empty and a planted tree asserts it found. They were eleven test files (base-neutral, check-speed, file-size,
// file-urls, frame-bench, json-ratchet, no-personal-name, npx-name, pack-manifest, readme, site); W5.4 moves them here.
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gitLines } from '../packs/base/hooks/lib/git-run.mts';
import { isDir, readText, walk } from '../packs/base/hooks/lib/files.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import { languageOf } from '../packs/base/hooks/lib/languages.mjs';
import { configsAt } from '../lib/configs.mts';

const rel = (root: string, file: string): string => relative(root, file).replace(/\\/g, '/');
const dirs = (dir: string): string[] => (isDir(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []);
const namesIn = (dir: string): string[] => (isDir(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.')) : []);
const json = <T,>(file: string): T | null => parseJson<T>(readText(file));
const lines = (text: string): string[] => text.split('\n');
const withoutBuildNoise = (name: string): boolean => name === 'node_modules' || name === '.git' || name === 'worktrees';

/** The files git keeps or would keep (tracked and new, never ignored). */
export const keptFiles = (root: string): string[] => gitLines(['ls-files', '-co', '--exclude-standard'], { cwd: root, env: process.env });

// base-neutral (0.10.0, KWB-31): base holds only universal engineering, so every configuration can install it. A synth word in
// base means a synth law or example sits where a web service gets it too.
const SYNTH_WORD = /\b(sounds?|panels?|patch(?:es)?|voices?|dsp|synths?)\b/i;
export function synthWordsInBase(root: string): string[] {
  const files = [...walk(join(root, 'packs/base'), (n) => /\.pyc$|^\.DS_Store$/.test(n)), join(root, 'configurations/base/config.json')];
  return files.flatMap((f) => lines(readText(f) ?? '').flatMap((line, i) => {
    const m = SYNTH_WORD.exec(line);
    return m ? [`${rel(root, f)}:${i + 1}: "${m[0]}" in ${line.trim().slice(0, 90)}`] : [];
  }));
}
/** The files of packs/synth-creator that packs/base also holds: what left base is gone from it (W10 review 7; d-12 had dropped the list). */
export function leftBaseStillThere(root: string): string[] {
  const own = join(root, 'packs/synth-creator');
  return walk(own).map((f) => rel(own, f)).filter((f) => /^(?:rules|hooks|tools|skills|checks)\//.test(f) && readText(join(root, 'packs/base', f)) !== null);
}
/** Configurations that take the synth-creator pack, and those whose first pack is not base: each one as the root makes it (its deltas over
 *  configurations/shared.json, the packs that fit it from each pack.json `fits`). */
export function configurationFaults(root: string): { takers: string[]; notBaseFirst: string[] } {
  const configs = configsAt(root);
  return {
    takers: configs.filter((c) => [...c.packs.always, ...c.packs.choose].includes('synth-creator')).flatMap((c) => c.name ?? []),
    notBaseFirst: configs.filter((c) => c.packs.always[0] !== 'base').flatMap((c) => c.name ?? []),
  };
}

// check-speed (KWB-43): a lesson check runs on every edit; a pattern that backtracks across a file stops it.
const BUDGET_MS = 1500;
const LINE = "  const value = await thing.call(other, 'text', { key: 1 }); // a note\n  if (value === other) { import('x'); }\n  for (const a of list) total += a.size;\n";
// admiral-fleet W2: the tenant checks read Go too, so a large Go file of handlers and queries runs here as well
const GO_LINE = '\tid := r.PathValue("id") // a note\n\trow := db.QueryRowContext(ctx, "SELECT name FROM sites WHERE id = $1 AND tenant_id = $2", id, sess.TenantID)\n' +
  '\tif user.Role == RoleOwner { log.Printf("owner %s", id) }\n\tres, err := coll.FindOne(ctx, bson.M{"company_id": sess.CompanyID, "slug": r.PathValue("slug")})\n';
const LARGE_FILES: readonly string[] = [`'use client';\nimport a from 'b';\n${LINE.repeat(1200)}`, LINE.repeat(1200),
  `package api\n\nimport "net/http"\n\nfunc handle(w http.ResponseWriter, r *http.Request) {\n${GO_LINE.repeat(600)}}\n`];
export function slowChecks(root: string, budgetMs = BUDGET_MS): string[] {
  const checks = dirs(join(root, 'packs')).flatMap((p) => namesIn(join(root, 'packs', p, 'checks')).flatMap((f) => json<{ id: string; pattern?: string; flags?: string }>(join(root, 'packs', p, 'checks', f)) ?? []));
  return checks.filter((c) => c.pattern).flatMap((c) => {
    const re = new RegExp(c.pattern ?? '', `${(c.flags ?? '').replace('g', '')}g`);
    return LARGE_FILES.flatMap((text) => {
      const start = performance.now();
      for (const m of text.matchAll(re)) if ((m.index ?? 0) < 0) break;
      const ms = performance.now() - start;
      return ms > budgetMs ? [`${c.id}: ${Math.round(ms)} ms`] : [];
    });
  });
}

// file-size (0.9.11): a file the kit installs past the project's line limit is refused by the projects' own limit.
export function overLimit(root: string, limit: number): string[] {
  return walk(join(root, 'packs'), (n) => n === 'node_modules')
    .filter((f) => /\.(mjs|js|py|sh|mts|cts)$/.test(f) && (readText(f) ?? '').split('\n').length - 1 > limit).map((f) => rel(root, f));
}
export const lineLimit = (root: string): number => json<{ maxFileLines?: number }>(join(root, '.claude/layout.json'))?.maxFileLines ?? 300;

// file-urls (KWB-163): a file's own path is fileURLToPath(import.meta.url), never new URL(...).pathname (Windows: `/C:/Users/...`).
const PATHNAME_FORM = /new URL\([^)]*import\.meta\.url\)\.pathname/;
export function pathnameForms(root: string, roots: readonly string[] = ['packs', 'lib', 'bin', 'global', 'scripts', 'prompts']): string[] {
  return roots.flatMap((r) => walk(join(root, r), (n) => n === 'node_modules'))
    .filter((f) => /\.(mjs|js|cjs|mts|cts|ts)$/.test(f) && PATHNAME_FORM.test(readText(f) ?? '')).map((f) => rel(root, f));
}

// frame-bench (0.7.1): the frame bench reads Dawn timestamps (the painter is WebGPU); no OpenGL wording is left in gpu-painter's skills.
export function frameBenchFaults(root: string): string[] {
  const skills = join(root, 'packs/gpu-painter/skills');
  const gl = namesIn(skills).filter((s) => /GL timer quer/i.test(readText(join(skills, s, 'SKILL.md')) ?? '')).map((s) => `${s}: names GL timer queries`);
  return /Dawn timestamp queries/.test(readText(join(skills, 'gpu-frame-bench/SKILL.md')) ?? '') ? gl : [...gl, 'gpu-frame-bench: no Dawn timestamp queries'];
}

// json-ratchet (KWB-146, d-12): the kit's code goes through its one JSON helper (packs/base/hooks/lib/json.mts). The hand-kept count
// that only ever went down is a lint on the lines a change adds: a raw JSON.parse or JSON.stringify call on an added line is found.
const RAW_JSON = /\bJSON\s*\.\s*(?:parse|stringify)\s*\(/;
const CODE_FILE = /\.(?:mts|cts|mjs|cjs|js)$/;
const NOT_LINTED = (file: string): boolean => file.startsWith('test/fixtures/') || file.endsWith('/hooks/lib/json.mts');
/** Raw JSON calls on the lines added since `base` (a ref; the working tree's own changes when HEAD) and in new files. */
export function addedRawJson(root: string, base = 'HEAD'): string[] {
  const hits: string[] = [];
  let file = '';
  for (const line of gitLines(['diff', '-U0', '--no-color', base, '--', '*.mts', '*.cts', '*.mjs', '*.cjs', '*.js'], { cwd: root, env: process.env })) {
    if (line.startsWith('+++ ')) file = line.slice(6);
    else if (line.startsWith('+') && !NOT_LINTED(file) && RAW_JSON.test(languageOf('.mts')?.blank(line.slice(1)) ?? line)) hits.push(`${file}: ${line.slice(1).trim().slice(0, 90)}`);
  }
  for (const f of gitLines(['ls-files', '--others', '--exclude-standard'], { cwd: root, env: process.env })) {
    if (!CODE_FILE.test(f) || NOT_LINTED(f)) continue;
    lines(languageOf('.mts')?.blank(readText(join(root, f)) ?? '') ?? '').forEach((l, i) => { if (RAW_JSON.test(l)) hits.push(`${f}:${i + 1}`); });
  }
  return hits;
}

// no-personal-name: the kit is for everyone; nothing it ships or keeps in its repo names one person. It reads every file the repo keeps.
const NAME = new RegExp(['\\b[Tt]' + 'im\\b', 'Clau' + 'sen', 'ti' + 'ms-', 'ti' + 'm-writing', 'tim_' + 'carter'].join('|'));
// A work order's prompt and steps are the user's own instructions, with the user's own yes for a publish: a run never rewrites
// them (d-26). Never shipped: docs/ is not in the package.
// lib/settings keeps one old hook name, so a project that still runs it can be moved on (the check's one exception since it began).
const USERS_OWN = new Set(['lib/settings.mts']);
// every work order's prompt and steps, not one order's by name (KWB-209: a second order turned the lint red on the user's own yes line)
// and a work order's sources/: the decisions taken with the user and the readers' reports quoting the original documents, the
// user's own record, never rewritten by a run (KWB-next, the audit run)
const usersOwn = (name: string): boolean => USERS_OWN.has(name) || /^docs\/workorders\/[^/]+\/(?:PROMPT|workorder)\.md$/.test(name) || /^docs\/workorders\/[^/]+\/sources\//.test(name);
export function personalNames(root: string, files: readonly string[] = keptFiles(root)): string[] {
  const hits: string[] = [];
  for (const f of files.filter((name) => !name.startsWith('test/fixtures/') && !usersOwn(name))) {   // fixtures: real projects' files, kept verbatim and never shipped
    if (NAME.test(f)) hits.push(f);
    const text = readText(join(root, f));
    if (text === null) continue;
    lines(text).forEach((line, i) => { if (NAME.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 90)}`); });
  }
  return hits;
}

// npx-name (KWB-28): `npx claude-packs` resolves to someone else's package; the kit names itself with the scoped name.
export const BARE = /\bnpx(?:\s+-[-\w]+)*\s+claude-packs\b/;
// the record of what was, a planted sample, other projects' files as they were, a work order's recorded run output (KWB-99), and
// the kit's ignored run output, where a gate's log quotes the test that refuses the form (KWB-214)
const NPX_SKIP = new Set(['node_modules', '.git', 'worktrees', '.claude-packs-backup', 'CHANGELOG.md', 'workflow-bugs.md', 'repo-lint.test.mts', 'repo-readers.mts', 'fixtures', 'evidence', 'build']);
export function bareNpx(root: string): string[] {
  return walk(root, (n) => NPX_SKIP.has(n)).filter((f) => /\.(mjs|js|cjs|mts|cts|ts|py|sh|md|json|txt)$/.test(f))
    .flatMap((f) => lines(readText(f) ?? '').flatMap((line, i) => (BARE.test(line) && !line.includes('BARE') ? [`${rel(root, f)}:${i + 1}`] : [])));
}

// readme and site: the front page and the web page cannot fall behind what the kit holds.
// The page's counts and tables are written by scripts/counts.mts and held by `counts --check` (test/counts.test.mts, W7 c).
const rustCheck = (root: string): { id: string; why: string; rule: string } => json<{ id: string; why: string; rule: string }>(join(root, 'packs/rust/checks/rust-unwrap-in-library.json')) ?? { id: '', why: '', rule: '' };

export function readmeRefusal(root: string): string[] {
  const page = readText(join(root, 'README.md')) ?? '';
  const check = rustCheck(root);
  return [...(page.includes(`[${check.id}] ${check.why}`) ? [] : ['the refusal is not the check\'s words']), ...(page.includes(`see ${check.rule}`) ? [] : ['the rule is not named'])];
}
export function readmeOrder(root: string): string[] {
  const page = readText(join(root, 'README.md')) ?? '';
  const order = page.indexOf('## See it work') < page.indexOf('## Start here') && page.indexOf('rules') < page.indexOf('npx') ? [] : ['the reader meets a command before what the kit is'];
  const missing = ['## Install one pack', '## What is whose', '## Questions', '## Add your own rule', '## Words', '`init mongo`', '`add docker`', '`remove docker`', '`list`'].filter((h) => !page.includes(h));
  return [...order, ...missing.map((m) => `no ${m}`), ...(/Hooks and rules don't work in Claude Desktop/.test(page) ? [] : ['no Claude Desktop note'])];
}
export function siteFiles(root: string): string[] {
  const page = readText(join(root, 'site/index.html')) ?? '';
  const missing = [...page.matchAll(/(?:href|src)="(?!https?:|#)([^"]+)"/g)].map((m) => m[1] ?? '').filter((href) => readText(join(root, 'site', href)) === null && !isDir(join(root, 'site', href)));
  return [...missing, ...(/(?:href|src)="\//.test(page) ? ['an absolute path'] : [])];
}
export function siteWords(root: string): string[] {
  const page = readText(join(root, 'site/index.html')) ?? '';
  const check = rustCheck(root);
  return [...(/rybbit|analytics|gtag/i.test(page) ? ['the page carries analytics'] : []), ...(page.includes(check.id) ? [] : ['no check id']), ...(page.replace(/\s+/g, ' ').includes(check.why) ? [] : ['not the check\'s words'])];
}
export const siteShipped = (root: string): boolean => (json<{ files: string[] }>(join(root, 'package.json'))?.files ?? []).includes('site');

// The install-site counter (tests survey section 4, W5.5): every `init` a test spawns is an install plus a doctor, so the sites are
// counted and held under a limit; a test starts from fixture(name) (test/fixtures/installs.mts) and keeps `init` for a flow whose
// subject is the install. Git's own init (`['init', '-q']`, a commit message) is not one.
export const INIT_SITE_LIMIT = 40;
const GIT_INIT = /'-q'|'-qm'|git\(|'git'|gitRun|commit|\bpass of\b/;
export function initSites(root: string): string[] {
  const own = new Set(['test/repo-lint.test.mts', 'test/repo-readers.mts', 'test/count-copies.test.mts']);
  return walk(join(root, 'test'), (n) => n === 'fixtures' || n === 'node_modules').filter((f) => /\.(?:mts|mjs)$/.test(f) && !own.has(rel(root, f)))
    .flatMap((f) => lines(readText(f) ?? '').flatMap((line, i) => (line.includes("'init'") && !GIT_INIT.test(line) ? [`${rel(root, f)}:${i + 1}`] : [])));
}
