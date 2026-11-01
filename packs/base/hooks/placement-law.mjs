#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit): every kind of thing goes in its one place, so the rules for
// it load. layout.kinds says what goes where; a kind may name file patterns ("**/*.wgsl") and a
// content pattern (processBlock, wgpu calls, paint(Graphics)). A file of that kind, or an edit that
// ADDS that content, outside the kind's concept folders is refused. `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { extname, relative } from 'node:path';
import { computeEdit } from './lib/apply-edit.mjs';
import { matchesAny } from './lib/glob.mjs';
import { conceptGlobs, readLayout } from './lib/layout.mjs';
import { insideProject, checkoutRoot, claudeRoot } from './lib/project.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const CODE = new Set(['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.mm', '.m', '.wgsl', '.metal', '.hlsl']);

const home = (layout, kind) => (kind.concepts ?? []).flatMap((c) => conceptGlobs(layout, c) ?? []);
const where = (layout, kind) => layout.folders?.[kind.in]?.path ?? kind.in;

export function misplaced(layout, rel, before, after) {
  for (const [name, kind] of Object.entries(layout.kinds ?? {})) {
    const globs = home(layout, kind);
    if (globs.length === 0 || matchesAny(rel, globs)) continue;
    const byName = kind.files && matchesAny(rel, kind.files) && before === '';
    let byContent = false;
    if (kind.content && CODE.has(extname(rel))) {
      const re = new RegExp(kind.content);
      byContent = re.test(after) && !re.test(before);
    }
    if (byName || byContent) return { name, kind, where: where(layout, kind), globs };
  }
  return null;
}

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  const input = payload.tool_input ?? {};
  if (!input.file_path || !insideProject(input.file_path)) return 0;
  const root = checkoutRoot(input.file_path);
  const rel = relative(root, input.file_path).replace(/\\/g, '/');
  const edit = computeEdit(payload.tool_name, input);
  if (!edit) return 0;
  const hit = misplaced(readLayout(claudeRoot(input.file_path)), rel, edit.before, edit.after);
  if (!hit) return 0;
  process.stderr.write(
    `BLOCKED by placement-law: ${rel} holds ${hit.kind.what} (kind "${hit.name}").\n` +
      `That goes in ${hit.where}/, where its rules load (${hit.globs.join(', ')}).\n` +
      'Put it there instead. If it truly belongs elsewhere, ask the user to change .claude/layout.json, then `npx claude-packs update`.\n',
  );
  return 2;
}

function selftest() {
  const layout = {
    folders: { audio: { path: 'src/audio' }, painter: { path: 'src/painter' }, tests: { path: 'tests' } },
    concepts: { audio: ['audio'], painter: ['painter'], tests: ['tests'] },
    kinds: {
      'audio-entry': { what: 'processBlock', in: 'audio', concepts: ['audio', 'tests'], content: '\\bprocessBlock\\s*\\(' },
      shader: { what: 'WGSL', in: 'painter', concepts: ['painter'], files: ['**/*.wgsl'] },
    },
  };
  const cases = [
    ['processBlock added outside audio', misplaced(layout, 'src/app/Helper.cpp', '', 'void processBlock (A& b) {}') !== null],
    ['processBlock in audio is fine', misplaced(layout, 'src/audio/Voice.cpp', '', 'void processBlock (A& b) {}') === null],
    ['processBlock already there is not re-judged', misplaced(layout, 'src/app/Old.cpp', 'processBlock (x);', 'processBlock (x); y();') === null],
    ['a new shader outside painter', misplaced(layout, 'src/app/glow.wgsl', '', 'fn main() {}') !== null],
    ['a shader in painter is fine', misplaced(layout, 'src/painter/glow.wgsl', '', 'fn main() {}') === null],
    ['a comment in docs is not code', misplaced(layout, 'docs/notes.md', '', 'processBlock (x)') === null],
  ];
  const bad = cases.filter(([, ok]) => !ok);
  for (const [n] of bad) console.error(`placement-law selftest FAILED: ${n}`);
  if (!bad.length) console.log(`placement-law selftest: OK (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
