#!/usr/bin/env node
// once-only: code that exists once is called, never copied (claude-packs 0.9.0 item 9; KWB-1). Before a source write
// lands (C++, Python, JS), the lines it adds are compared with the whole repo through an index kept between calls
// (lib/dup-index.mjs, KWB-24: jscpd's whole-repo scan on every write was too slow; only files that changed are read again),
// at jscpd's thresholds (lib/dup.mjs: 50 tokens and 6 lines, a gap of up to 2 lines, so a copy with one line changed is
// still a copy). doctor's count and `claude-packs dup scan` still run jscpd over the whole repo. A near-duplicate is refused with the
// existing location and the fix: call it, or extract one function that both call, parameterized over what differs.
// Generated files, resources, vendored and built code, copy trees and design/shape.json "exclude" are never judged.
// Every write route (lib/writes.mjs): Write, Edit, MultiEdit, NotebookEdit and the shell's >, >>, tee, sed -i, cp, mv,
// a heredoc. The file is judged as it would be after the write, its old text left out, so editing a file never
// matches its own old lines.
//   node once-only.mjs --selftest
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedLines, copyGlobs, excludeGlobs, FIX, findJscpd, isGenerated, isSource, real } from './lib/dup.mjs';
import { judgeWrites } from './lib/dup-index.mjs';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot, insideProject } from './lib/project.mjs';
import { bashOf, editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { readShape } from './lib/shape.mjs';
import { readPayload, writesOf } from './lib/writes.mjs';
import { isContent } from './lib/content.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const HOW = `Code that exists once is called, never copied: ${FIX}. A function written for a many concept takes the instance as a parameter.\n` +
  'Moving or extracting code: take the old copy out in the same write (one Write or MultiEdit), or take it out first.';

// [{ root, layout, shape, w, range }] for every source write the call makes that once-only judges.
function judged(payload) {
  const out = [];
  const gone = [];
  for (const w of writesOf(payload, payload.cwd ?? process.cwd())) {
    if (!insideProject(w.path)) continue;
    if (w.op === 'delete') { gone.push(w.path); continue; }
    if (w.after === null || w.after === undefined || !isSource(w.path) || isGenerated(w.after)) continue;
    const root = checkoutRoot(w.path);
    const rel = relative(root, w.path).replace(/\\/g, '/');
    const layout = readLayout(claudeRoot(w.path));
    const shape = readShape(root);
    if (matchesAny(rel, [...excludeGlobs(layout, shape), ...copyGlobs(layout)]) || isContent(rel, layout)) continue;
    const range = changedLines(w.before, w.after);
    if (range) out.push({ root, layout, shape, w, rel, range });
  }
  return { list: out, gone };
}

export function judge(payload) {
  const { list, gone } = judged(payload);
  if (!list.length) return { code: 0 };
  const found = [];
  // each checkout written to: its index finds the candidates (built once, then only changed files are read again), jscpd
  // confirms on those files alone (lib/dup-index.mjs judgeWrites)
  for (const root of new Set(list.map((j) => j.root))) {
    const mine = list.filter((j) => j.root === root);
    const r = judgeWrites(root, mine.map((j) => ({ path: j.w.path, after: j.w.after, range: j.range })), { layout: mine[0].layout, shape: mine[0].shape, ignore: gone });
    if (r.error) return { code: 0, note: `once-only could not judge: ${r.error}` }; // doctor shows a missing detector
    const base = real(root);
    const show = (s) => `${relative(base, s.file)}:${s.start}-${s.end}`;
    for (const c of r.clones) found.push(`${show(c.at)} repeats ${show(c.other)} (${c.lines} lines, ${c.tokens} tokens)`);
  }
  if (!found.length) return { code: 0 };
  const listed = [...new Set(found)];
  return { code: 2, message: `BLOCKED by once-only: this write repeats code the repo already has.\n${listed.slice(0, 6).map((f) => `  ${f}`).join('\n')}${listed.length > 6 ? `\n  ... and ${listed.length - 6} more` : ''}\n${HOW}` };
}

const FN = (name, k = '2.0f') => `float ${name}::process (float x) noexcept
{
    const float g = std::tan (kPi * cutoff / sampleRate);
    const float k = ${k} - 2.0f * resonance;
    const float a1 = 1.0f / (1.0f + g * (g + k));
    const float a2 = g * a1;
    const float a3 = g * a2;
    const float v3 = x - ic2eq;
    const float v1 = a1 * ic1eq + a2 * v3;
    const float v2 = ic2eq + a2 * ic1eq + a3 * v3;
    ic1eq = 2.0f * v1 - ic1eq;
    ic2eq = 2.0f * v2 - ic2eq;
    return mode == 0 ? v2 : mode == 1 ? v1 : x - k * v1 - v2;
}
`;
const PY = (name, scale = '0.5') => `def ${name}(frames, rate):
    out = []
    for i, f in enumerate(frames):
        level = sum(abs(s) for s in f) / max(len(f), 1)
        peak = max((abs(s) for s in f), default=0.0)
        crest = peak / level if level > 0 else 0.0
        out.append({"i": i, "t": i / rate, "level": level * ${scale}, "peak": peak, "crest": crest})
    return [o for o in out if o["level"] > 0.001 and o["crest"] < 30.0]
`;
const JS = (name, pad = 2) => `export function ${name}(rows, widths) {
  const cells = rows.map((r) => r.map((c, i) => String(c).padEnd(widths[i] ?? 0)));
  const lines = cells.map((r) => r.join(' | ').trimEnd());
  const rule = widths.map((w) => '-'.repeat(Math.max(w, 3))).join('-|-');
  const head = lines.shift() ?? '';
  const body = lines.filter((l) => l.length > 0).map((l) => \`  \${l}\`);
  return [head, rule, ...body].join('\\n').padEnd(${pad});
}
`;

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  if (!findJscpd([process.cwd()])) {
    console.error('once-only selftest FAILED: jscpd not found (npm install the kit with its optional dependency, or set CLAUDE_PACKS_JSCPD)');
    return 1;
  }
  const dir = scratchProject({
    'src/core/Filter.cpp': `#include "Filter.h"\n\n${FN('Filter')}`,
    'tools/meter.py': `import math\n\n${PY('meter')}`,
    'tools/table.mjs': `// table\n${JS('table')}`,
    'design/shape.json': JSON.stringify({ concepts: {}, exclude: ['src/gen/**'] }),
  });
  const at = (f) => join(dir, f);
  const w = (f, text) => runHook(hook, dir, writeOf(at(f), text));
  const sh = (cmd) => runHook(hook, dir, bashOf(cmd, dir));
  const filter = readFileSync(at('src/core/Filter.cpp'), 'utf8');
  return verdicts('once-only', [
    ['a copy of a function with one line changed, in a new file (Write)', w('src/core/Filter2.cpp', `#include "Filter2.h"\n\n${FN('Filter2', '1.5f')}`), 2],
    ['a copy with its middle line changed (the two halves are one near-miss clone)', w('src/core/Mid.cpp', FN('Mid').replace('const float a2 = g * a1;', 'const float a2 = 0.5f * g * a1;')), 2],
    ['a copy put into a header (.h and .cpp are one language)', w('src/core/Inline.h', `#pragma once\n\n${FN('Inline', '1.7f')}`), 2],
    ['the same code calling the function instead', w('src/core/Mixer.cpp', '#include "Filter.h"\n\nfloat Mixer::render (float x) noexcept { return filter.process (x) * gain; }\n'), 0],
    ['a near-copy added to the same file (Edit)', runHook(hook, dir, editOf(at('src/core/Filter.cpp'), '#include "Filter.h"\n', `#include "Filter.h"\n\n${FN('Shelf', '1.0f')}`)), 2],
    ['a heredoc that writes a copy (Bash)', sh(`cat > src/core/Copy.cpp <<'EOF'\n${FN('Copy', '0.5f')}EOF`), 2],
    ['cp of a source file (Bash)', sh('cp src/core/Filter.cpp src/core/Again.cpp'), 2],
    ['mv of a source file: its old place is gone, nothing is repeated', sh('mv src/core/Filter.cpp src/core/Moved.cpp'), 0],
    ['a Python copy with one value changed', w('tools/meter2.py', `import math\n\n${PY('meter2', '0.25')}`), 2],
    ['a JS copy with one value changed', w('tools/table2.mjs', `// table 2\n${JS('table2', 4)}`), 2],
    ['editing a function in place (its own old text is not a match)', w('src/core/Filter.cpp', filter.replace('2.0f - 2.0f * resonance', '1.8f - 2.0f * resonance')), 0],
    ['two sed -i edits of one file in one command (KWB-13: each was read against the disk, two versions judged as copies)', sh("sed -i 's/2.0f - 2.0f/1.9f - 2.0f/' src/core/Filter.cpp && sed -i '1a // tuned' src/core/Filter.cpp"), 0],
    ['moving a function within its file in one write', w('src/core/Filter.cpp', `${FN('Filter')}\n#include "Filter.h"\n`), 0],
    ['a shape.json "exclude" path', w('src/gen/Filter3.cpp', FN('Filter3', '1.1f')), 0],
    ['a generated file', w('src/core/Tables.cpp', `// generated by tools/make_tables.py: do not edit\n${FN('Tables', '1.2f')}`), 0],
    ['resources', w('src/Resources/Filter4.cpp', FN('Filter4', '1.3f')), 0],
    ['a short block of under 6 lines repeated', w('src/core/Small.cpp', 'float Small::process (float x) noexcept\n{\n    return x * gain;\n}\n'), 0],
    ['a file outside the project', runHook(hook, dir, writeOf(join(tmpdir(), 'other-project-x', 'Filter5.cpp'), FN('Filter5', '1.4f'))), 0],
  ]);
}

function main(text) {
  const payload = readPayload(text);
  if (!payload) return 0;
  const r = judge(payload);
  if (r.code === 2) process.stderr.write(`${r.message}\n`);
  return r.code;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('once-only', main));
