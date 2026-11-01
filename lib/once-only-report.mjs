// What doctor prints for the making and once-only hooks (0.9.0 items 6 and 9), and `claude-packs dup scan`.
//   onceOnlyDoctor(projectDir, log) -> [problem]   the making text's cost per turn; the repo's duplicate count, which can
//       only go down: the lowest count seen is kept in .claude/state/duplicates.json and a higher one is a problem.
//   dupScan(dir, log) -> exit code                  every duplicate, listed by file (both sides of each), and the count.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findJscpd, repoClones } from '../packs/base/hooks/lib/dup.mjs';
import { readShape } from '../packs/base/hooks/lib/shape.mjs';

const layoutOf = (dir) => { try { return JSON.parse(readFileSync(join(dir, '.claude', 'layout.json'), 'utf8')); } catch { return {}; } };

// The project's detector, else the kit's own, for this process and every selftest it starts.
export function useJscpd(dir) {
  const found = findJscpd([dir]);
  if (found) process.env.CLAUDE_PACKS_JSCPD ??= found;
  return found;
}

export function onceOnlyDoctor(projectDir, log = console.log) {
  const problems = [];
  const hooks = join(projectDir, '.claude', 'hooks');
  if (existsSync(join(hooks, 'making.mjs'))) {
    const r = spawnSync(process.execPath, [join(hooks, 'making.mjs'), '--cost'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir } });
    log(`  ${(r.stdout || `making: --cost failed (${r.stderr.split('\n')[0]})`).trim()}`);
  }
  if (!existsSync(join(hooks, 'once-only.mjs'))) return problems;
  if (!useJscpd(projectDir)) return [`once-only has no detector: jscpd not found (an optional dependency of the kit; npm install it, or set CLAUDE_PACKS_JSCPD)`];
  const r = repoClones(projectDir, { layout: layoutOf(projectDir), shape: readShape(projectDir) });
  if (r.error) return [`once-only: ${r.error}`];
  const n = r.clones.length;
  const file = join(projectDir, '.claude', 'state', 'duplicates.json');
  let st = null;
  try { st = JSON.parse(readFileSync(file, 'utf8')); } catch { /* first count */ }
  log(`  duplicates: ${n} (jscpd, ${r.sources} sources, ${r.ms} ms; \`npx claude-packs dup scan\` lists them)${st ? `, lowest seen ${st.lowest}` : ''}`);
  if (st && n > st.lowest) problems.push(`duplicates went up from ${st.lowest} to ${n}: the count only goes down (\`npx claude-packs dup scan\` lists them)`);
  if (!st || n < st.lowest) {
    mkdirSync(join(projectDir, '.claude', 'state'), { recursive: true });
    writeFileSync(file, `${JSON.stringify({ lowest: n, at: new Date().toISOString() }, null, 2)}\n`);
  }
  return problems;
}

export function dupScan(dir, log = console.log) {
  if (!useJscpd(dir)) { log('jscpd not found (an optional dependency of the kit; npm install it, or set CLAUDE_PACKS_JSCPD)'); return 2; }
  const r = repoClones(dir, { layout: layoutOf(dir), shape: readShape(dir) });
  if (r.error) { log(r.error); return 2; }
  const byFile = new Map();
  const add = (s, o, c) => { if (!byFile.has(s.file)) byFile.set(s.file, []); byFile.get(s.file).push(`  ${s.start}-${s.end}  same as ${o.file}:${o.start}-${o.end}  (${c.lines} lines, ${c.tokens} tokens)`); };
  for (const c of r.clones) { add(c.a, c.b, c); if (c.b.file !== c.a.file) add(c.b, c.a, c); }
  for (const f of [...byFile.keys()].sort()) { log(f); for (const l of byFile.get(f).sort((x, y) => parseInt(x, 10) - parseInt(y, 10))) log(l); }
  log(`${r.clones.length} duplicate(s) in ${byFile.size} file(s) (${r.sources} sources scanned; both sides inside copy trees left out)`);
  return 0;
}
