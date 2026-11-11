// KWB-112: every C and C++ build compiles through the shared compiler cache, so a worktree's first build compiles only
// what its branch changed. ccache's cache lives outside every project (the user's cache folder) and is shared by every
// worktree and project on the machine; a build folder whose CMakeCache.txt names no ccache launcher wastes it. Its base
// directory is the source root, so the same file in another worktree hashes the same.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { readText } from './files.mts';

/** Whether ccache can be run here. */
export function ccacheInstalled(): boolean {
  try {
    execFileSync('ccache', ['--version'], { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const blankQuotes = (s: string): string => s.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");

/** The build folders a command builds: `cmake --build <dir>` and `ninja -C <dir>`, wherever they stand in it. */
export function foldersBuiltBy(cmd: string, cwd: string): string[] {
  const body = blankQuotes(cmd);
  const cd = body.match(/(?:^|[;&|(]\s*)cd\s+(\S+)\s*&&/)?.[1];
  const from = cd ? cd.replace(/^~(?=\/|$)/, homedir()) : cwd;
  const at = (dir: string): string => (isAbsolute(dir) ? dir : join(from, dir));
  const found = [...body.matchAll(/\bcmake\s+--build\s+(?!-)(\S+)/g), ...body.matchAll(/\bninja\s+(?:\S+\s+)*?-C\s+(\S+)/g)];
  return found.map((m) => at(m[1] ?? ''));
}

/** Whether a configured build folder compiles C++ without the cache. A launcher set in the CMakeLists (`set(...)`, the
    usual way) is not in CMakeCache.txt, only in the generated build rules, so both are read. */
export function uncached(dir: string): boolean {
  const cache = join(dir, 'CMakeCache.txt');
  if (!existsSync(cache)) return false; // not configured yet: nothing to judge
  const text = readText(cache) ?? '';
  if (!/^CMAKE_CXX_COMPILER:/m.test(text)) return false; // no C++ here
  if (/^CMAKE_CXX_COMPILER_LAUNCHER:[A-Z]+=.*ccache/m.test(text)) return false;
  // Ninja puts the launcher in rules.ninja or, as a LAUNCHER variable, in build.ninja: either one is enough
  const generated = ['CMakeFiles/rules.ninja', 'build.ninja'].map((rel) => join(dir, rel)).filter(existsSync);
  return !generated.some((file) => /ccache/.test(readText(file) ?? ''));
}

/** The first build folder of a command that compiles without the cache, or null. */
export function uncachedBuild(cmd: string, cwd: string, installed: () => boolean = ccacheInstalled): string | null {
  const dirs = foldersBuiltBy(cmd, cwd);
  if (!dirs.length || !installed()) return null;
  return dirs.find(uncached) ?? null;
}

// The launcher is one word: JUCE configures its juceaide tool as a nested project and passes the launcher down, and a
// launcher list (`cmake -E env CCACHE_BASEDIR=... ccache`) broke that configure ("Unknown argument -E"). Worktrees share
// entries through ccache's own base_dir, set once on the machine to the folder that holds the projects.
export const cacheFix: string = [
  'Add this to the top-level CMakeLists.txt, after project(), then configure again (cmake -B <dir> ...):',
  '    find_program (CCACHE_PROGRAM ccache)',
  '    if (CCACHE_PROGRAM)  # a shared cache: a file compiled in one worktree is reused by every other',
  '        set (CMAKE_C_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")',
  '        set (CMAKE_CXX_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")',
  '        set (CMAKE_OBJCXX_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")',
  '    endif ()',
  'And once on the machine, so every worktree of every project shares entries: ccache --set-config base_dir=<the folder',
  'that holds the projects> (with hash_dir = false), and a size for them all: ccache -M 100G.',
  'The rule cpp-builds-share-one-compiler-cache says why, and the build-preflight skill how to prove it hits.',
].join('\n');
