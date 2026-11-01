#!/usr/bin/env node
// making-check: a turn ends only when what it wrote is what it said it was making (Tim, claude-packs 0.9.0 item 7; KWB-1).
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
import { join, relative } from 'node:path';
import { clonesOf, copyGlobs, excludeGlobs, FIX, isGenerated, isSource, real, scan } from './lib/dup.mjs';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, insideProject, ROOT } from './lib/project.mjs';
import { readShape } from './lib/shape.mjs';
import { lastTurn, writesOfTurn } from './lib/turn.mjs';

const MAX_SENDS = 3;
const PLAN = ['build.md', '**/build.md', 'bugs.md', 'workflow-bugs.md', 'CHANGELOG.md', 'design/shape.json', '.claude/**'];
const LAW = /(?:design\/)?shape\.json|(?:docs\/)?[\w.-]*-spec\.md|(?:docs\/)?laws\.md/g;
const LOCATOR = /:\d+\b|#[\w-]+|\{#[\w-]+\}|§\s*\d[\d.]*|\bL-?\d+\b|\b(?:section|line|row|rule|law)\s+["'`]?[\w.-]+|"[\w -]{2,40}"\s+row/i;
// The turn says it did something other than it was told.
const OVERRIDE = [
  /\b(?:instead of|rather than|not)\s+(?:what\s+)?(?:the\s+)?(?:brief|prompt|order|instruction|request|work ?order|lead|Tim|you)\s+(?:asked|said|told|wanted|named|specified)/i,
  /\b(?:the\s+)?(?:brief|prompt|order|instruction|request|work ?order|lead)\s+(?:said|asked|told|wanted|named|specified)\b[^.\n]{0,160}\b(?:but|however|instead)\b/i,
  /\b(?:you|Tim)\s+(?:said|asked|told me|wanted)\b[^.\n]{0,160}\b(?:but I|however I|instead I|I instead)\b/i,
  /\bI\s+(?:deviated|departed|diverged)\s+from\b/i,
  /\b(?:overrode|overriding|override[sd]?)\s+(?:the\s+|your\s+|Tim's\s+)?(?:brief|instruction|order|prompt|request|work ?order)/i,
  /\bcontrary\s+to\s+(?:the\s+|your\s+|Tim's\s+)?(?:brief|instruction|order|prompt|request|work ?order)/i,
  /\b(?:did\s+not|didn't)\s+(?:follow|do\s+what)\s+(?:the\s+|your\s+|Tim's\s+)?(?:brief|instruction|order|prompt|request|work ?order|you)/i,
];

const splitName = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const partsOf = (text) => new Set((text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).flatMap(splitName));
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
  for (const m of making.matchAll(/\bconcepts?\s*:\s*([^;|]+)/gi)) {
    for (const item of m[1].replace(/\([^)]*\)/g, ' ').split(',')) {
      const w = item.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (w && !['none', 'no', '-', 'n/a'].includes(w) && !known.has(w)) out.push(w);
    }
  }
  return out;
}

const branchOf = (root) => spawnSync('git', ['-C', root, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).stdout?.trim() ?? '';

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

// Added line ranges of a file against HEAD (the whole file when it is new or there is no git).
function addedRanges(root, file) {
  const rel = relative(root, file);
  const lines = (() => { try { return readFileSync(file, 'utf8').split('\n').length; } catch { return 0; } })();
  const tracked = spawnSync('git', ['-C', root, 'ls-files', '--error-unmatch', '--', rel], { encoding: 'utf8' }).status === 0;
  if (!tracked) return lines ? [[1, lines]] : [];
  const d = spawnSync('git', ['-C', root, 'diff', '-U0', 'HEAD', '--', rel], { encoding: 'utf8' }).stdout ?? '';
  return [...d.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)].map((m) => [Number(m[1]), Number(m[1]) + Number(m[2] ?? 1) - 1]).filter(([a, b]) => b >= a);
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
      for (const w of mine) for (const c of conceptsIn(w.text ?? '', sh)) if (!written.has(c)) written.set(c, rel(w.path));
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

  // 2. once-only on the source the turn wrote
  const sources = [...new Set(judged.filter((w) => isSource(w.path) && existsSync(w.path)).map((w) => w.path))]
    .filter((p) => !matchesAny(rel(p), copyGlobs(layout)) && !isGenerated(readFileSync(p, 'utf8')));
  if (sources.length) {
    const r = scan(root, { layout, shape });
    if (r.error) problems.push(`once-only could not judge this turn's writes: ${r.error}`);
    const base = real(root);
    const show = (s) => `${relative(base, s.file)}:${s.start}-${s.end}`;
    const found = new Set();
    for (const p of sources) for (const range of addedRanges(root, p)) for (const c of clonesOf(r.clones, p, range)) found.add(`${show(c.at)} repeats ${show(c.other)} (${c.lines} lines)`);
    if (found.size) problems.push(`this turn's writes did not pass once-only: ${[...found].slice(0, 5).join('; ')}. ${FIX}`);
  }

  // 3. the override rule
  const said = OVERRIDE.map((re) => text.match(re)).find(Boolean);
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

async function main() {
  if (process.argv.includes('--selftest')) return (await import('./lib/making-check-selftest.mjs')).selftest(import.meta.url);
  let event;
  try { event = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
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

process.exit(await main());
