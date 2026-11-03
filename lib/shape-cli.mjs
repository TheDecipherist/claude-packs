// The kit's side of the shape law (0.9.0, KWB-1): the empty manifest `new` and `init` write, what doctor fails, and
// `claude-packs shape scan`: every instance literal already in a repo, by file and concept, with a count.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { matchesAny } from '../packs/base/hooks/lib/glob.mjs';
import { readPack } from './packs.mjs';
import { EMPTY_SHAPE, SHAPE_FILE, findInstanceLiterals, findSelectorDefs, findUnknownTypes, formatFinding, isExcluded, readShape, validateShape } from './shape.mjs';

export const isSynth = (packs) => packs.some((p) => { try { return readPack(p).synth === true; } catch { return false; } });

// Writes design/shape.json with no concepts when there is none; returns true when it wrote one.
export function ensureShape(dir) {
  const file = join(dir, SHAPE_FILE);
  if (existsSync(file)) return false;
  mkdirSync(join(dir, 'design'), { recursive: true });
  writeFileSync(file, `${JSON.stringify(EMPTY_SHAPE, null, 2)}\n`);
  return true;
}

export function shapeProblems(dir, packs) {
  if (!existsSync(join(dir, SHAPE_FILE))) {
    return isSynth(packs) ? [`no ${SHAPE_FILE}: a synth writes down, before it builds, whether each concept is ONE or MANY (its generator, selectors and declared constants); start from \`{"concepts": {}, "exclude": []}\` and add a row per concept`] : [];
  }
  return validateShape(readShape(dir));
}

const SKIP = ['.git/**', '**/node_modules/**', '.claude/worktrees/**', '.claude/.claude-packs-backup/**', '.claude/claude-packs.lock.json', '.claude/usage.log', '.claude/hooks.log'];

function files(dir) {
  try {
    const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: dir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\0').filter(Boolean);
  } catch {
    const walk = (d) => readdirSync(join(dir, d)).flatMap((e) => {
      const rel = d ? `${d}/${e}` : e;
      if (matchesAny(rel, SKIP) || matchesAny(`${rel}/x`, SKIP)) return [];
      return statSync(join(dir, rel)).isDirectory() ? walk(rel) : [rel];
    });
    return walk('');
  }
}

// Every finding in the repo, code, tests, docs and briefs alike; the files the kit installed are the kit's, not the repo's.
export function scanRepo(dir, shape = readShape(dir)) {
  if (!shape) throw new Error(`no ${SHAPE_FILE} in ${dir}`);
  if (shape.error) throw new Error(shape.error);
  let kit = new Set();
  try { kit = new Set(Object.keys(JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8')).files)); } catch { /* not installed */ }
  const findings = [];
  for (const rel of files(dir)) {
    if (kit.has(rel) || matchesAny(rel, SKIP) || isExcluded(rel, shape)) continue;
    let text;
    try { if (statSync(join(dir, rel)).size > 4 * 1024 * 1024) continue; text = readFileSync(join(dir, rel), 'utf8'); } catch { continue; }
    if (text.includes('\0')) continue;
    for (const f of [...findInstanceLiterals(text, rel, shape), ...findSelectorDefs(text, rel, shape), ...findUnknownTypes(text, rel, shape)]) findings.push({ ...f, file: rel });
  }
  return findings;
}

export function shapeCommand(sub, dir, log = console.log) {
  if (sub !== 'scan') throw new Error('use `npx --no-install @thedecipherist/claude-packs shape scan [--dir D]`');
  const findings = scanRepo(dir);
  const byConcept = new Map();
  for (const f of findings) {
    log(formatFinding(f, f.file).split('\n')[0] + (f.kind ? '' : `  [${f.why}]`));
    const k = f.concept ?? 'new type (no row)';
    const e = byConcept.get(k) ?? { n: 0, files: new Set() };
    e.n += 1; e.files.add(f.file);
    byConcept.set(k, e);
  }
  log('');
  for (const [k, e] of byConcept) log(`${k}: ${e.n} finding(s) in ${e.files.size} file(s)`);
  log(findings.length ? `${findings.length} finding(s) in ${relative(process.cwd(), dir) || '.'}: each is an example, a rule or a constant, or it is fixed` : 'no findings');
  return findings.length ? 1 : 0;
}
