// KWB-112: every C and C++ build compiles through the shared compiler cache, so a worktree's first build compiles only
// what its branch changed. ccache's cache lives outside every project (the user's cache folder) and is shared by every
// worktree and project on the machine; a build folder whose CMakeCache.txt names no ccache launcher wastes it. Its base
// directory is the source root, so the same file in another worktree hashes the same.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';

/** Whether ccache can be run here. */
export function ccacheInstalled() {
  try {
    execFileSync('ccache', ['--version'], { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const blankQuotes = (s) => s.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");

/** The build folders a command builds: `cmake --build <dir>` and `ninja -C <dir>`, wherever they stand in it. */
export function buildFolders(cmd, cwd) {
  const body = blankQuotes(cmd);
  const cd = body.match(/(?:^|[;&|(]\s*)cd\s+(\S+)\s*&&/)?.[1];
  const from = cd ? cd.replace(/^~(?=\/|$)/, homedir()) : cwd;
  const at = (dir) => (isAbsolute(dir) ? dir : join(from, dir));
  const found = [...body.matchAll(/\bcmake\s+--build\s+(?!-)(\S+)/g), ...body.matchAll(/\bninja\s+(?:\S+\s+)*?-C\s+(\S+)/g)];
  return found.map((m) => at(m[1]));
}

/** Whether a configured build folder compiles C++ without the cache: its CMakeCache.txt names no ccache launcher. */
export function uncached(dir) {
  const cache = join(dir, 'CMakeCache.txt');
  if (!existsSync(cache)) return false; // not configured yet: nothing to judge
  const text = readFileSync(cache, 'utf8');
  if (!/^CMAKE_CXX_COMPILER:/m.test(text)) return false; // no C++ here
  return !/^CMAKE_CXX_COMPILER_LAUNCHER:[A-Z]+=.*ccache/m.test(text);
}

/** The first build folder of a command that compiles without the cache, or null. */
export function uncachedBuild(cmd, cwd, installed = ccacheInstalled) {
  const dirs = buildFolders(cmd, cwd);
  if (!dirs.length || !installed()) return null;
  return dirs.find(uncached) ?? null;
}

export const cacheFix = [
  'Add this to the top-level CMakeLists.txt, after project(), then configure again (cmake -B <dir> ...):',
  '    find_program (CCACHE_PROGRAM ccache)',
  '    if (CCACHE_PROGRAM)  # a shared cache: a file compiled in one worktree is reused by every other',
  '        set (cache "${CMAKE_COMMAND}" -E env "CCACHE_BASEDIR=${CMAKE_SOURCE_DIR}" CCACHE_NOHASHDIR=1 "${CCACHE_PROGRAM}")',
  '        set (CMAKE_C_COMPILER_LAUNCHER ${cache})',
  '        set (CMAKE_CXX_COMPILER_LAUNCHER ${cache})',
  '        set (CMAKE_OBJCXX_COMPILER_LAUNCHER ${cache})',
  '    endif ()',
  'The rule builds-share-one-compiler-cache says why, and the build-through-the-queue skill how to prove it hits.',
].join('\n');
