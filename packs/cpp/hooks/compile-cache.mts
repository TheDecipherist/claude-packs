// PreToolUse (Bash): every C and C++ build compiles through the shared compiler cache (KWB-112).
// A C++ project in worktrees compiled everything again in each: the Matrix-12's first build in a new worktree was 1,241 to
// 1,554 compile steps (JUCE included) for a change to one file, while ccache sat installed and unused. This refuses a
// build (`cmake --build <dir>`, `ninja -C <dir>`, through the build queue or not) of a folder whose CMakeCache.txt names no
// ccache launcher, when ccache is installed, and names the lines that fix it. A folder not configured yet, a project
// with no C++ and a machine without ccache pass. The rule builds-share-one-compiler-cache says why.
// `--selftest` proves it.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cacheFix, ccacheInstalled, uncachedBuild } from './lib/compile-cache.mts';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { toJson } from './lib/json.mts';
import { bashOf, put, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

export const hook: Hook = (event, ctx) => {
  if (event.tool_name !== 'Bash') return pass;
  const cmd = String(event.tool_input?.command ?? '');
  // The machine's answer, unless the caller's environment names it (COMPILE_CACHE_INSTALLED=yes|no, as a selftest does)
  const said = ctx.env['COMPILE_CACHE_INSTALLED'];
  const installed = (): boolean => (said ? said === 'yes' : ccacheInstalled());
  const bare = uncachedBuild(cmd, event.cwd ?? ctx.projectDir, installed);
  if (!bare) return pass;
  return refuse(`BLOCKED by compile-cache: ${bare} is configured without the shared compiler cache, so every worktree ` +
    `compiles everything again.\n${cacheFix}\n`);
};

/** A build of a folder is judged by that folder. Whether ccache is installed is the machine's answer, so the case holds only
 *  the rows that are the same either way: a cached folder, a folder not configured yet, and text that only names a build. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/cached/CMakeCache.txt': 'CMAKE_CXX_COMPILER:FILEPATH=/usr/bin/c++\nCMAKE_CXX_COMPILER_LAUNCHER:STRING=/opt/homebrew/bin/ccache\n' },
  steps: [
    { label: 'a build of a cached folder in the worktree', event: { tool_name: 'Bash', tool_input: { command: 'cmake --build {wt}/cached --target X' } }, want: 0 },
    { label: 'a folder in the worktree not configured yet', event: { tool_name: 'Bash', tool_input: { command: 'cmake --build {wt}/fresh --target X' } }, want: 0 },
    { label: 'text that names a build', event: { tool_name: 'Bash', tool_input: { command: "echo 'cmake --build {wt}/bare'" } }, want: 0 },
  ],
};

const C = 'CMAKE_CXX_COMPILER:FILEPATH=/usr/bin/c++\n';
// The build folders a selftest builds. A launcher set in the CMakeLists is only in the generated rules, never in CMakeCache.txt
// (the Matrix-12, Stellix, Tabula); or only in build.ninja, as a LAUNCHER variable, with rules.ninja beside it naming none (the
// Matrix-12's main checkout).
const FOLDERS: readonly (readonly [string, string])[] = [
  ['bare/CMakeCache.txt', C],
  ['cached/CMakeCache.txt', `${C}CMAKE_CXX_COMPILER_LAUNCHER:STRING=/opt/homebrew/bin/ccache\n`],
  ['plain-c/CMakeCache.txt', 'CMAKE_C_COMPILER:FILEPATH=/usr/bin/cc\n'],
  ['set-in-lists/CMakeCache.txt', C],
  ['set-in-lists/CMakeFiles/rules.ninja', 'rule CXX_COMPILER__x\n  command = /opt/homebrew/bin/ccache /usr/bin/c++ $DEFINES -c $in\n'],
  ['in-build/CMakeCache.txt', C],
  ['in-build/CMakeFiles/rules.ninja', 'rule CXX_COMPILER__x\n  command = $LAUNCHER$CODE_CHECK /usr/bin/c++ -c $in\n'],
  ['in-build/build.ninja', 'build a.o: CXX_COMPILER__x a.cpp\n  LAUNCHER = /opt/homebrew/bin/ccache\n'],
];

export function selftest(): number {
  const self = fileURLToPath(import.meta.url);
  const dir = scratchProject();
  for (const [rel, text] of FOLDERS) put(`${dir}/${rel}`, text);
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const env = contextOf().env;
  // The hook's own process, told by the caller's environment whether ccache is installed (the hook reads that, never the machine, then)
  const run = (cmd: string, have: 'yes' | 'no'): boolean => {
    const r = spawnSync(process.execPath, [self], { cwd: dir, input: toJson(bashOf(cmd, dir)), encoding: 'utf8', env: { ...env, CLAUDE_PROJECT_DIR: dir, COMPILE_CACHE_INSTALLED: have } });
    return r.status === 2;
  };
  return verdicts('compile-cache', [
    ['a build of an uncached folder, through the queue', run('node .claude/tools/buildq.mjs cmake --build bare --target X', 'yes'), true],
    ['ninja in an uncached folder', run('node .claude/tools/buildq.mjs ninja -C bare X', 'yes'), true],
    ['a cached folder builds', run('node .claude/tools/buildq.mjs cmake --build cached --target X', 'yes'), false],
    ['a launcher set in the CMakeLists builds', run('node .claude/tools/buildq.mjs cmake --build set-in-lists --target X', 'yes'), false],
    ['a launcher only in build.ninja builds', run('node .claude/tools/buildq.mjs cmake --build in-build --target X', 'yes'), false],
    ['configuring is not building', run('cmake -B bare -DX=1', 'yes'), false],
    ['a folder not configured yet', run('node .claude/tools/buildq.mjs cmake --build fresh --target X', 'yes'), false],
    ['no C++ in it', run('node .claude/tools/buildq.mjs cmake --build plain-c', 'yes'), false],
    ['text that names a build', run("echo 'cmake --build bare'", 'yes'), false],
    ['no ccache on the machine', run('node .claude/tools/buildq.mjs cmake --build bare --target X', 'no'), false],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'compile-cache', hook, selftest);
