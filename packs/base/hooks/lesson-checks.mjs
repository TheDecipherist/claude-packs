#!/usr/bin/env node
// Every bug that was found once becomes a check here, so it can never come back.
// Checks live in .claude/checks/*.json (one lesson per file):
//   { "id", "why", "rule", "globs": [...], "exclude": [...], "pattern": "<regex>", "flags": "",
//     "code": true,            // match against code with comments/strings blanked (C/C++/JS)
//     "bad": "<snippet the check must catch>", "good": "<fixed snippet it must pass>" }
//   "code": true blanks comments and strings before matching; "strings": true blanks comments only (a check that reads string literals)
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): blocks a write that ADDS a match, by any route (a tool,
// or the shell's >, >>, tee, sed -i, cp, mv, a heredoc; lib/writes.mjs).  --selftest: proves every check.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { writesOf } from './lib/writes.mjs';
import { blankCode } from './lib/cpp-scan.mjs';
import { matchesAny } from './lib/glob.mjs';
import { conceptGlobs, readLayout, resolveAliases } from './lib/layout.mjs';
import { insideProject, checkoutRoot, claudeRoot } from './lib/project.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// "concepts": [...] resolve through .claude/layout.json, the same map the rules trigger from.
// A worktree file is judged by its own checkout's checks and layout (claudeRoot).
function loadChecks(root = ROOT) {
  const dir = join(root, '.claude', 'checks');
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const layout = readLayout(root);
  return files.map((f) => {
    const c = { file: f, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) };
    const fromConcepts = (c.concepts ?? []).flatMap((k) => conceptGlobs(layout, k) ?? []);
    return { ...c, globs: [...resolveAliases(layout, c.globs ?? []), ...fromConcepts], exclude: resolveAliases(layout, c.exclude ?? []) };
  });
}

function matches(check, text) {
  const subject = check.code ? blankCode(text) : check.strings ? blankCode(text, true) : text;   // strings: comments blanked, strings kept
  const re = new RegExp(check.pattern, `${(check.flags ?? '').replace('g', '')}g`);
  const lines = text.split('\n');
  const found = [];
  let m;
  while ((m = re.exec(subject)) !== null) {
    const line = subject.slice(0, m.index).split('\n').length;
    found.push(lines[line - 1]?.trim() ?? '');
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return found;
}

// "forbid" (default): the pattern must not appear.  "require": the pattern must not disappear.
const isRequire = (c) => c.mode === 'require';
const violates = (c, text) => (isRequire(c) ? matches(c, text).length === 0 : matches(c, text).length > 0);

function selftest(checks) {
  const problems = [];
  for (const c of checks) {
    if (!c.bad || !c.good) problems.push(`${c.file}: needs both "bad" and "good" examples`);
    else {
      if (!violates(c, c.bad)) problems.push(`${c.file}: does not catch its "bad" example`);
      if (violates(c, c.good)) problems.push(`${c.file}: wrongly flags its "good" example`);
    }
    for (const k of ['id', 'why', 'globs', 'pattern']) if (!c[k]) problems.push(`${c.file}: missing "${k}"`);
  }
  return problems;
}

function main() {
  if (process.argv.includes('--selftest')) {
    const checks = loadChecks();
    const problems = selftest(checks);
    for (const p of problems) console.error(p);
    console.log(problems.length ? `${problems.length} problem(s)` : `lesson-checks selftest: OK (${checks.length} checks)`);
    return problems.length ? 1 : 0;
  }

  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
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
  const relevant = checks.filter((c) => matchesAny(rel, c.globs) && !matchesAny(rel, c.exclude ?? []));
  if (relevant.length === 0) return 0;

  const hits = [];
  for (const c of relevant) {
    if (isRequire(c)) {
      if (!violates(c, result.before) && violates(c, result.after)) hits.push({ c, text: `removes required: ${c.pattern}` });
      continue;
    }
    const before = new Set(matches(c, result.before));
    for (const text of matches(c, result.after)) if (!before.has(text)) hits.push({ c, text });
  }
  if (hits.length === 0) return 0;

  const msg = hits
    .slice(0, 10)
    .map(({ c, text }) => `  [${c.id}] ${c.why}\n      ${text}${c.rule ? `\n      see ${c.rule}` : ''}`)
    .join('\n');
  process.stderr.write(`BLOCKED by lesson-checks in ${rel}: this edit brings back a known bug.\n${msg}\n`);
  return 2;
}

process.exit(main());
