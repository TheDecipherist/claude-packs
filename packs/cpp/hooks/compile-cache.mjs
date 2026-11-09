#!/usr/bin/env node
// PreToolUse (Bash): every C and C++ build compiles through the shared compiler cache (KWB-112).
// A C++ project in worktrees compiled everything again in each: the Matrix-12's first build in a new worktree was 1,241 to
// 1,554 compile steps (JUCE included) for a change to one file, while ccache sat installed and unused. This refuses a
// build (`cmake --build <dir>`, `ninja -C <dir>`, through the build queue or not) of a folder whose CMakeCache.txt names no
// ccache launcher, when ccache is installed, and names the lines that fix it. A folder not configured yet, a project
// with no C++ and a machine without ccache pass. The rule builds-share-one-compiler-cache says why.
// `--selftest` proves it.
import { fileURLToPath } from 'node:url';
import { cacheFix, ccacheInstalled, uncachedBuild } from './lib/compile-cache.mjs';
import { bashOf, put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

// The machine's answer, unless a selftest names it (COMPILE_CACHE_INSTALLED=yes|no)
const installed = () => (process.env.COMPILE_CACHE_INSTALLED ? process.env.COMPILE_CACHE_INSTALLED === 'yes' : ccacheInstalled());

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; }
  if (payload.tool_name !== 'Bash') return 0;
  const cmd = String(payload.tool_input?.command ?? '');
  const bare = uncachedBuild(cmd, payload.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), installed);
  if (!bare) return 0;
  process.stderr.write(`BLOCKED by compile-cache: ${bare} is configured without the shared compiler cache, so every worktree ` +
    `compiles everything again.\n${cacheFix}\n`);
  return 2;
}

function selftest() {
  const self = fileURLToPath(import.meta.url);
  const dir = scratchProject();
  put(`${dir}/bare/CMakeCache.txt`, 'CMAKE_CXX_COMPILER:FILEPATH=/usr/bin/c++\n');
  put(`${dir}/cached/CMakeCache.txt`, 'CMAKE_CXX_COMPILER:FILEPATH=/usr/bin/c++\nCMAKE_CXX_COMPILER_LAUNCHER:STRING=/opt/homebrew/bin/ccache\n');
  put(`${dir}/plain-c/CMakeCache.txt`, 'CMAKE_C_COMPILER:FILEPATH=/usr/bin/cc\n');
  const run = (cmd, have) => {
    process.env.COMPILE_CACHE_INSTALLED = have;
    return runHook(self, dir, bashOf(cmd, dir)) === 2;
  };
  const cases = [
    ['a build of an uncached folder, through the queue', run('node .claude/tools/buildq.mjs cmake --build bare --target X', 'yes'), true],
    ['ninja in an uncached folder', run('node .claude/tools/buildq.mjs ninja -C bare X', 'yes'), true],
    ['a cached folder builds', run('node .claude/tools/buildq.mjs cmake --build cached --target X', 'yes'), false],
    ['configuring is not building', run('cmake -B bare -DX=1', 'yes'), false],
    ['a folder not configured yet', run('node .claude/tools/buildq.mjs cmake --build fresh --target X', 'yes'), false],
    ['no C++ in it', run('node .claude/tools/buildq.mjs cmake --build plain-c', 'yes'), false],
    ['text that names a build', run("echo 'cmake --build bare'", 'yes'), false],
    ['no ccache on the machine', run('node .claude/tools/buildq.mjs cmake --build bare --target X', 'no'), false],
  ];
  delete process.env.COMPILE_CACHE_INSTALLED;
  return verdicts('compile-cache', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('compile-cache', main));
