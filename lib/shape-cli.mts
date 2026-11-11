// The kit's side of the shape law (0.9.0, KWB-1): the empty manifest `new` and `init` write, what doctor fails, and
// `claude-packs shape scan`: every instance literal already in a repo, by file and concept, with a count.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isJunk, put, walk } from '../packs/base/hooks/lib/files.mts';
import { gitRun } from '../packs/base/hooks/lib/git-run.mts';
import { matchesAny } from '../packs/base/hooks/lib/glob.mts';
import { readJson, toJson } from '../packs/base/hooks/lib/json.mts';
import type { CodeFinding } from '../packs/base/hooks/lib/shape-code.mts';
import type { Env, Lock, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { readPack } from './packs.mts';
import { EMPTY_SHAPE, SHAPE_FILE, findInstanceLiterals, findSelectorDefs, findUnknownTypes, formatFinding, isExcluded, readShape, validateShape } from './shape.mts';
import type { InstanceFinding, LoadedShape } from './shape.mts';

/** One finding of a scan: an instance literal, a selector definition or a type with no row, and the file it is in. */
export type RepoFinding = (InstanceFinding | CodeFinding) & { file: string };

export const isSynth = (packs: readonly string[]): boolean => packs.some((p) => { try { return readPack(p).synth === true; } catch { return false; } });

// Writes design/shape.json with no concepts when there is none; returns true when it wrote one.
export function ensureShape(dir: string): boolean {
  const file = join(dir, SHAPE_FILE);
  if (existsSync(file)) return false;
  put(file, `${toJson(EMPTY_SHAPE, { pretty: true })}\n`);
  return true;
}

export function shapeProblems(dir: string, packs: readonly string[]): string[] {
  if (!existsSync(join(dir, SHAPE_FILE))) {
    return isSynth(packs) ? [`no ${SHAPE_FILE}: a synth writes down, before it builds, whether each concept is ONE or MANY (its generator, selectors and declared constants); start from \`{"concepts": {}, "exclude": []}\` and add a row per concept`] : [];
  }
  return validateShape(readShape(dir));
}

const SKIP: readonly string[] = ['.git/**', '**/node_modules/**', '.claude/worktrees/**', '.claude/.claude-packs-backup/**', '.claude/claude-packs.lock.json', '.claude/usage.log', '.claude/hooks.log'];

/** The project's files, relative: what git lists (tracked and not ignored), else a walk that leaves out `SKIP`. */
function files(dir: string, env: Env): string[] {
  const listed = gitRun(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: dir, env });
  if (listed.ok) return listed.stdout.split('\0').filter(Boolean);
  const bulky = (name: string): boolean => isJunk(name) || name === '.git' || name === 'node_modules';
  return walk(dir, bulky).map((abs) => relative(dir, abs)).filter((rel) => !matchesAny(rel, SKIP));
}

// Every finding in the repo, code, tests, docs and briefs alike; the files the kit installed are the kit's, not the repo's.
export function scanRepo(dir: string, shape: LoadedShape | null = readShape(dir), env: Env = process.env): RepoFinding[] {
  if (!shape) throw new Error(`no ${SHAPE_FILE} in ${dir}`);
  if (shape.error) throw new Error(shape.error);
  const kit = new Set(Object.keys(readJson<Lock>(join(dir, '.claude/claude-packs.lock.json'))?.files ?? {}));
  const findings: RepoFinding[] = [];
  for (const rel of files(dir, env)) {
    if (kit.has(rel) || matchesAny(rel, SKIP) || isExcluded(rel, shape)) continue;
    let text: string;
    try { if (statSync(join(dir, rel)).size > 4 * 1024 * 1024) continue; text = readFileSync(join(dir, rel), 'utf8'); } catch { continue; }
    if (text.includes('\0')) continue;
    for (const f of [...findInstanceLiterals(text, rel, shape), ...findSelectorDefs(text, rel, shape), ...findUnknownTypes(text, rel, shape)]) findings.push({ ...f, file: rel });
  }
  return findings;
}

export function shapeCommand(sub: string | undefined, dir: string, log: Logger = console.log, cwd: string = process.cwd(), env: Env = process.env): number {
  if (sub !== 'scan') throw new Error('use `npx --no-install @thedecipherist/claude-packs shape scan [--dir D]`');
  const findings = scanRepo(dir, readShape(dir), env);
  const byConcept = new Map<string, { n: number; files: Set<string> }>();
  for (const f of findings) {
    const named = { ...f, concept: f.concept ?? '', instance: 'instance' in f ? f.instance : '' };
    log(formatFinding(named, f.file).split('\n')[0] + ('kind' in f ? '' : `  [${f.why}]`));
    const k = f.concept ?? 'new type (no row)';
    const e = byConcept.get(k) ?? { n: 0, files: new Set<string>() };
    e.n += 1; e.files.add(f.file);
    byConcept.set(k, e);
  }
  log('');
  for (const [k, e] of byConcept) log(`${k}: ${e.n} finding(s) in ${e.files.size} file(s)`);
  log(findings.length ? `${findings.length} finding(s) in ${relative(cwd, dir) || '.'}: each is an example, a rule or a constant, or it is fixed` : 'no findings');
  return findings.length ? 1 : 0;
}
