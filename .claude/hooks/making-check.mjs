#!/usr/bin/env node
// making-check: a turn ends only when what it wrote is what it said it was making (claude-packs 0.9.0 item 7; KWB-1).
// A Stop hook. It reads the turn from the transcript (lib/turn.mjs: every file written by Write, Edit, MultiEdit,
// NotebookEdit or the shell, refused calls left out) and sends the turn back (exit 2) naming what is missing when:
//   - the turn wrote code or docs that touch a concept of design/shape.json and build.md's In progress entry for this
//     step has no `making:` line, or the line does not name that concept;
//   - the making line names a concept that has no row in design/shape.json, or the turn wrote source with no manifest;
//   - a source file the turn wrote repeats code the repo already has (once-only's detector, lib/dup.mjs, on the lines
//     the working tree adds against HEAD);
//   - THE OVERRIDE RULE: the turn's text says it did something other than what it was told, and cites no law. Told X
//     and a law file (design/shape.json, docs/*-spec.md, docs/laws.md) says Y: do Y, log the brief as the bug, cite the
//     line. No law covers it: ask; overnight, decide and write it under Decisions, and cite that entry. There is no
//     third case where Claude's own judgement overrides an instruction.
// After three send-backs with the same findings the turn ends and the findings go to the user (no endless loop).
//   node making-check.mjs --selftest
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { copyGlobs, excludeGlobs, FIX, isGenerated, isSource, real } from './lib/dup.mjs';
import { judgeWrites } from './lib/dup-index.mjs';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot, insideProject, ROOT } from './lib/project.mjs';
import { readShape } from './lib/shape.mjs';
import { lastTurn, writesOfTurn } from './lib/turn.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const MAX_SENDS = 3;
const NOT_CONCEPTS = new Set(['none', 'no', '-', 'n/a', 'one', 'many', 'ids']);
// the folder kinds a layout marks as code; a layout that marks none: any source file outside its docs folders
const CODE_KINDS = new Set(['code', 'engine', 'ui', 'params', 'tests']);
const NOT_CODE = ['build/**', 'inbox/**', 'docs/**', '**/*.md', '**/*.txt', '**/*.json'];
function isCode(relPath, layout) {
  if (!(isSource(relPath) || /\.ipynb$/i.test(relPath)) || matchesAny(relPath, NOT_CODE)) return false;
  const folders = Object.values(layout?.folders ?? {});
  const docs = folders.filter((f) => f.kind === 'docs' || /^docs?\b/i.test(f.purpose ?? '')).map((f) => `${f.path}/**`);
  if (matchesAny(relPath, docs)) return false;
  const code = folders.filter((f) => CODE_KINDS.has(f.kind)).map((f) => `${f.path}/**`);
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

const splitName = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// each identifier's parts, and the identifier whole: a concept named editPage is the word editpage, not the words edit and page (KF-19, KF-39)
const partsOf = (text) => new Set((text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).flatMap((w) => [...splitName(w), w.toLowerCase()]));
const rowOf = (c) => c?.row ?? c ?? {};
const wordsOf = (name, c) => [name.toLowerCase(), ...(c?.words ?? rowOf(c).words ?? []).map((w) => String(w).toLowerCase())];

// The concepts a text touches: a word of the concept as a word or a part of an identifier, a code pattern, a per-instance
// array, the generator.
export function conceptsIn(text, shape) {
  const parts = partsOf(text);
  const out = new Set();
  for (const [name, c] of Object.entries(shape?.concepts ?? {})) {
    const row = rowOf(c);
    const gen = String(row.generator ?? '').match(/^\s*([A-Za-z_]\w*)\s*\(/)?.[1];
    const hit = wordsOf(name, c).some((w) => parts.has(w))
      || (row.patterns ?? []).some((p) => { try { return new RegExp(p).test(text); } catch { return false; } })
      || (row.arrays ?? []).some((a) => new RegExp(`\\b${a}\\b`).test(text))
      || (gen && new RegExp(`\\b${gen}\\s*\\(`).test(text));
    if (hit) out.add(name);
  }
  return out;
}

// The concepts listed after "concepts:" on a making line that the manifest does not know.
export function unknownConcepts(making, shape) {
  const known = new Set(Object.entries(shape?.concepts ?? {}).flatMap(([n, c]) => wordsOf(n, c)));
  const out = [];
  // bracketed text goes first, nested brackets too, so a ";" inside a shape ("slot (many, 4; slotId(i, field))") does not end the list (KWB-17)
  let flat = making;
  for (let prev; prev !== flat;) { prev = flat; flat = flat.replace(/\([^()]*\)/g, ' '); }
  // the list runs to `reuse:` or the line's end, and a shape word after a concept ("editKnob, many") is what the rule asks for (KF-24)
  for (const m of flat.matchAll(/\bconcepts?\s*:\s*(.*?)(?=\breuse\s*:|\||$)/gim)) {
    for (const item of m[1].split(/[,;]/)) {
      const w = item.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (w && !NOT_CONCEPTS.has(w) && !known.has(w)) out.push(w);
    }
  }
  return out;
}

// The checkout's branch from its HEAD file (a worktree's .git file names its git dir): no git process (KWB-24: on a loaded
// machine each one took half a second)
function branchOf(root) {
  try {
    let dir = join(root, '.git');
    const dotGit = readFileSync(dir, 'utf8').match(/^gitdir:\s*(.+)$/m); // a worktree; a folder throws and is read below
    if (dotGit) dir = resolve(root, dotGit[1].trim());
    return headBranch(dir);
  } catch { return headBranch(join(root, '.git')); }
}
const headBranch = (gitDir) => { try { return readFileSync(join(gitDir, 'HEAD'), 'utf8').match(/^ref:\s*refs\/heads\/(.+)$/m)?.[1].trim() ?? 'HEAD'; } catch { return ''; } };

// The making lines of build.md's In progress section: those on this branch's entry, else every one there.
export function makingLines(root) {
  const file = [join(root, 'build.md'), join(ROOT, 'build.md')].find((f) => existsSync(f));
  if (!file) return [];
  const text = readFileSync(file, 'utf8');
  const at = text.search(/^##\s+In progress\b/im);
  if (at < 0) return [];
  const rest = text.slice(at).split('\n');
  const section = [];
  for (const l of rest.slice(1)) { if (/^##\s/.test(l)) break; section.push(l); }
  const lines = section.filter((l) => /\bmaking:/i.test(l)).map((l) => l.slice(l.search(/\bmaking:/i)));
  const branch = branchOf(root);
  const mine = branch && branch !== 'HEAD' ? section.filter((l) => /\bmaking:/i.test(l) && (l.includes(branch) || l.includes(branch.split('/').pop()))).map((l) => l.slice(l.search(/\bmaking:/i))) : [];
  return mine.length ? mine : lines;
}

// Added line ranges of each file against HEAD (the whole file when it is new or there is no git): two git processes for all
// the files of a checkout, not two per file. -> Map(file -> [[lo, hi]])
function addedRanges(root, files) {
  const rels = files.map((f) => relative(root, f));
  const out = new Map();
  const tracked = new Set((spawnSync('git', ['-C', root, 'ls-files', '--', ...rels], { encoding: 'utf8' }).stdout ?? '').split('\n').filter(Boolean));
  const diff = tracked.size ? spawnSync('git', ['-C', root, 'diff', '--relative', '-U0', 'HEAD', '--', ...rels.filter((r) => tracked.has(r))], { encoding: 'utf8' }).stdout ?? '' : '';
  let cur = null;
  for (const line of diff.split('\n')) {
    const f = line.match(/^\+\+\+ b\/(.+)$/);
    if (f) { cur = f[1]; continue; }
    const h = line.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
    if (h && cur) { const r = [Number(h[1]), Number(h[1]) + Number(h[2] ?? 1) - 1]; if (r[1] >= r[0]) out.set(cur, [...(out.get(cur) ?? []), r]); }
  }
  const lines = (f) => { try { return readFileSync(f, 'utf8').split('\n').length; } catch { return 0; } };
  return new Map(files.map((f, i) => [f, tracked.has(rels[i]) ? out.get(rels[i]) ?? [] : lines(f) ? [[1, lines(f)]] : []]));
}

export function check(event, cwd = event.cwd ?? process.cwd()) {
  const path = event.hook_event_name === 'SubagentStop' ? event.agent_transcript_path ?? event.transcript_path : event.transcript_path;
  const turn = lastTurn(path ?? '');
  const text = `${turn.text}\n${event.last_assistant_message ?? ''}`;
  const writes = writesOfTurn(turn, cwd).filter((w) => insideProject(w.path));
  const problems = [];
  const rel = (p) => relative(checkoutRoot(p), p).replace(/\\/g, '/');
  // Each write is judged against its own checkout (a worktree's own build.md, manifest and layout), never the session's folder:
  // a lead in the main checkout writing in a worktree has its making line in that worktree's build.md (Stellix WB-86).
  const byRoot = new Map();
  for (const w of writes) { const r = checkoutRoot(w.path); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(w); }
  if (!byRoot.size) byRoot.set(checkoutRoot(join(cwd, 'x')), []);
  const judged = [];
  let shape = null, root = null, layout = null;
  for (const [r, ws] of byRoot) {
    const lay = readLayout(r);
    const sh = readShape(r) ?? readShape(ROOT);
    const mine = ws.filter((w) => !matchesAny(rel(w.path), [...PLAN, ...excludeGlobs(lay, sh)]));
    // once-only (below) judges the checkout the source went to: the first checkout that holds a judged source
    if (!root || (mine.some((w) => isSource(w.path)) && !judged.some((w) => isSource(w.path)))) { root = r; layout = lay; shape = sh; }
    judged.push(...mine);

    // 1. the concepts written, the making line, the manifest
    if (!sh && mine.some((w) => isSource(w.path))) {
      problems.push(`no design/shape.json, and this turn wrote source (${[...new Set(mine.filter((w) => isSource(w.path)).map((w) => rel(w.path)))].slice(0, 4).join(', ')}): write the manifest first, every concept one or many, its generator, its selectors`);
    }
    if (sh && !sh.error && mine.length) {
      const written = new Map();
      // only code is judged for its concepts: a note, a brief, a doc or a log names concepts in words ("Status line"), and that is no
      // undeclared use (KWB-19)
      // and only a word the file still holds at Stop: an edit that put a word in and a later one that took it out leave none written (KWB-122)
      const standing = new Map();
      const holds = (p) => { if (!standing.has(p)) { try { standing.set(p, conceptsIn(readFileSync(p, 'utf8'), sh)); } catch { standing.set(p, null); } } return standing.get(p); };
      for (const w of mine) if (isCode(rel(w.path), lay)) for (const c of conceptsIn(w.text ?? '', sh)) if (!written.has(c) && (holds(w.path)?.has(c) ?? true)) written.set(c, rel(w.path));
      const making = makingLines(r).join('\n');
      const wroteSource = mine.filter((w) => isSource(w.path)).map((w) => rel(w.path));
      // a turn that writes source answers "what are you making" first, even before the manifest knows the concept
      if (!making && (written.size || wroteSource.length)) problems.push(`build.md's In progress entry for this step has no "making:" line, and this turn wrote ${written.size ? [...written].map(([c, f]) => `${c} (${f})`).join(', ') : [...new Set(wroteSource)].slice(0, 4).join(', ')}: write the line (what you are making; concepts: each with its shape; reuse: the one function, where it lives)`);
      else if (making) {
        const named = conceptsIn(making, sh);
        for (const [c, f] of written) if (!named.has(c)) problems.push(`the making line does not name ${c}, which this turn wrote (${f}): add it with its shape from design/shape.json, or take the write back`);
        for (const u of unknownConcepts(making, sh)) problems.push(`the making line names "${u}", which has no row in design/shape.json: add the row first (one or many, its generator, its selectors)`);
      }
    }
  }

  // 2. once-only on the source the turn wrote. The tools' writes passed once-only itself when it is installed; running its detector again on them at
  // every Stop cost over the kit's own 500 ms line (KF-33). The shell's writes stay: much of what they write is unknown at write time.
  const atWrite = existsSync(join(claudeRoot(join(cwd, 'x')), '.claude/hooks/once-only.mjs'));
  const sources = [...new Set(judged.filter((w) => isSource(w.path) && existsSync(w.path) && !(atWrite && w.tool !== 'Bash')).map((w) => w.path))]
    .filter((p) => !matchesAny(rel(p), copyGlobs(layout)) && !isGenerated(readFileSync(p, 'utf8')));
  if (sources.length) {
    // once-only's index finds the candidates, jscpd confirms on those files alone (lib/dup-index.mjs; KWB-24: no whole-repo scan)
    const added = addedRanges(root, sources);
    const writes = sources.map((p) => ({ path: p, after: readFileSync(p, 'utf8'), ranges: added.get(p) })).filter((w) => w.ranges.length);
    const r = writes.length ? judgeWrites(root, writes, { layout, shape }) : { clones: [] };
    if (r.error) problems.push(`once-only could not judge this turn's writes: ${r.error}`);
    const base = real(root);
    const show = (s) => `${relative(base, s.file)}:${s.start}-${s.end}`;
    const found = new Set();
    for (const c of r.clones) found.add(`${show(c.at)} repeats ${show(c.other)} (${c.lines} lines)`);
    if (found.size) problems.push(`this turn's writes did not pass once-only: ${[...found].slice(0, 5).join('; ')}. ${FIX}`);
  }

  // 3. the override rule
  const claims = text.replace(/"[^"\n]*"|`[^`\n]*`/g, '""'); // a quotation reports words, it claims nothing (KWB-47)
  const said = OVERRIDE.map((re) => claims.match(re)).find(Boolean);
  if (said) {
    const cites = text.split('\n').some((l) => [...l.matchAll(LAW)].some((m) => LOCATOR.test(l.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60))));
    const decided = /\bDecisions?\b/.test(text) && writes.some((w) => /decisions/i.test(w.path) || (existsSync(w.path) && /^#+\s*Decisions\b/im.test(readFileSync(w.path, 'utf8'))));
    const logged = writes.some((w) => /(?:^|\/)(?:workflow-)?bugs\.md$/.test(w.path)) || /\b(?:K?WB|B)-\d+\b/.test(text);
    const quote = `"${said[0].slice(0, 120)}"`;
    if (!cites && !decided) problems.push(`the turn says it did something other than it was told (${quote}) and cites no law. Told X and a law file says Y: do Y, log the brief as the bug, cite the line (design/shape.json "<concept>", docs/<name>-spec.md {#anchor}, docs/laws.md L<n>). No law covers it: ask; overnight, decide and write it under Decisions and cite that entry. Claude's own judgement never overrides an instruction`);
    else if (cites && !decided && !logged) problems.push(`the turn overrode what it was told by a law (${quote}) but did not log the brief as the bug: log it in bugs.md or workflow-bugs.md and name its number`);
  }
  return problems;
}

// Three send-backs with the same findings end the turn: the findings go to the user instead of looping.
function guard(event, problems) {
  const file = join(process.env.TMPDIR ?? tmpdir(), `making-check-${String(event.session_id ?? 'session').replace(/[^\w-]/g, '')}.json`);
  let st = {};
  try { st = JSON.parse(readFileSync(file, 'utf8')); } catch { /* first */ }
  const hash = createHash('sha1').update(problems.join('\n')).digest('hex');
  // consecutive stops with the same findings count whether or not the host marks them as a continuation (stop_hook_active):
  // a host that delivers each send-back as a new turn reset the count to 1 every time, and the limit was never reached (KWB-7)
  const count = problems.length && st.hash === hash ? (st.count ?? 0) + 1 : problems.length ? 1 : 0;
  try { writeFileSync(file, JSON.stringify({ hash, count })); } catch { /* the check still runs */ }
  return count > MAX_SENDS;
}

async function main(text) {
  let event;
  try { event = JSON.parse(text); } catch { return 0; }
  if (event.hook_event_name && !['Stop', 'SubagentStop'].includes(event.hook_event_name)) return 0;
  const problems = check(event);
  if (!problems.length) { guard(event, []); return 0; }
  if (guard(event, problems)) {
    process.stdout.write(JSON.stringify({ systemMessage: `making-check sent this turn back ${MAX_SENDS} times with the same findings; it ends here for you to decide:\n- ${problems.join('\n- ')}` }));
    return 0;
  }
  process.stderr.write(`making-check sent this turn back:\n- ${problems.join('\n- ')}\n`);
  return 2;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) {
  process.exit(process.argv.includes('--selftest') ? await (await import('./lib/making-check-selftest.mjs')).selftest(import.meta.url) : await asHook('making-check', main));
}
