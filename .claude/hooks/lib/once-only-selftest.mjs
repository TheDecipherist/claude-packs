// once-only's selftest and its fixtures: a function to copy in C++, Python and JS, and the rows that plant a copy of each by every
// write route, then prove the judge writes nothing and records nothing (the recorder is once-only-index). A selftest module is left
// out of the repo lint's no-process gates (d-20): it runs as a process. `FN` is also the worktree case's function.
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findJscpd } from './dup.mjs';
import { loadIndex } from './dup-index.mjs';
import { bashOf, editOf, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './selftest.mjs';
export const FN = (name, k = '2.0f') => `float ${name}::process (float x) noexcept
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
/** The rows of once-only's selftest, run against `hookFile`; `env` and `cwd` are where jscpd is looked for. */
export function selftest(hookFile, env, cwd) {
    if (!findJscpd(env, [cwd])) {
        return verdicts('once-only', [['jscpd is found (npm install the kit with its optional dependency, or set CLAUDE_PACKS_JSCPD)', false, true]]);
    }
    // eight import lines two modules share are no copy: imports cannot be made one function (KWB-176 holds the repo-wide count to it)
    const IMPORTS = ['glob', 'layout', 'project', 'writes', 'hook-log', 'selftest', 'json', 'files'].map((m) => `import { ${m.replace('-', '')}A, ${m.replace('-', '')}B } from './lib/${m}.mjs';\n`).join('');
    const dir = scratchProject({
        'tools/reader.mjs': `${IMPORTS}export function one(x) {\n  return x + 1;\n}\n`,
        'src/core/Filter.cpp': `#include "Filter.h"\n\n${FN('Filter')}`,
        'tools/meter.py': `import math\n\n${PY('meter')}`,
        'tools/table.mjs': `// table\n${JS('table')}`,
        'design/shape.json': JSON.stringify({ concepts: {}, exclude: ['src/gen/**'] }),
    });
    const before = snapshot(dir); // the project as the judge finds it: the rows below must leave it as it is
    const unkept = loadIndex(dir, { persist: false }).read; // every file: no index of this checkout is kept yet
    const at = (f) => join(dir, f);
    const w = (f, text) => runHook(hookFile, dir, writeOf(at(f), text)).status;
    const sh = (cmd) => runHook(hookFile, dir, bashOf(cmd, dir)).status;
    const edit = (f, from, to) => runHook(hookFile, dir, editOf(at(f), from, to)).status;
    const filter = readFileSync(at('src/core/Filter.cpp'), 'utf8');
    const novelLines = Array.from({ length: 12 }, (_, i) => `    const float t${i} = a * ${i + 3}.0f + b * ${i + 7}.5f - t${Math.max(i - 1, 0)}${i}x;`);
    const novel = `float Novel::mix (float a, float b) noexcept\n{\n${novelLines.join('\n')}\n    return t11;\n}\n`;
    const sedTwice = "sed -i 's/2.0f - 2.0f/1.9f - 2.0f/' src/core/Filter.cpp && sed -i '1a // tuned' src/core/Filter.cpp";
    return verdicts('once-only', [
        ['a copy of a function with one line changed, in a new file (Write)', w('src/core/Filter2.cpp', `#include "Filter2.h"\n\n${FN('Filter2', '1.5f')}`), 2],
        ['a copy with its middle line changed (the two halves are one near-miss clone)', w('src/core/Mid.cpp', FN('Mid').replace('const float a2 = g * a1;', 'const float a2 = 0.5f * g * a1;')), 2],
        ['a copy put into a header (.h and .cpp are one language)', w('src/core/Inline.h', `#pragma once\n\n${FN('Inline', '1.7f')}`), 2],
        ['the same code calling the function instead', w('src/core/Mixer.cpp', '#include "Filter.h"\n\nfloat Mixer::render (float x) noexcept { return filter.process (x) * gain; }\n'), 0],
        ['a near-copy added to the same file (Edit)', edit('src/core/Filter.cpp', '#include "Filter.h"\n', `#include "Filter.h"\n\n${FN('Shelf', '1.0f')}`), 2],
        ['a heredoc that writes a copy (Bash)', sh(`cat > src/core/Copy.cpp <<'EOF'\n${FN('Copy', '0.5f')}EOF`), 2],
        ['cp of a source file (Bash)', sh('cp src/core/Filter.cpp src/core/Again.cpp'), 2],
        ['mv of a source file: its old place is gone, nothing is repeated', sh('mv src/core/Filter.cpp src/core/Moved.cpp'), 0],
        ['a Python copy with one value changed', w('tools/meter2.py', `import math\n\n${PY('meter2', '0.25')}`), 2],
        ['a JS copy with one value changed', w('tools/table2.mjs', `// table 2\n${JS('table2', 4)}`), 2],
        ['editing a function in place (its own old text is not a match)', w('src/core/Filter.cpp', filter.replace('2.0f - 2.0f * resonance', '1.8f - 2.0f * resonance')), 0],
        ['two sed -i edits of one file in one command (KWB-13: each was read against the disk, two versions judged as copies)', sh(sedTwice), 0],
        ['moving a function within its file in one write', w('src/core/Filter.cpp', `${FN('Filter')}\n#include "Filter.h"\n`), 0],
        ['a shape.json "exclude" path', w('src/gen/Filter3.cpp', FN('Filter3', '1.1f')), 0],
        ['a generated file', w('src/core/Tables.cpp', `// generated by tools/make_tables.py: do not edit\n${FN('Tables', '1.2f')}`), 0],
        ['resources', w('src/Resources/Filter4.cpp', FN('Filter4', '1.3f')), 0],
        ['a new module importing what another imports, with its own code (a write is judged on code, never on its imports)', w('tools/writer.mjs', `${IMPORTS}export function two(y) {\n  const z = y * 2;\n  return z - 3;\n}\n`), 0],
        ['a short block of under 6 lines repeated', w('src/core/Small.cpp', 'float Small::process (float x) noexcept\n{\n    return x * gain;\n}\n'), 0],
        ['a file outside the project', runHook(hookFile, dir, writeOf(join(tmpdir(), 'other-project-x', 'Filter5.cpp'), FN('Filter5', '1.4f'))).status, 0],
        // review-2 2.10: the judge records nothing; a write that never happened (another hook refused it) is in no index
        ['new code judged, then refused by another hook (no write): the same text at another path is no copy of it', w('src/core/NovelA.cpp', novel), 0],
        ['the same text written later is not refused as a copy', w('src/core/NovelB.cpp', novel), 0],
        ['judging recorded nothing: the index is as it was, no file of it kept (the recorder keeps it)', loadIndex(dir, { persist: false }).read === unkept ? 'same' : 'changed', 'same'],
        ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
    ]);
}
