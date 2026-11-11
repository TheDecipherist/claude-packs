// "Do the rules actually fire?" Two numbers per project: rules whose paths match no file
// (the folder structure and the rules disagree) and source files no rule covers (code that
// grew outside the structure). doctor prints both; `doctor --strict` fails on either.
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDir, readText, walk } from '../packs/base/hooks/lib/files.mts';
import { gitRun } from '../packs/base/hooks/lib/git-run.mts';
import type { InstalledGlobModule, InstalledLayoutModule } from '../packs/base/hooks/lib/types.d.mts';

import type { Env } from '../packs/base/hooks/lib/types.d.mts';

const SKIP = /(^|\/)(\.git|node_modules|build|Builds|_deps|JUCE|JuceLibraryCode|cmake-build[^/]*)(\/|$)/;
// Inside any .claude/ only the kit's own files are walked: skills, rules and agents, which rules on
// the `claude` concept aim at (Sub37 WB-1: skipping .claude made those rules look dead in --strict).
// Worktrees, hooks, state and backups stay out, so a worktree's copy never counts as the project's.
const CLAUDE_KEEP = new Set(['skills', 'rules', 'agents']);
export const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|mm|m|wgsl|metal|hlsl)$/i;

export interface CoverageReport {
  deadRules: string[];
  waitingRules: string[];
  liveRules: string[];
  uncovered: string[];
  files: string[];
  sourceCount: number;
}

interface RuleGlobs { rule: string; globs: string[] }

const slashed = (path: string): string => path.replace(/\\/g, '/');

// The files git would not ignore (tracked, and untracked but not ignored), relative to root; null
// when root is not inside a git work tree. Build output a project ignores (Stellix's out/**) is
// not source, wherever the build folder is and whatever it is called.
function gitVisible(root: string, env: Env): string[] | null {
  const r = gitRun(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, env });
  return r.ok ? r.stdout.split('\0').filter(Boolean) : null;
}

/** True for a path under some `.claude/` folder that is not the kit's own (a directory next to a skills, rules or agents one). */
function insideForeignClaude(rel: string): boolean {
  const parts = rel.split('/');
  return parts.some((part, i) => part === '.claude' && i + 2 < parts.length && !CLAUDE_KEEP.has(parts[i + 1] ?? ''));
}

/** The files of the project a rule may govern, relative to its root: what git shows when it can, else a walk. */
export function projectFiles(root: string, env: Env = process.env): string[] {
  const visible = gitVisible(root, env);
  const rels = visible ? visible.filter((rel) => existsSync(join(root, rel))) : walk(root, (name) => SKIP.test(name)).map((abs) => slashed(relative(root, abs)));
  return rels.filter((rel) => !SKIP.test(rel) && !insideForeignClaude(rel));
}

// The project's own .claude/ files (its rules, skills, agents), which rules of the "claude" concept
// fire on; agent worktrees, backups and run state are not the project's.
function claudeFiles(projectDir: string): string[] {
  const top = join(projectDir, '.claude');
  if (!isDir(top)) return [];
  const out: string[] = [];
  for (const name of readdirSync(top).sort()) {
    if (/^(worktrees|\.claude-packs-backup|state)$/.test(name)) continue;
    const abs = join(top, name);
    for (const file of isDir(abs) ? walk(abs, () => false) : [abs]) out.push(slashed(relative(projectDir, file)));
  }
  return out;
}

function rulePaths(claudeDir: string): RuleGlobs[] {
  const dir = join(claudeDir, 'rules');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const fm = (readText(join(dir, f)) ?? '').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    return { rule: f, globs: [...fm.matchAll(/^\s*-\s*"([^"]+)"/gm)].flatMap((m) => (m[1] === undefined ? [] : [m[1]])) };
  });
}

const installed = async <T extends object>(claudeDir: string, name: string): Promise<T> => import(pathToFileURL(join(claudeDir, 'hooks', 'lib', name)).href) as Promise<T>;

// `source`: what counts as source (the configuration's "sourceFiles"; default C, C++ and shaders). KWB-32: a full-stack project's
// TypeScript was never counted, so a file outside every rule could not show.
export async function coverage(projectDir: string, source: RegExp = SOURCE, env: Env = process.env): Promise<CoverageReport> {
  const claudeDir = join(projectDir, '.claude');
  const { matchesAny } = await installed<InstalledGlobModule>(claudeDir, 'glob.mjs');
  const { readLayout } = await installed<InstalledLayoutModule>(claudeDir, 'layout.mjs');
  const all = projectFiles(projectDir, env);
  const rules = rulePaths(claudeDir);
  const reachable = [...all, ...claudeFiles(projectDir)];
  const matchesNothing = (r: RuleGlobs): boolean => r.globs.length > 0 && !reachable.some((f) => matchesAny(f, r.globs));
  // A rule whose folder holds nothing yet waits for its first file; only one whose folder holds other files disagrees with the structure (KF-9: a new unit's
  // empty src/dsp made `doctor --strict` impossible). A glob with no folder of its own (**/*.py) says nothing about the structure either.
  const folderOf = (glob: string): string => (glob.split(/[*?{[]/)[0] ?? '').replace(/\/?[^/]*$/, '');
  const holdsFiles = (folder: string): boolean => Boolean(folder) && reachable.some((f) => f.startsWith(`${folder}/`));
  const waiting = (r: RuleGlobs): boolean => !r.globs.some((g) => holdsFiles(folderOf(g)));
  const deadRules = rules.filter((r) => matchesNothing(r) && !waiting(r)).map((r) => r.rule);
  const waitingRules = rules.filter((r) => matchesNothing(r) && waiting(r)).map((r) => r.rule);
  const liveRules = rules.filter((r) => all.some((f) => source.test(f) && matchesAny(f, r.globs))).map((r) => r.rule); // it governs source the project wrote
  const protectedGlobs = readLayout(projectDir).protected ?? [];
  const uncovered = all.filter((f) => source.test(f) && !matchesAny(f, protectedGlobs) && !rules.some((r) => matchesAny(f, r.globs)));
  return { deadRules, waitingRules, liveRules, uncovered, files: all, sourceCount: all.filter((f) => source.test(f)).length };
}
