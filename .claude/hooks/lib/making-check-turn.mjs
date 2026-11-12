// What making-check finds wrong with the turn that just ended (claude-packs 0.9.0 item 7; KWB-1): `check(event, ctx)` returns each
// problem as a line. Split out of the hook (typescript W4) so the judge (making-check) and the recorder that counts its send-backs
// (making-check-count) read the turn one way and neither repeats it. It reads the transcript and the checkout's files, and
// writes nothing; the project, the folder and the environment come in as `ctx`.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { copyGlobs, excludeGlobs, FIX, isGenerated, isSource, realPath } from './dup.mjs';
import { judgeCopyWrites } from './dup-index.mjs';
import { gitLines, gitRun } from './git-run.mjs';
import { matchesAny } from './glob.mjs';
import { readLayout } from './layout.mjs';
import { conceptsIn, makingLines, unknownConcepts } from './making-concepts.mjs';
import { checkoutRoot, claudeRoot, insideProject, relInCheckout } from './project.mjs';
import { readShape } from './shape.mjs';
import { emittedFrom } from './source-exts.mjs';
import { lastTurn, writesOfTurn } from './turn.mjs';
// the folder kinds a layout marks as code; a layout that marks none: any source file outside its docs folders
const CODE_KINDS = new Set(['code', 'engine', 'ui', 'params', 'tests']);
const NOT_CODE = ['build/**', 'inbox/**', 'docs/**', '**/*.md', '**/*.txt', '**/*.json'];
function isCode(relPath, layout) {
    if (!(isSource(relPath) || /\.ipynb$/i.test(relPath)) || matchesAny(relPath, NOT_CODE))
        return false;
    const folders = Object.values(layout.folders);
    const docs = folders.filter((f) => f.kind === 'docs' || /^docs?\b/i.test(f.purpose ?? '')).map((f) => `${f.path}/**`);
    if (matchesAny(relPath, docs))
        return false;
    const code = folders.filter((f) => f.kind !== undefined && CODE_KINDS.has(f.kind)).map((f) => `${f.path}/**`);
    return !code.length || matchesAny(relPath, code);
}
const PLAN = ['build.md', '**/build.md', 'bugs.md', 'workflow-bugs.md', 'CHANGELOG.md', 'design/shape.json', '.claude/**'];
const LAW = /(?:design\/)?shape\.json|(?:docs\/)?[\w.-]*-spec\.md|(?:docs\/)?laws\.md/g;
const LOCATOR = /:\d+\b|#[\w-]+|\{#[\w-]+\}|§\s*\d[\d.]*|\bL-?\d+\b|\b(?:section|line|row|rule|law)\s+["'`]?[\w.-]+|"[\w -]{2,40}"\s+row/i;
// The turn says it did something other than it was told.
const OVERRIDE = [
    /\b(?:instead of|rather than|not)\s+(?:what\s+)?(?:the\s+)?(?:brief|prompt|order|instruction|request|work ?order|lead|you)\s+(?:asked|said|told|wanted|named|specified)/i,
    /\b(?:the\s+)?(?:brief|prompt|order|instruction|request|work ?order|lead)\s+(?:said|asked|told|wanted|named|specified)\b[^.\n]{0,160}\b(?:but|however|instead)\b/i,
    /\byou\s+(?:said|asked|told me|wanted)\b[^.\n]{0,160}\b(?:but I|however I|instead I|I instead)\b(?!['’]d\b|\s+(?:would|think|recommend|suggest|expect|believe)\b)/i, // a view is not an action (KWB-47)
    /\bI\s+(?:deviated|departed|diverged)\s+from\b/i,
    /\b(?:overrode|overriding|override[sd]?)\s+(?:the\s+|your\s+)?(?:brief|instruction|order|prompt|request|work ?order)/i,
    /\bcontrary\s+to\s+(?:the\s+|your\s+)?(?:brief|instruction|order|prompt|request|work ?order)/i,
    /\b(?:did\s+not|didn't)\s+(?:follow|do\s+what)\s+(?:the\s+|your\s+)?(?:brief|instruction|order|prompt|request|work ?order|you)/i,
];
// Added line ranges of each file against HEAD (the whole file when it is new or there is no git): two git processes for all
// the files of a checkout, not two per file. -> Map(file -> [[lo, hi]])
function addedRanges(root, files, env) {
    const rels = files.map((f) => relative(root, f));
    const out = new Map();
    const tracked = new Set(gitLines(['ls-files', '--', ...rels], { cwd: root, env }));
    const diffArgs = ['diff', '--relative', '-U0', 'HEAD', '--', ...rels.filter((r) => tracked.has(r))];
    const diff = tracked.size ? gitRun(diffArgs, { cwd: root, env }).stdout : '';
    let cur = null;
    for (const line of diff.split('\n')) {
        const f = line.match(/^\+\+\+ b\/(.+)$/);
        if (f) {
            cur = f[1] ?? null;
            continue;
        }
        const h = line.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
        if (h && cur) {
            const lo = Number(h[1]);
            const hi = lo + Number(h[2] ?? 1) - 1;
            if (hi >= lo)
                out.set(cur, [...(out.get(cur) ?? []), [lo, hi]]);
        }
    }
    const lines = (f) => { try {
        return readFileSync(f, 'utf8').split('\n').length;
    }
    catch {
        return 0;
    } };
    return new Map(files.map((f, i) => {
        const rel = rels[i] ?? f;
        return [f, tracked.has(rel) ? out.get(rel) ?? [] : lines(f) ? [[1, lines(f)]] : []];
    }));
}
/** The manifest as the duplicate finder reads it: only its exclude list. */
const excludesOf = (sh) => (sh ? { concepts: {}, exclude: sh.exclude } : null);
/** Problems 1: the concepts the turn's writes touch, against the making line and the manifest, in one checkout. */
function writtenConceptProblems(root, writes, at, rel) {
    const problems = [];
    const lay = readLayout(root);
    const sh = readShape(root) ?? readShape(at.projectDir);
    const mine = writes.filter((w) => !matchesAny(rel(w.path), [...PLAN, ...excludeGlobs(lay, excludesOf(sh))]));
    const sourceNames = [...new Set(mine.filter((w) => isSource(w.path)).map((w) => rel(w.path)))];
    if (!sh && sourceNames.length) {
        problems.push(`no design/shape.json, and this turn wrote source (${sourceNames.slice(0, 4).join(', ')}): ` +
            'write the manifest first, every concept one or many, its generator, its selectors');
    }
    if (!sh || sh.error || !mine.length)
        return { problems, judged: mine };
    const written = new Map();
    // only code is judged for its concepts: a note, a brief, a doc or a log names concepts in words ("Status line"), and that is no
    // undeclared use (KWB-19)
    // and only a word the file still holds at Stop: an edit that put a word in and a later one that took it out leave none written (KWB-122)
    const standing = new Map();
    const holds = (p) => {
        if (!standing.has(p)) {
            try {
                standing.set(p, conceptsIn(readFileSync(p, 'utf8'), sh));
            }
            catch {
                standing.set(p, null);
            }
        }
        return standing.get(p) ?? null;
    };
    for (const w of mine) {
        if (!isCode(rel(w.path), lay))
            continue;
        for (const c of conceptsIn(w.text ?? '', sh))
            if (!written.has(c) && (holds(w.path)?.has(c) ?? true))
                written.set(c, rel(w.path));
    }
    const making = makingLines(root, at.projectDir).join('\n');
    const wroteSource = [...new Set(mine.filter((w) => isSource(w.path)).map((w) => rel(w.path)))];
    // a turn that writes source answers "what are you making" first, even before the manifest knows the concept
    if (!making && (written.size || wroteSource.length)) {
        const what = written.size ? [...written].map(([c, f]) => `${c} (${f})`).join(', ') : wroteSource.slice(0, 4).join(', ');
        problems.push(`build.md's In progress entry for this step has no "making:" line, and this turn wrote ${what}: ` +
            'write the line (what you are making; concepts: each with its shape; reuse: the one function, where it lives)');
    }
    else if (making) {
        const named = conceptsIn(making, sh);
        for (const [c, f] of written) {
            if (!named.has(c))
                problems.push(`the making line does not name ${c}, which this turn wrote (${f}): add it with its shape from design/shape.json, or take the write back`);
        }
        for (const u of unknownConcepts(making, sh)) {
            problems.push(`the making line names "${u}", which has no row in design/shape.json: add the row first (one or many, its generator, its selectors)`);
        }
    }
    return { problems, judged: mine };
}
/** Problems 2: once-only on the source the turn wrote, each checkout against its own index, layout and manifest (KWB-155). */
function copyProblems(roots, judged, at, rel, atWrite) {
    // The tools' writes passed once-only itself when it is installed; running its detector again on them at every Stop cost over the
    // kit's own 500 ms line (KF-33). The shell's writes stay: much of what they write is unknown at write time.
    // an emitted twin beside its source is the build's output, never a copy (KWB-170, KWB-183)
    const isOwnSource = (path) => isSource(path) && existsSync(path) && emittedFrom(path) === null;
    const sources = [...new Set(judged.filter((w) => isOwnSource(w.path) && !(atWrite && w.tool !== 'Bash')).map((w) => w.path))];
    const found = new Set();
    const problems = [];
    for (const root of roots) {
        const layout = readLayout(root);
        const shape = excludesOf(readShape(root) ?? readShape(at.projectDir));
        const own = (p) => checkoutRoot(at.projectDir, p, at.cwd) === root && !matchesAny(rel(p), copyGlobs(layout)) && !isGenerated(readFileSync(p, 'utf8'));
        const mine = sources.filter(own);
        if (!mine.length)
            continue;
        // once-only's index finds the candidates, jscpd confirms on those files alone (lib/dup-index.mjs; KWB-24: no whole-repo scan)
        const added = addedRanges(root, mine, at.env);
        const writes = mine.map((p) => ({ path: p, after: readFileSync(p, 'utf8'), ranges: added.get(p) ?? [] })).filter((w) => w.ranges.length);
        const r = writes.length ? judgeCopyWrites(root, writes, { env: at.env, layout, shape }) : { clones: [], error: undefined };
        if (r.error)
            problems.push(`once-only could not judge this turn's writes: ${r.error}`);
        const base = realPath(root);
        const show = (s) => `${relative(base, s.file)}:${s.start}-${s.end}`;
        for (const c of r.clones)
            found.add(`${show(c.at)} repeats ${show(c.other)} (${c.lines} lines)`);
    }
    if (found.size)
        problems.push(`this turn's writes did not pass once-only: ${[...found].slice(0, 5).join('; ')}. ${FIX}`);
    return problems;
}
const NO_LAW = 'and cites no law. Told X and a law file says Y: do Y, log the brief as the bug, cite the line ' +
    '(design/shape.json "<concept>", docs/<name>-spec.md {#anchor}, docs/laws.md L<n>). No law covers it: ask; overnight, ' +
    "decide and write it under Decisions and cite that entry. Claude's own judgement never overrides an instruction";
const decidedIn = (writes) => writes.some((w) => /decisions/i.test(w.path) || (existsSync(w.path) && /^#+\s*Decisions\b/im.test(readFileSync(w.path, 'utf8'))));
/** Problems 3: the override rule. The turn's text says it did something other than it was told, and cites no law. */
function overrideProblems(text, writes) {
    const claims = text.replace(/"[^"\n]*"|`[^`\n]*`/g, '""'); // a quotation reports words, it claims nothing (KWB-47)
    const said = OVERRIDE.map((re) => claims.match(re)).find(Boolean);
    if (!said)
        return [];
    const near = (l, m) => l.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + m[0].length + 60);
    const cites = text.split('\n').some((l) => [...l.matchAll(LAW)].some((m) => LOCATOR.test(near(l, m))));
    const decided = /\bDecisions?\b/.test(text) && decidedIn(writes);
    const logged = writes.some((w) => /(?:^|\/)(?:workflow-)?bugs\.md$/.test(w.path)) || /\b(?:K?WB|B)-\d+\b/.test(text);
    const quote = `"${said[0].slice(0, 120)}"`;
    if (!cites && !decided)
        return [`the turn says it did something other than it was told (${quote}) ${NO_LAW}`];
    if (cites && !decided && !logged)
        return [`the turn overrode what it was told by a law (${quote}) but did not log the brief as the bug: log it in bugs.md or workflow-bugs.md and name its number`];
    return [];
}
/** Every problem with the turn that ended at `event`, one line each; none when the turn is what it said it was making. */
export function check(event, ctx) {
    const cwd = event.cwd ?? ctx.cwd;
    const stopped = event['agent_transcript_path'];
    const path = event.hook_event_name === 'SubagentStop' && typeof stopped === 'string' ? stopped : event.transcript_path;
    const turn = lastTurn(path ?? '');
    const text = `${turn.text}\n${event.last_assistant_message ?? ''}`;
    const writes = writesOfTurn(turn, cwd, ctx.env).filter((w) => insideProject(ctx.projectDir, w.path, ctx.cwd));
    const rel = (p) => relInCheckout(ctx.projectDir, p, ctx.cwd);
    // Each write is judged against its own checkout (a worktree's own build.md, manifest and layout), never the session's folder:
    // a lead in the main checkout writing in a worktree has its making line in that worktree's build.md (Stellix WB-86).
    const byRoot = new Map();
    for (const w of writes) {
        const r = checkoutRoot(ctx.projectDir, w.path, ctx.cwd);
        byRoot.set(r, [...(byRoot.get(r) ?? []), w]);
    }
    if (!byRoot.size)
        byRoot.set(checkoutRoot(ctx.projectDir, join(cwd, 'x'), ctx.cwd), []);
    const problems = [];
    const judged = [];
    for (const [root, ws] of byRoot) {
        const r = writtenConceptProblems(root, ws, ctx, rel);
        problems.push(...r.problems);
        judged.push(...r.judged);
    }
    const atWrite = existsSync(join(claudeRoot(ctx.projectDir, join(cwd, 'x'), ctx.cwd), '.claude/hooks/once-only.mjs'));
    return [...problems, ...copyProblems(byRoot.keys(), judged, ctx, rel, atWrite), ...overrideProblems(text, writes)];
}
