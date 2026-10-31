#!/usr/bin/env node
// Every bug that was found once becomes a check here, so it can never come back.
// Checks live in .claude/checks/*.json (one lesson per file):
//   { "id", "why", "rule", "globs": [...], "exclude": [...], "pattern": "<regex>", "flags": "",
//     "code": true,            // match against code with comments/strings blanked (C/C++/JS)
//     "bad": "<snippet the check must catch>", "good": "<fixed snippet it must pass>" }
// PreToolUse (Write|Edit|MultiEdit): blocks edits that ADD a match.  --selftest: proves every check.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { computeEdit } from './lib/apply-edit.mjs';
import { blankCode } from './lib/cpp-scan.mjs';
import { matchesAny } from './lib/glob.mjs';
import { conceptGlobs, readLayout, resolveAliases } from './lib/layout.mjs';
import { insideProject, checkoutRoot } from './lib/project.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const DIR = join(ROOT, '.claude', 'checks');

// "concepts": [...] resolve through .claude/layout.json, the same map the rules trigger from.
function loadChecks() {
  let files = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const layout = readLayout(ROOT);
  return files.map((f) => {
    const c = { file: f, ...JSON.parse(readFileSync(join(DIR, f), 'utf8')) };
    const fromConcepts = (c.concepts ?? []).flatMap((k) => conceptGlobs(layout, k) ?? []);
    return { ...c, globs: [...resolveAliases(layout, c.globs ?? []), ...fromConcepts], exclude: resolveAliases(layout, c.exclude ?? []) };
  });
}

function matches(check, text) {
  const subject = check.code ? blankCode(text) : text;
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
  const checks = loadChecks();

  if (process.argv.includes('--selftest')) {
    const problems = selftest(checks);
    for (const p of problems) console.error(p);
    console.log(problems.length ? `${problems.length} problem(s)` : `${checks.length} checks OK`);
    return problems.length ? 1 : 0;
  }

  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const input = payload.tool_input ?? {};
  if (!input.file_path || !insideProject(input.file_path)) return 0;
  const rel = relative(checkoutRoot(input.file_path), input.file_path);
  const relevant = checks.filter((c) => matchesAny(rel, c.globs) && !matchesAny(rel, c.exclude ?? []));
  if (relevant.length === 0) return 0;

  const result = computeEdit(payload.tool_name, input);
  if (!result) return 0;

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
