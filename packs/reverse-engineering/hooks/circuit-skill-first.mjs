#!/usr/bin/env node
// PreToolUse (Read, Bash): a schematic, a service manual or a data sheet is read through read-a-circuit-diagram, never at a
// glance. The Matrix-12's service manual was half-read at screen size, and a Juno-106 service page was rendered small and its
// figures reported as facts, both with the skill unloaded. So a Read of such an image or PDF, or a shell command that renders
// or reads one, is refused until the session's transcript shows the skill loaded. `--selftest` proves it.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { readPayload } from './lib/writes.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const SKILL = 'read-a-circuit-diagram';
// Circuit material by its name: a service manual or notes, a schematic, a data sheet, a circuit or a netlist, as an image or a
// PDF, in the file's name or any folder above it. A project names its own others in layout.json guards.circuitSkill.sources.
const NAMED = /(service[\s_-]*(manual|notes)|schematic|data[\s_-]*sheet|circuit|netlist)[^'"\n|;&]*\.(pdf|png|jpe?g|webp|gif|bmp|tiff?)\b/i;
const PICTURE = /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?)$/i;
// A shell command reads a picture's content when it renders, converts or reads it; a listing, a copy or a move does not.
const READS = /\b(python3?|pdftoppm|pdfimages|pdftocairo|pdftotext|docling|magick|convert|gs|tesseract|mutool|node|identify)\b/;
const REFUSAL = [
  'is circuit material (a schematic, a service manual or a data sheet).',
  `Load the ${SKILL} skill first: the Skill tool, or Read its SKILL.md (.claude/skills/${SKILL}/SKILL.md,`,
  `or the kit's packs/reverse-engineering/skills/${SKILL}/SKILL.md). Then read the sheet through it: tiles at full resolution,`,
  'one report an image. A first look says only what kind of document it is, and no figure from it is a finding.',
].join(' ');

function isCircuit(file, cwd) {
  if (NAMED.test(file)) return true;
  if (!PICTURE.test(file)) return false;
  const full = file.startsWith('/') ? file : join(cwd, file);
  const root = checkoutRoot(full);
  const rel = relative(root, full).replace(/\\/g, '/');
  const sources = readLayout(claudeRoot(join(root, 'x'))).guards?.circuitSkill?.sources ?? [];
  return !rel.startsWith('..') && matchesAny(rel, sources);
}

// Only a tool call counts as loading the skill: a Skill call, or a Read of its SKILL.md. Naming the path in a brief does not.
const skillOf = (use) => String(use.input?.skill ?? '');
const fileOf = (use) => String(use.input?.file_path ?? '');
const loads = (use) => use?.type === 'tool_use'
  && ((use.name === 'Skill' && skillOf(use).endsWith(SKILL)) || (use.name === 'Read' && fileOf(use).endsWith(`${SKILL}/SKILL.md`)));

function loadedIn(file) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return false; } // not a refusal: an unreadable transcript counts as unloaded
  for (const line of text.split('\n')) {
    if (!line.includes(SKILL)) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const content = entry?.message?.content;
    if (Array.isArray(content) && content.some(loads)) return true;
  }
  return false;
}

// An agent's own transcript sits beside the session's: <session>/subagents/agent-<id>.jsonl. Once found, a marker in the temp
// folder saves reading a long transcript again.
function skillLoaded(payload) {
  const t = payload.transcript_path;
  const own = payload.agent_id ? join(dirname(t), basename(t, '.jsonl'), 'subagents', `agent-${payload.agent_id}.jsonl`) : null;
  const key = createHash('sha1').update(`${t}|${payload.agent_id ?? ''}`).digest('hex').slice(0, 16);
  const marker = join(tmpdir(), `cp-circuit-skill-${key}`);
  if (existsSync(marker)) return true;
  const found = loadedIn(t) || (own !== null && loadedIn(own));
  if (found) writeFileSync(marker, '');
  return found;
}

function circuitIn(payload) {
  const cwd = payload.cwd ?? process.cwd();
  const input = payload.tool_input ?? {};
  if (payload.tool_name === 'Read') return isCircuit(input.file_path ?? '', cwd) ? input.file_path : null;
  const cmd = payload.tool_name === 'Bash' ? input.command ?? '' : '';
  if (!READS.test(cmd)) return null;
  const named = NAMED.exec(cmd);
  if (named) return named[0];
  const words = (cmd.match(/"[^"]+"|'[^']+'|\S+/g) ?? []).map((w) => w.replace(/^['"]|['"]$/g, ''));
  return words.find((w) => PICTURE.test(w) && isCircuit(w, cwd)) ?? null;
}

function main(text) {
  const payload = readPayload(text);
  if (!payload || !payload.transcript_path) return 0; // not a refusal: with no transcript there is nothing to judge the skill by
  const sheet = circuitIn(payload);
  if (!sheet || skillLoaded(payload)) return 0;
  process.stderr.write(`BLOCKED by circuit-skill-first: ${sheet} ${REFUSAL}\n`);
  return 2;
}

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const dir = scratchProject({ 'src/a.cpp': 'x', 'sheets/board.png': 'x' }, { guards: { circuitSkill: { sources: ['sheets/**'] } } });
  const sheet = join(dir, 'archive/Service Manual/tiles/03-t1.png');
  const manual = join(dir, 'archive/Juno-Service-Manual.pdf');
  put(sheet, 'x');
  put(manual, 'x');
  const transcript = (name, uses) => {
    const file = join(dir, `${name}.jsonl`);
    put(file, uses.map((use) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', ...use }] } })).join('\n') + '\n');
    return file;
  };
  const none = transcript('none', [{ name: 'Read', input: { file_path: join(dir, 'src/a.cpp') } }]);
  const named = transcript('named', [{ name: 'Bash', input: { command: 'echo read-a-circuit-diagram/SKILL.md' } }]);
  const bySkill = transcript('skill', [{ name: 'Skill', input: { skill: 'read-a-circuit-diagram' } }]);
  const byRead = transcript('read', [{ name: 'Read', input: { file_path: '/kit/packs/reverse-engineering/skills/read-a-circuit-diagram/SKILL.md' } }]);
  const read = (file, t) => runHook(hook, dir, { tool_name: 'Read', tool_input: { file_path: file }, cwd: dir, transcript_path: t });
  const bash = (command, t) => runHook(hook, dir, { tool_name: 'Bash', tool_input: { command }, cwd: dir, transcript_path: t });
  const render = `python3 -c "import pypdfium2" "${manual}"`;
  return verdicts('circuit-skill-first', [
    ['a service-manual tile read with the skill unloaded', read(sheet, none), 2],
    ['a skill path only named in a command does not count', read(sheet, named), 2],
    ['a render of a service manual with the skill unloaded', bash(render, none), 2],
    ['a sheet the layout names', read(join(dir, 'sheets/board.png'), none), 2],
    ['the tile after a Skill call', read(sheet, bySkill), 0],
    ['the tile after a Read of SKILL.md', read(sheet, byRead), 0],
    ['the render after the skill', bash(render, bySkill), 0],
    ['a plain source file', read(join(dir, 'src/a.cpp'), none), 0],
    ['a listing of the manual is not a reading', bash(`ls -la "${manual}"`, none), 0],
    ['no transcript: nothing to judge by', read(sheet, undefined), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('circuit-skill-first', main));
