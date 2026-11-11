// What doctor prints for the making and once-only hooks (0.9.0 items 6 and 9), and `claude-packs dup scan`.
//   onceOnlyDoctor(projectDir, log) -> [problem]   the making text's cost per turn; the repo's duplicate count, which can
//       only go down: the lowest count seen is kept in .claude/state/duplicates.json and a higher one is a problem.
//   dupScan(dir, log) -> exit code                  every duplicate, listed by file (both sides of each), and the count.
//   The env is the caller's, a parameter that defaults to the process's own for the importers that do not pass one yet.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findJscpd, repoClones } from '../packs/base/hooks/lib/dup.mts';
import type { Clone, CloneSide } from '../packs/base/hooks/lib/dup.mts';
import { ensureDir } from '../packs/base/hooks/lib/files.mts';
import { readJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import { readShape } from '../packs/base/hooks/lib/shape.mts';
import type { Logger, ShapeManifest } from '../packs/base/hooks/lib/types.d.mts';

/** An environment the detector's path may be written into (jscpd is found once, then every selftest this process starts uses it). */
export type DetectorEnv = Record<string, string | undefined>;

/** The project's detector, else the kit's own, for this process and every selftest it starts. */
export function useJscpd(dir: string, env: DetectorEnv = process.env): string | null {
  const found = findJscpd(env, [dir]);
  if (found) env.CLAUDE_PACKS_JSCPD ??= found;
  return found;
}

/** The shape the detector reads: only what design/shape.json leaves out (the loaded shape's concepts are not the manifest's). */
const shapeOf = (dir: string): ShapeManifest | null => {
  const shape = readShape(dir);
  return shape ? { concepts: {}, exclude: shape.exclude } : null;
};

const NO_DETECTOR = 'jscpd not found (an optional dependency of the kit; npm install it, or set CLAUDE_PACKS_JSCPD)';

export function onceOnlyDoctor(projectDir: string, log: Logger = console.log, env: DetectorEnv = process.env): string[] {
  const problems: string[] = [];
  const hooks = join(projectDir, '.claude', 'hooks');
  if (existsSync(join(hooks, 'making.mjs'))) {
    const r = spawnSync(process.execPath, [join(hooks, 'making.mjs'), '--cost'], { encoding: 'utf8', env: { ...env, CLAUDE_PROJECT_DIR: projectDir } });
    log(`  ${(r.stdout || `making: --cost failed (${r.stderr.split('\n')[0]})`).trim()}`);
  }
  if (!existsSync(join(hooks, 'once-only.mjs'))) return problems;
  if (!useJscpd(projectDir, env)) return [`once-only has no detector: ${NO_DETECTOR}`];
  const r = repoClones(projectDir, { env, layout: readLayout(projectDir), shape: shapeOf(projectDir) });
  if (r.error) return [`once-only: ${r.error}`];
  const n = r.clones.length;
  const state = join(projectDir, '.claude', 'state');
  const file = join(state, 'duplicates.json');
  const st = readJson<{ lowest: number }>(file);
  log(`  duplicates: ${n} (jscpd, ${r.sources} sources, ${r.ms} ms; \`npx --no-install @thedecipherist/claude-packs dup scan\` lists them)${st ? `, lowest seen ${st.lowest}` : ''}`);
  if (st && n > st.lowest) problems.push(`duplicates went up from ${st.lowest} to ${n}: the count only goes down (\`npx --no-install @thedecipherist/claude-packs dup scan\` lists them)`);
  if (!st || n < st.lowest) {
    ensureDir(state);
    writeJson(file, { lowest: n, at: new Date().toISOString() }, { pretty: true });
  }
  return problems;
}

export function dupScan(dir: string, log: Logger = console.log, env: DetectorEnv = process.env): number {
  if (!useJscpd(dir, env)) { log(NO_DETECTOR); return 2; }
  const r = repoClones(dir, { env, layout: readLayout(dir), shape: shapeOf(dir) });
  if (r.error) { log(r.error); return 2; }
  const byFile = new Map<string, string[]>();
  const add = (s: CloneSide, o: CloneSide, c: Clone): void => {
    const lines = byFile.get(s.file) ?? [];
    lines.push(`  ${s.start}-${s.end}  same as ${o.file}:${o.start}-${o.end}  (${c.lines} lines, ${c.tokens} tokens)`);
    byFile.set(s.file, lines);
  };
  for (const c of r.clones) { add(c.a, c.b, c); if (c.b.file !== c.a.file) add(c.b, c.a, c); }
  for (const f of [...byFile.keys()].sort()) { log(f); for (const l of (byFile.get(f) ?? []).sort((x, y) => parseInt(x, 10) - parseInt(y, 10))) log(l); }
  log(`${r.clones.length} duplicate(s) in ${byFile.size} file(s) (${r.sources} sources scanned; both sides inside copy trees left out)`);
  return 0;
}
