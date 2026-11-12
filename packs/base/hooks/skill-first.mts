// PreToolUse (Read, Bash): some sources are read only through their skill. A schematic, a service manual or a data sheet is read
// through read-a-circuit-diagram (1.3.0: a service page was rendered small and its figures reported as facts, the skill unloaded),
// and a design reference, a mock-up or a reference picture, through analyse-reference-look (1.3.1: two pages of a plugin's editor
// were built from mock-ups by eye, and landed far plainer than them, with that skill installed and unused). A Read of such a file,
// or a shell command that renders or reads one, is refused until the session's transcript shows the row's skill loaded: a Skill
// call, or a Read of its SKILL.md. A row applies only where its skill is installed (`.claude/skills/<skill>/SKILL.md` in the
// project the file is in, or the session's own project for a file outside every project). A project adds its own rows in
// layout.json `"guards": { "skillFirst": [{ "skill": "<name>", "sources": ["<glob>"], "what": "<words>" }] }`, and still names
// more circuit material in `"circuitSkill": { "sources": [...] }`. `--selftest` proves it.
// A judge on the hook contract (W4): it writes nothing. It once kept a marker in the temp folder once a skill was found, to save
// reading a long transcript again; a judge writes no state, and the transcript is read only when a source file was named, so the
// marker is gone (W4 report).
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { matchesAny } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { parseJson } from './lib/json.mts';
import { readLayout } from './lib/layout.mts';
import { claudeRoot, relInCheckout } from './lib/project.mts';
import { selftest as selftestOf } from './lib/skill-first-selftest.mts';
import type { TranscriptEntry } from './lib/turn.mts';
import type { Hook, HookContext, HookEvent, Layout } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

const PICTURE = /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?)$/i;
const PICTURE_END = String.raw`[^'"\n|;&]*\.(?:pdf|png|jpe?g|webp|gif|bmp|tiff?)\b`;

/** A kind of source and the skill that reads it: what a file's path says it is, and the layout's own globs for it. */
interface Row { skill: string; what: string; named: RegExp | null; globs: (layout: Layout) => readonly string[] }

/** A row a project's layout adds (`guards.skillFirst`), outside data narrowed where it is read. */
interface OwnRow { skill?: unknown; what?: unknown; sources?: unknown }

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const rowsOfLayout = (layout: Layout): OwnRow[] => (Array.isArray(layout.guards?.['skillFirst']) ? (layout.guards['skillFirst'] as unknown[]).filter((r): r is OwnRow => typeof r === 'object' && r !== null) : []);
const circuitSources = (layout: Layout): string[] => {
  const row: unknown = layout.guards?.['circuitSkill'];
  return typeof row === 'object' && row !== null ? strings((row as { sources?: unknown }).sources) : [];
};

const ROWS: readonly Row[] = [
  { skill: 'read-a-circuit-diagram', what: 'circuit material (a schematic, a service manual or a data sheet)',
    named: new RegExp(String.raw`(?:service[\s_-]*(?:manual|notes)|schematic|data[\s_-]*sheet|circuit|netlist)${PICTURE_END}`, 'i'),
    globs: circuitSources },
  { skill: 'analyse-reference-look', what: 'a design reference (a mock-up or a reference picture)',
    named: new RegExp(String.raw`(?:^|[\s/'"])(?:references?|mock[\s_-]*ups?)/${PICTURE_END}`, 'i'),
    globs: () => [] },
];
// A shell command reads a picture's content when it renders, converts or reads it; a listing, a copy or a move does not.
const READS = /\b(python3?|pdftoppm|pdfimages|pdftocairo|pdftotext|docling|magick|convert|gs|tesseract|mutool|node|identify)\b/;

type Where = Pick<HookContext, 'projectDir' | 'cwd'>;

const full = (file: string, cwd: string): string => (file.startsWith('/') ? file : join(cwd, file));
// The layout of the checkout a file sits in (a worktree's own), not of the session's project.
const checkoutLayout = (file: string, at: Where): Layout => readLayout(claudeRoot(at.projectDir, file, at.cwd));

function rowsFor(file: string, project: string, at: Where): Row[] {
  const own: Row[] = rowsOfLayout(checkoutLayout(file, at)).flatMap((r) => (typeof r.skill === 'string'
    ? [{ skill: r.skill, what: typeof r.what === 'string' ? r.what : `a source read through ${r.skill}`, named: null, globs: () => strings(r.sources) }] : []));
  const installed = (skill: string): boolean => [claudeRoot(at.projectDir, file, at.cwd), join(project, '.claude')].some((root) => existsSync(join(root, 'skills', skill, 'SKILL.md')));
  return [...ROWS, ...own].filter((r) => installed(r.skill));
}

// The row a source file belongs to: by its name, or by a glob of its own checkout's layout.
function sourceRow(file: string, cwd: string, project: string, at: Where): Row | null {
  const path = full(file, cwd);
  const rel = relInCheckout(at.projectDir, path, at.cwd);
  const inGlobs = (r: Row): boolean => PICTURE.test(path) && !rel.startsWith('..') && matchesAny(rel, r.globs(checkoutLayout(path, at)));
  return rowsFor(path, project, at).find((r) => (r.named?.test(path) ?? false) || inGlobs(r)) ?? null;
}

// Only a tool call counts as loading a skill: a Skill call, or a Read of its SKILL.md. Naming the path in a brief does not.
const loads = (use: unknown, skill: string): boolean => {
  if (typeof use !== 'object' || use === null) return false;
  const { type, name, input } = use as { type?: unknown; name?: unknown; input?: { skill?: unknown; file_path?: unknown } };
  return type === 'tool_use'
    && ((name === 'Skill' && String(input?.skill ?? '').endsWith(skill))
      || (name === 'Read' && String(input?.file_path ?? '').endsWith(`${skill}/SKILL.md`)));
};

function loadedIn(file: string, skill: string): boolean {
  const text = readText(file);
  if (text === null) return false;   // not a refusal: an unreadable transcript counts as unloaded
  for (const line of text.split('\n')) {
    if (!line.includes(skill)) continue;
    const content = parseJson<TranscriptEntry>(line)?.message?.content;
    if (Array.isArray(content) && content.some((use) => loads(use, skill))) return true;
  }
  return false;
}

// An agent's own transcript sits beside the session's: <session>/subagents/agent-<id>.jsonl.
function skillLoaded(event: HookEvent, transcript: string, skill: string): boolean {
  const own = event.agent_id ? join(dirname(transcript), basename(transcript, '.jsonl'), 'subagents', `agent-${event.agent_id}.jsonl`) : null;
  return loadedIn(transcript, skill) || (own !== null && loadedIn(own, skill));
}

interface Found { file: string; row: Row }

// The file a call reads, and its row: a Read's file, or a picture a reading shell command names.
function sourceIn(event: HookEvent, project: string, at: Where): Found | null {
  const cwd = event.cwd ?? at.cwd;
  const input = event.tool_input ?? {};
  if (event.tool_name === 'Read') {
    const row = input.file_path ? sourceRow(input.file_path, cwd, project, at) : null;
    return row && input.file_path ? { file: input.file_path, row } : null;
  }
  const cmd = event.tool_name === 'Bash' ? input.command ?? '' : '';
  if (!READS.test(cmd)) return null;
  const words = (cmd.match(/"[^"]+"|'[^']+'|\S+/g) ?? []).map((w) => w.replace(/^['"]|['"]$/g, ''));
  for (const w of words.filter((x) => PICTURE.test(x))) {
    const row = sourceRow(w, cwd, project, at);
    if (row) return { file: w, row };
  }
  return null;
}

export const hook: Hook = (event, ctx) => {
  const transcript = event.transcript_path;
  if (!transcript) return pass;   // not a refusal: with no transcript there is nothing to judge the skill by
  const project = ctx.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? ctx.cwd;
  const found = sourceIn(event, project, ctx);
  if (!found || skillLoaded(event, transcript, found.row.skill)) return pass;
  const { skill, what } = found.row;
  return refuse([
    `BLOCKED by skill-first: ${found.file} is ${what}.`,
    `Load the ${skill} skill first: the Skill tool, or Read its SKILL.md (.claude/skills/${skill}/SKILL.md).`,
    'Then read it the way that skill says, step by step. A first look says only what kind of file it is, and nothing from it is a finding.',
  ].join(' '));
};

/** The selftest is kept apart (lib/skill-first-selftest.mts) so the hook stays small. The worktree case of this hook needs the
 *  layout merged into the worktree's file and a transcript, so it stays a function in worktrees.test.mjs until slice 6. */
export const selftest = (): number => selftestOf(fileURLToPath(import.meta.url));

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'skill-first', hook, selftest);
