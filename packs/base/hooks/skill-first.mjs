#!/usr/bin/env node
// PreToolUse (Read, Bash): some sources are read only through their skill. A schematic, a service manual or a data sheet is read
// through read-a-circuit-diagram (1.3.0: a service page was rendered small and its figures reported as facts, the skill unloaded),
// and a design reference, a mock-up or a reference picture, through analyse-reference-look (1.3.1: two pages of a plugin's editor
// were built from mock-ups by eye, and landed far plainer than them, with that skill installed and unused). A Read of such a file,
// or a shell command that renders or reads one, is refused until the session's transcript shows the row's skill loaded: a Skill
// call, or a Read of its SKILL.md. A row applies only where its skill is installed (`.claude/skills/<skill>/SKILL.md` in the
// project the file is in, or the session's own project for a file outside every project). A project adds its own rows in
// layout.json `"guards": { "skillFirst": [{ "skill": "<name>", "sources": ["<glob>"], "what": "<words>" }] }`, and still names
// more circuit material in `"circuitSkill": { "sources": [...] }`. `--selftest` proves it.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { readPayload } from './lib/writes.mjs';
import { asHook, projectRoot, isMain } from './lib/hook-log.mjs';
import { selftest } from './lib/skill-first-selftest.mjs';
import { fileURLToPath } from 'node:url';


const PICTURE = /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?)$/i;
const PICTURE_END = String.raw`[^'"\n|;&]*\.(?:pdf|png|jpe?g|webp|gif|bmp|tiff?)\b`;
// The rows: what a file's path says it is, the skill that reads it, and the layout's own globs for it.
const ROWS = [
  { skill: 'read-a-circuit-diagram', what: 'circuit material (a schematic, a service manual or a data sheet)',
    named: new RegExp(String.raw`(?:service[\s_-]*(?:manual|notes)|schematic|data[\s_-]*sheet|circuit|netlist)${PICTURE_END}`, 'i'),
    globs: (layout) => layout.guards?.circuitSkill?.sources ?? [] },
  { skill: 'analyse-reference-look', what: 'a design reference (a mock-up or a reference picture)',
    named: new RegExp(String.raw`(?:^|[\s/'"])(?:references?|mock[\s_-]*ups?)/${PICTURE_END}`, 'i'),
    globs: () => [] },
];
// A shell command reads a picture's content when it renders, converts or reads it; a listing, a copy or a move does not.
const READS = /\b(python3?|pdftoppm|pdfimages|pdftocairo|pdftotext|docling|magick|convert|gs|tesseract|mutool|node|identify)\b/;

const full = (file, cwd) => (file.startsWith('/') ? file : join(cwd, file));
// The layout of the checkout a file sits in (a worktree's own), not of the session's project.
const checkoutLayout = (file) => readLayout(claudeRoot(projectRoot(), file, process.cwd()));

function rowsFor(file, project) {
  const own = (checkoutLayout(file).guards?.skillFirst ?? [])
    .map((r) => ({ skill: r.skill, what: r.what ?? `a source read through ${r.skill}`, named: null, globs: () => r.sources ?? [] }));
  const installed = (skill) => [claudeRoot(projectRoot(), file, process.cwd()), join(project, '.claude')].some((root) => existsSync(join(root, 'skills', skill, 'SKILL.md')));
  return [...ROWS, ...own].filter((r) => installed(r.skill));
}

// The row a source file belongs to: by its name, or by a glob of its own checkout's layout.
function sourceRow(file, cwd, project) {
  const path = full(file, cwd);
  const rel = relative(checkoutRoot(projectRoot(), path, process.cwd()), path).replace(/\\/g, '/');
  const inGlobs = (r) => PICTURE.test(path) && !rel.startsWith('..') && matchesAny(rel, r.globs(checkoutLayout(path)));
  return rowsFor(path, project).find((r) => (r.named && r.named.test(path)) || inGlobs(r)) ?? null;
}

// Only a tool call counts as loading a skill: a Skill call, or a Read of its SKILL.md. Naming the path in a brief does not.
const loads = (use, skill) => use?.type === 'tool_use'
  && ((use.name === 'Skill' && String(use.input?.skill ?? '').endsWith(skill))
    || (use.name === 'Read' && String(use.input?.file_path ?? '').endsWith(`${skill}/SKILL.md`)));

function loadedIn(file, skill) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return false; } // not a refusal: an unreadable transcript counts as unloaded
  for (const line of text.split('\n')) {
    if (!line.includes(skill)) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const content = entry?.message?.content;
    if (Array.isArray(content) && content.some((use) => loads(use, skill))) return true;
  }
  return false;
}

// An agent's own transcript sits beside the session's: <session>/subagents/agent-<id>.jsonl. Once found, a marker in the temp
// folder saves reading a long transcript again.
function skillLoaded(payload, skill) {
  const t = payload.transcript_path;
  const own = payload.agent_id ? join(dirname(t), basename(t, '.jsonl'), 'subagents', `agent-${payload.agent_id}.jsonl`) : null;
  const key = createHash('sha1').update(`${t}|${payload.agent_id ?? ''}|${skill}`).digest('hex').slice(0, 16);
  const marker = join(tmpdir(), `cp-skill-first-${key}`);
  if (existsSync(marker)) return true;
  const found = loadedIn(t, skill) || (own !== null && loadedIn(own, skill));
  if (found) writeFileSync(marker, '');
  return found;
}

// The file a call reads, and its row: a Read's file, or a picture a reading shell command names.
function sourceIn(payload, project) {
  const cwd = payload.cwd ?? process.cwd();
  const input = payload.tool_input ?? {};
  if (payload.tool_name === 'Read') {
    const row = input.file_path ? sourceRow(input.file_path, cwd, project) : null;
    return row ? { file: input.file_path, row } : null;
  }
  const cmd = payload.tool_name === 'Bash' ? input.command ?? '' : '';
  if (!READS.test(cmd)) return null;
  const words = (cmd.match(/"[^"]+"|'[^']+'|\S+/g) ?? []).map((w) => w.replace(/^['"]|['"]$/g, ''));
  for (const w of words.filter((x) => PICTURE.test(x))) {
    const row = sourceRow(w, cwd, project);
    if (row) return { file: w, row };
  }
  return null;
}

function main(text) {
  const payload = readPayload(text);
  if (!payload || !payload.transcript_path) return 0; // not a refusal: with no transcript there is nothing to judge the skill by
  const project = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd();
  const found = sourceIn(payload, project);
  if (!found || skillLoaded(payload, found.row.skill)) return 0;
  const { skill, what } = found.row;
  process.stderr.write([
    `BLOCKED by skill-first: ${found.file} is ${what}.`,
    `Load the ${skill} skill first: the Skill tool, or Read its SKILL.md (.claude/skills/${skill}/SKILL.md).`,
    'Then read it the way that skill says, step by step. A first look says only what kind of file it is, and nothing from it is a finding.',
  ].join(' ') + '\n');
  return 2;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest(fileURLToPath(import.meta.url)) : await asHook('skill-first', main));
