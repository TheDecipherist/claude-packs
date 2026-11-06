#!/usr/bin/env node
// suite-once (PreToolUse, Bash): the whole test suite runs once, as the gate before landing, never while working (one
// agent ran all 425 tests on 1 core; KWB-41: a session ran the kit's suite again and again, 12 minutes each, on code that had not
// changed). A whole-suite command (`npm test`, `pnpm|yarn|bun test`, a bare `ctest`, `cargo test` with no name, the project's "commands".test in layout.json with any
// options after it, a build wrapper's `build.sh test`: KF-23, the wrapper is the route the kit's own build rule names) is refused while the checkout it runs in has uncommitted tracked changes: uncommitted means still working, and working runs only the
// tests the change reaches (rule: test-only-what-changed; skill: pick-tests). Once the work is committed the gate passes. Named tests
// (`npm test -- a.test.mjs`, `ctest -R x`) are always allowed. `--selftest` proves it.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { bashOf, git, put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const WHOLE = /^(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test|ctest(?:\s+(?!-R\b|--tests-regex\b|-L\b|-I\b)\S+)*|cargo\s+(?:test|nextest\s+run)(?:\s+-\S+)*)$/;
const PREFIX = /^(?:[A-Za-z_]\w*=\S*\s+|(?:env|command|nohup|time|exec|\S*buildq)\s+|timeout\s+\S+\s+)+/;
const REDIRECT = /\s*(?:\d?>>?|&>)&?\s*\S+/g;
const WRAPPER = /^\S*\bbuild\.sh\s+test(?:\s+-\S+)*$/;

const clean = (part) => part.trim().replace(PREFIX, '').replace(REDIRECT, '').trim();
const bare = (words) => words.replace(/^(?:bash|sh)\s+/, '').replace(/^\.\//, '');

// The project's own command, as it is or with options; a name after it (`build.sh test one_gate`) is a named test.
function ownSuite(words, test) {
  if (!test) return false;
  const [w, t] = [bare(words), bare(test)];
  return w === t || (w.startsWith(`${t} `) && w.slice(t.length).trim().split(/\s+/).every((a) => a.startsWith('-')));
}

function uncommitted(dir) {
  try {
    return execFileSync('git', ['-C', dir, '--no-optional-locks', 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter((l) => l.trim());
  } catch {
    return []; // not a repository: nothing says the work is unfinished
  }
}

export function refusal(command, cwd) {
  const body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  let here = cwd;
  for (const part of body.split(/&&|\|\||;|\||\n|(?<![&>])&(?![&>])/)) {
    const cd = part.trim().match(/^cd\s+(\S+)$/);
    if (cd) { here = resolve(here, cd[1]); continue; }
    const words = clean(part);
    const { commands = {} } = readLayout(claudeRoot(here));
    if (!WHOLE.test(words) && !WRAPPER.test(bare(words)) && !ownSuite(words, commands.test)) continue;
    const dirty = uncommitted(checkoutRoot(resolve(here, 'x')));
    if (!dirty.length) continue;
    return `\`${words}\` runs the whole suite, and this checkout has uncommitted work:\n    ${dirty.slice(0, 8).join('\n    ')}\n` +
      `The whole suite runs once, as the gate before landing, never while working. Run the tests this change reaches${commands['test-changed'] ? ` (\`${commands['test-changed']}\`)` : ' (the pick-tests skill)'}; commit; then run the whole suite once.\n`;
  }
  return null;
}

const main = (text) => judgeEvent(text, { name: 'suite-once', command: refusal });

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const dir = scratchProject({ 'a.txt': 'one\n', '.claude/layout.json': JSON.stringify({ commands: { test: 'bash tools/all.sh', 'test-changed': 'npm run test:changed' } }) });
  git(dir, 'init', '-q');
  git(dir, 'add', 'a.txt', '.claude/layout.json');
  git(dir, 'commit', '-qm', 'x');
  const sh = (cmd) => runHook(hook, dir, bashOf(cmd, dir));
  const committed = [
    ['the gate, every change committed', sh('npm test'), 0],
    ['the project\'s own whole-suite command, committed', sh('bash tools/all.sh'), 0],
  ];
  put(`${dir}/a.txt`, 'two\n');
  const said = runHook(hook, dir, bashOf('npm test', dir));
  return verdicts('suite-once', [
    ...committed,
    ['npm test on uncommitted work', said, 2],
    ['pnpm, a run form and a prefix', sh('CI=1 timeout 300 pnpm run test'), 2],
    ['a redirect and a pipe change nothing', sh('npm test > /tmp/log 2>&1 | tail -3'), 2],
    ['a bare ctest', sh('ctest --output-on-failure'), 2],
    ['cargo test of the whole workspace', sh('cargo test --workspace --all-features'), 2],
    ['cargo nextest of everything', sh('cargo nextest run'), 2],
    ['cargo test of one test', sh('cargo test parses_header'), 0],
    ['cargo test of one crate', sh('cargo test -p core parses_header'), 0],
    ['the project\'s own whole-suite command', sh('bash tools/all.sh'), 2],
    ['its command with an option, in the background', sh('nohup tools/all.sh --full-gate > /tmp/log 2>&1 &'), 2],
    ['a build wrapper, with no command declared', sh('tools/build.sh test --full-gate'), 2],
    ['a build wrapper with one test named', sh('tools/build.sh test one_gate'), 0],
    ['after other steps', sh('git status && npm test'), 2],
    ['named tests', sh('npm test -- a.test.mjs'), 0],
    ['the changed-only run', sh('npm run test:changed'), 0],
    ['ctest of one pattern', sh("ctest -R 'svf'"), 0],
    ['words about the suite', sh("echo 'npm test'"), 0],
    ['a heredoc body', sh("cat <<'EOF'\nnpm test\nEOF"), 0],
    ['another project', sh('cd /tmp && npm test'), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('suite-once', main));
