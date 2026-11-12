// Every bug that was found once becomes a check here, so it can never come back.
// Checks live in .claude/checks/*.json (one lesson per file):
//   { "id", "why", "rule", "globs": [...], "exclude": [...], "pattern": "<regex>", "flags": "",
//     "code": true,            // match against code with comments/strings blanked (C/C++/JS)
//     "bad": "<snippet the check must catch>", "good": "<fixed snippet it must pass>",
//     "examples": [{ "bad", "good" }, ...],   // more pairs, each proved like the first: a pattern widened to another language
//                                              // brings that language's pair (admiral-fleet W2: the tenant checks in Go)
//     "mode": "forbid" (default) | "require" | "needs",  "needs": ["<regex>", ...] }
//   "code": true blanks comments and strings before matching; "strings": true blanks comments only (a check that reads string literals);
//   "prose": true blanks what a reader does not read as prose in markdown: code, URLs, frontmatter (a check on public text)
//   "language": "rust" blanks with that row of the language table instead, for a language C's blanker misreads (a Rust lifetime reads as a char
//   literal there, KWB-75); "notInTests": true also leaves out what that language marks as a test, for a test that lives in the file it tests
//   mode "needs": when the pattern appears, every regex in "needs" must appear as well (an entry file that listens also
//   registers shutdown; a gateway that creates a MongoClient also caches and names it). A write is refused only for a need
//   it newly leaves missing.
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): blocks a write that ADDS a match, by any route (a tool,
// or the shell's >, >>, tee, sed -i, cp, mv, a heredoc; lib/writes.mts).  --selftest: proves every check.
// A judge on the hook contract (typescript order W4): hook(event, ctx) returns its Verdict and writes nothing. The CLI imports
// loadChecks, hitsOf and selftest(checks) from a project's install (scan, InstalledLessonChecksModule in types.d.mts).
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readCompiled } from './lib/checks-compiled.mjs';
import { blankCode } from './lib/cpp-scan.mjs';
import { isContent } from './lib/content.mjs';
import { matchesAny } from './lib/glob.mjs';
import { isMain, projectRoot, runAsHook } from './lib/hook-log.mjs';
import { readJson } from './lib/json.mjs';
import { languageNamed } from './lib/languages.mjs';
import { conceptGlobs, readLayout, resolveAliases } from './lib/layout.mjs';
import { blankProse } from './lib/prose.mjs';
import { checkoutRoot, claudeRoot, insideProject } from './lib/project.mjs';
import { verdicts } from './lib/selftest.mjs';
import { pass, refuse } from './lib/verdict.mjs';
import { writesOf } from './lib/writes.mjs';
// "concepts": [...] resolve through .claude/layout.json, the same map the rules trigger from.
// A worktree file is judged by its own checkout's checks and layout (claudeRoot).
// "whenDep": { "zod": 4 }: a check for that major version on. A project that pins an older one is left alone; one that names none is judged.
function majorsOf(root, dep) {
    const files = [join(root, 'package.json')];
    try {
        for (const p of readdirSync(join(root, 'packages')))
            files.push(join(root, 'packages', p, 'package.json'));
    }
    catch { /* not a workspace */ }
    return files.flatMap((f) => {
        const pkg = readJson(f);
        const v = pkg?.dependencies?.[dep] ?? pkg?.devDependencies?.[dep];
        return v ? [Number(String(v).match(/\d+/)?.[0])] : [];
    });
}
const appliesTo = (root, c) => Object.entries(c.whenDep ?? {}).every(([dep, major]) => { const found = majorsOf(root, dep); return !found.length || found.some((m) => m >= major); });
// "replaces": [ids]: when both are installed, the wider check stands and the narrower one is left out, so a hit is reported once.
const withoutReplaced = (checks) => { const gone = new Set(checks.flatMap((c) => c.replaces ?? [])); return checks.filter((c) => !gone.has(c.id)); };
/** A check file's text as a check, with its file name; a file that is not JSON is a crash, as it always was (the runner says so). */
function readCheck(dir, file) {
    const raw = readJson(join(dir, file));
    if (raw === null)
        throw new Error(`${join(dir, file)} is not JSON`);
    return { ...raw, file };
}
/** Every check installed in a project (or a worktree's own copy), globs and excludes resolved through its layout. */
export function loadChecks(root) {
    const dir = join(root, '.claude', 'checks');
    let files = [];
    try {
        files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    }
    catch {
        return [];
    }
    const layout = readLayout(root);
    // the checks compiled at update, while their key is the folder's now (checks-compiled.mts); else the files, as always
    const read = readCompiled(root) ?? files.map((f) => readCheck(dir, f));
    return withoutReplaced(read.filter((c) => appliesTo(root, c)).map((c) => {
        const fromConcepts = (c.concepts ?? []).flatMap((k) => conceptGlobs(layout, k) ?? []);
        return { ...c, globs: [...resolveAliases(layout, c.globs ?? []), ...fromConcepts], exclude: resolveAliases(layout, c.exclude ?? []) };
    }));
}
// What a check reads: one blanking per kind. strings: comments blanked, strings kept.
const BLANKING = { prose: blankProse, code: blankCode, strings: (text) => blankCode(text, true) };
function subjectOf(c, text) {
    const row = c.language ? languageNamed(c.language) : null;
    if (row)
        return c.notInTests && row.withoutTests ? row.withoutTests(row.blank(text)) : row.blank(text);
    const kind = ['prose', 'code', 'strings'].find((k) => c[k]);
    return kind ? BLANKING[kind](text) : text;
}
// Every match: its line number and that line's text.
function matchLines(check, text) {
    const subject = subjectOf(check, text);
    const re = new RegExp(check.pattern, `${(check.flags ?? '').replace('g', '')}g`);
    const lines = text.split('\n');
    const found = [];
    let m;
    while ((m = re.exec(subject)) !== null) {
        const line = subject.slice(0, m.index).split('\n').length;
        found.push({ line, text: lines[line - 1]?.trim() ?? '' });
        if (m[0].length === 0)
            re.lastIndex += 1;
    }
    return found;
}
const matchedTexts = (check, text) => matchLines(check, text).map((m) => m.text);
// The needs a text that has the pattern does not meet ([] when the pattern is absent).
function unmetNeeds(c, text) {
    if (matchedTexts(c, text).length === 0)
        return [];
    const subject = subjectOf(c, text);
    return (c.needs ?? []).filter((n) => !new RegExp(n, (c.flags ?? '').replace('g', '')).test(subject));
}
// One entry per mode: whether a text breaks the check, and what a write newly breaks (before -> after).
// "forbid" (default): the pattern must not appear.  "require": it must not disappear.  "needs": see above.
const MODES = {
    forbid: {
        violates: (c, text) => matchedTexts(c, text).length > 0,
        added: (c, before, after) => { const had = new Set(matchedTexts(c, before)); return matchedTexts(c, after).filter((t) => !had.has(t)); },
    },
    require: {
        violates: (c, text) => matchedTexts(c, text).length === 0,
        added: (c, before, after) => (matchedTexts(c, before).length > 0 && matchedTexts(c, after).length === 0 ? [`removes required: ${c.pattern}`] : []),
    },
    needs: {
        violates: (c, text) => unmetNeeds(c, text).length > 0,
        added: (c, before, after) => { const had = unmetNeeds(c, before); return unmetNeeds(c, after).filter((n) => !had.includes(n)).map((n) => `has ${c.pattern} but is missing: ${n}`); },
    },
};
const modeOf = (c) => MODES[c.mode ?? 'forbid'];
const violates = (c, text) => modeOf(c)?.violates(c, text) ?? false;
/** What a whole file breaks, for `claude-packs scan`: forbid's matches, a needs check's gaps. "require" judges a removal, so it has none. */
export function hitsOf(c, text) {
    if (c.mode === 'require')
        return [];
    if (c.mode === 'needs')
        return unmetNeeds(c, text).map((n) => ({ line: 1, text: `missing: ${n}` }));
    return matchLines(c, text);
}
function problemsOfCheck(c) {
    const problems = [];
    for (const [i, pair] of [c, ...(c.examples ?? [])].entries()) {
        const which = i ? ` (examples[${i - 1}])` : '';
        if (!pair.bad || !pair.good) {
            problems.push(`${c.file}: needs both "bad" and "good" examples${which}`);
            continue;
        }
        if (!violates(c, pair.bad))
            problems.push(`${c.file}: does not catch its "bad" example${which}`);
        if (violates(c, pair.good))
            problems.push(`${c.file}: wrongly flags its "good" example${which}`);
    }
    for (const k of ['id', 'why', 'globs', 'pattern'])
        if (!c[k])
            problems.push(`${c.file}: missing "${k}"`);
    if (!modeOf(c))
        problems.push(`${c.file}: unknown mode "${c.mode}" (forbid, require or needs)`);
    if (c.mode === 'needs' && !c.needs?.length)
        problems.push(`${c.file}: mode needs without "needs"`);
    return problems;
}
export function selftest(checks) {
    if (checks)
        return checks.flatMap(problemsOfCheck);
    return verdicts('lesson-checks', loadChecks(projectRoot()).map((c) => [c.file, problemsOfCheck(c).join('; '), '']));
}
function judgeFile(root, base, file, before, after) {
    const checks = loadChecks(claudeRoot(root, file, base));
    const rel = relative(checkoutRoot(root, file, base), file);
    const published = isContent(rel, readLayout(claudeRoot(root, file, base)));
    const relevant = checks.filter((c) => matchesAny(rel, c.globs ?? []) && !matchesAny(rel, c.exclude ?? []) && (!published || c.prose));
    if (relevant.length === 0)
        return null;
    const hits = relevant.flatMap((c) => (modeOf(c)?.added(c, before, after) ?? []).map((text) => ({ c, text })));
    if (hits.length === 0)
        return null;
    const msg = hits
        .slice(0, 10)
        .map(({ c, text }) => `  [${c.id}] ${c.why}\n      ${text}${c.rule ? `\n      see ${c.rule}` : ''}`)
        .join('\n');
    return `BLOCKED by lesson-checks in ${rel}: this edit brings back a known bug.\n${msg}\n`;
}
export const hook = (event, ctx) => {
    for (const w of writesOf(event, ctx.cwd, ctx.env)) {
        if (w.after === null || !insideProject(ctx.projectDir, w.path, ctx.cwd))
            continue;
        const refusal = judgeFile(ctx.projectDir, ctx.cwd, w.path, w.before ?? '', w.after);
        if (refusal)
            return refuse(refusal);
    }
    return pass;
};
/** A check judges a file in a worktree by the worktree's own checks, not main's: the worktree's branch added one. */
export const worktreeCase = {
    files: {
        '{wt}/.claude/checks/no-forbidden.json': '{"id":"no-forbidden","why":"a planted lesson","globs":["src/engine/**"],"pattern":"forbidden\\\\(","bad":"forbidden(x);","good":"allowed(x);"}',
    },
    steps: [
        { label: 'the worktree\'s own check refuses what it forbids', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/engine/Filter.cpp', content: 'void f() { forbidden(x); }\n' } }, want: 2 },
        { label: 'main has no such check', event: { tool_name: 'Write', tool_input: { file_path: '{here}/src/engine/Filter.cpp', content: 'void f() { forbidden(x); }\n' } }, want: 0 },
        { label: 'a clean write in the worktree passes', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/engine/Filter.cpp', content: 'void f() { allowed(x); }\n' } }, want: 0 },
    ],
};
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'lesson-checks', hook, selftest);
