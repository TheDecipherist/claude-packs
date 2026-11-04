#!/usr/bin/env node
// Every bug that was found once becomes a check here, so it can never come back.
// Checks live in .claude/checks/*.json (one lesson per file):
//   { "id", "why", "rule", "globs": [...], "exclude": [...], "pattern": "<regex>", "flags": "",
//     "code": true,            // match against code with comments/strings blanked (C/C++/JS)
//     "bad": "<snippet the check must catch>", "good": "<fixed snippet it must pass>",
//     "mode": "forbid" (default) | "require" | "needs",  "needs": ["<regex>", ...] }
//   "code": true blanks comments and strings before matching; "strings": true blanks comments only (a check that reads string literals);
//   "prose": true blanks what a reader does not read as prose in markdown: code, URLs, frontmatter (a check on public text)
//   mode "needs": when the pattern appears, every regex in "needs" must appear as well (an entry file that listens also
//   registers shutdown; a gateway that creates a MongoClient also caches and names it). A write is refused only for a need
//   it newly leaves missing.
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): blocks a write that ADDS a match, by any route (a tool,
// or the shell's >, >>, tee, sed -i, cp, mv, a heredoc; lib/writes.mjs).  --selftest: proves every check.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { writesOf } from './lib/writes.mjs';
import { blankCode } from './lib/cpp-scan.mjs';
import { isContent } from './lib/content.mjs';
import { blankProse } from './lib/prose.mjs';
import { matchesAny } from './lib/glob.mjs';
import { conceptGlobs, readLayout, resolveAliases } from './lib/layout.mjs';
import { insideProject, checkoutRoot, claudeRoot } from './lib/project.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// "concepts": [...] resolve through .claude/layout.json, the same map the rules trigger from.
// A worktree file is judged by its own checkout's checks and layout (claudeRoot).
// "whenDep": { "zod": 4 }: a check for that major version on. A project that pins an older one is left alone; one that names none is judged.
function majorsOf(root, dep) {
  const files = [join(root, 'package.json')];
  try { for (const p of readdirSync(join(root, 'packages'))) files.push(join(root, 'packages', p, 'package.json')); } catch { /* not a workspace */ }
  return files.flatMap((f) => {
    try {
      const j = JSON.parse(readFileSync(f, 'utf8'));
      const v = (j.dependencies ?? {})[dep] ?? (j.devDependencies ?? {})[dep];
      return v ? [Number(String(v).match(/\d+/)?.[0])] : [];
    } catch { return []; }
  });
}
const appliesTo = (root, c) => Object.entries(c.whenDep ?? {}).every(([dep, major]) => { const found = majorsOf(root, dep); return !found.length || found.some((m) => m >= major); });

// "replaces": [ids]: when both are installed, the wider check stands and the narrower one is left out, so a hit is reported once.
const withoutReplaced = (checks) => { const gone = new Set(checks.flatMap((c) => c.replaces ?? [])); return checks.filter((c) => !gone.has(c.id)); };

export function loadChecks(root = ROOT) {
  const dir = join(root, '.claude', 'checks');
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const layout = readLayout(root);
  return withoutReplaced(files.filter((f) => appliesTo(root, JSON.parse(readFileSync(join(dir, f), 'utf8')))).map((f) => {
    const c = { file: f, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) };
    const fromConcepts = (c.concepts ?? []).flatMap((k) => conceptGlobs(layout, k) ?? []);
    return { ...c, globs: [...resolveAliases(layout, c.globs ?? []), ...fromConcepts], exclude: resolveAliases(layout, c.exclude ?? []) };
  }));
}

// What a check reads: one blanking per kind. strings: comments blanked, strings kept.
const BLANKING = { prose: blankProse, code: blankCode, strings: (text) => blankCode(text, true) };
const subjectOf = (c, text) => { const kind = Object.keys(BLANKING).find((k) => c[k]); return kind ? BLANKING[kind](text) : text; };

// Every match: its line number and that line's text.
function linesOf(check, text) {
  const subject = subjectOf(check, text);
  const re = new RegExp(check.pattern, `${(check.flags ?? '').replace('g', '')}g`);
  const lines = text.split('\n');
  const found = [];
  let m;
  while ((m = re.exec(subject)) !== null) {
    const line = subject.slice(0, m.index).split('\n').length;
    found.push({ line, text: lines[line - 1]?.trim() ?? '' });
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return found;
}

const matches = (check, text) => linesOf(check, text).map((m) => m.text);

// The needs a text that has the pattern does not meet ([] when the pattern is absent).
function missing(c, text) {
  if (matches(c, text).length === 0) return [];
  const subject = subjectOf(c, text);
  return (c.needs ?? []).filter((n) => !new RegExp(n, (c.flags ?? '').replace('g', '')).test(subject));
}

// One entry per mode: whether a text breaks the check, and what a write newly breaks (before -> after).
// "forbid" (default): the pattern must not appear.  "require": it must not disappear.  "needs": see above.
const MODES = {
  forbid: {
    violates: (c, text) => matches(c, text).length > 0,
    added: (c, before, after) => { const had = new Set(matches(c, before)); return matches(c, after).filter((t) => !had.has(t)); },
  },
  require: {
    violates: (c, text) => matches(c, text).length === 0,
    added: (c, before, after) => (matches(c, before).length > 0 && matches(c, after).length === 0 ? [`removes required: ${c.pattern}`] : []),
  },
  needs: {
    violates: (c, text) => missing(c, text).length > 0,
    added: (c, before, after) => { const had = missing(c, before); return missing(c, after).filter((n) => !had.includes(n)).map((n) => `has ${c.pattern} but is missing: ${n}`); },
  },
};
const modeOf = (c) => MODES[c.mode ?? 'forbid'];
const violates = (c, text) => modeOf(c).violates(c, text);

// What a whole file breaks, for `claude-packs scan`: forbid's matches, a needs check's gaps. "require" judges a removal, so it has none.
export function hitsOf(c, text) {
  if (c.mode === 'require') return [];
  if (c.mode === 'needs') return missing(c, text).map((n) => ({ line: 1, text: `missing: ${n}` }));
  return linesOf(c, text);
}

function selftest(checks) {
  const problems = [];
  for (const c of checks) {
    if (!c.bad || !c.good) problems.push(`${c.file}: needs both "bad" and "good" examples`);
    else {
      if (!violates(c, c.bad)) problems.push(`${c.file}: does not catch its "bad" example`);
      if (violates(c, c.good)) problems.push(`${c.file}: wrongly flags its "good" example`);
    }
    for (const k of ['id', 'why', 'globs', 'pattern']) if (!c[k]) problems.push(`${c.file}: missing "${k}"`);
    if (!modeOf(c)) problems.push(`${c.file}: unknown mode "${c.mode}" (forbid, require or needs)`);
    if (c.mode === 'needs' && !c.needs?.length) problems.push(`${c.file}: mode needs without "needs"`);
  }
  return problems;
}

function selftestMain() {
  const checks = loadChecks();
  const problems = selftest(checks);
  for (const p of problems) console.error(p);
  console.log(problems.length ? `${problems.length} problem(s)` : `lesson-checks selftest: OK (${checks.length} checks)`);
  return problems.length ? 1 : 0;
}

function main(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return 0;
  }
  for (const w of writesOf(payload)) {
    if (w.after === null || !insideProject(w.path)) continue;
    const code = judge(w.path, { before: w.before, after: w.after });
    if (code) return code;
  }
  return 0;
}

function judge(file, result) {
  const checks = loadChecks(claudeRoot(file));
  const rel = relative(checkoutRoot(file), file);
  const published = isContent(rel, readLayout(claudeRoot(file)));
  const relevant = checks.filter((c) => matchesAny(rel, c.globs) && !matchesAny(rel, c.exclude ?? []) && (!published || c.prose));
  if (relevant.length === 0) return 0;

  const hits = relevant.filter(modeOf).flatMap((c) => modeOf(c).added(c, result.before, result.after).map((text) => ({ c, text })));
  if (hits.length === 0) return 0;

  const msg = hits
    .slice(0, 10)
    .map(({ c, text }) => `  [${c.id}] ${c.why}\n      ${text}${c.rule ? `\n      see ${c.rule}` : ''}`)
    .join('\n');
  process.stderr.write(`BLOCKED by lesson-checks in ${rel}: this edit brings back a known bug.\n${msg}\n`);
  return 2;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftestMain() : await asHook('lesson-checks', main));
