#!/usr/bin/env node
// suite-once (PreToolUse, Bash): the whole test suite runs only when the user asks for a full run (one agent ran all 425 tests on
// 1 core; KWB-41: a session ran the kit's suite again and again, 12 minutes each, on code that had not changed; 1.3.0: a UI change
// that touched neither the engine nor its reference model waited over an hour on a C++ project's whole suite to land). The gate before
// landing and before a release is the tests the branch's changes reach, against the trunk (rule: test-only-what-changed; skill:
// pick-tests). A whole-suite command (`npm test`, `pnpm|yarn|bun test`, a bare `ctest`, `cargo test` with no name, the project's
// "commands".test in layout.json with any options after it, a build wrapper's `build.sh test`: KF-23) is refused unless the user's
// prompt that started the turn asks for one ("run the full suite"). Named tests (`npm test -- a.test.mjs`, `ctest -R x`) and the
// changed-only run are always allowed. `--selftest` proves it.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { bashOf, git, put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { lastPrompt } from './lib/turn.mjs';
import { judgeEvent, readPayload } from './lib/writes.mjs';
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

// The user asks for a full run, as a request in their own words: "run the full suite", "do a complete run", "start all the
// tests". A question about a full run, or a sentence that only mentions one ("why is the entire suite running", "full runs
// only when I ask"), is no request.
const ASKS_FULL = /\b(?:run|start|do|launch|kick off)\s+(?:\w+\s+){0,2}?(?:full|whole|complete|entire|every|all(?: of)?(?: the)?)\s+(?:\w+\s+){0,2}?(?:suite|run|tests?|gates?)\b/i;
export const askedForFull = (prompt) => ASKS_FULL.test(prompt ?? '');

export function refusal(command, cwd, asked = false) {
  const body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  let here = cwd;
  for (const part of body.split(/&&|\|\||;|\||\n|(?<![&>])&(?![&>])/)) {
    const cd = part.trim().match(/^cd\s+(\S+)$/);
    if (cd) { here = resolve(here, cd[1]); continue; }
    const words = clean(part);
    const { commands = {} } = readLayout(claudeRoot(resolve(here, 'x'))); // claudeRoot takes a file: a worktree's own layout, not main's
    if (!WHOLE.test(words) && !WRAPPER.test(bare(words)) && !ownSuite(words, commands.test)) continue;
    if (asked) continue;
    const dirty = uncommitted(checkoutRoot(resolve(here, 'x')));
    const changed = commands['test-changed'] ? `\`${commands['test-changed']}\`, against the trunk` : 'the pick-tests skill, against the trunk';
    return `\`${words}\` runs the whole suite${dirty.length ? `, on uncommitted work:\n    ${dirty.slice(0, 8).join('\n    ')}` : '.'}\n` +
      `The gate before landing and before a release is the tests the branch's changes reach (${changed}). The whole suite runs only when the user asks for a full run, in that turn.\n`;
  }
  return null;
}

// The user's prompt that started this turn decides whether a full run was asked for; with no transcript, nobody asked.
function main(text) {
  const payload = readPayload(text);
  const asked = askedForFull(payload?.transcript_path ? lastPrompt(payload.transcript_path) : '');
  return judgeEvent(text, { name: 'suite-once', command: (command, cwd) => refusal(command, cwd, asked) });
}

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const dir = scratchProject({ 'a.txt': 'one\n', '.claude/layout.json': JSON.stringify({ commands: { test: 'bash tools/all.sh', 'test-changed': 'npm run test:changed' } }) });
  git(dir, 'init', '-q');
  git(dir, 'add', 'a.txt', '.claude/layout.json');
  git(dir, 'commit', '-qm', 'x');
  const prompt = (name, words) => {
    const file = `${dir}/${name}.jsonl`;
    put(file, `${JSON.stringify({ type: 'user', message: { content: words } })}\n`);
    return file;
  };
  const land = prompt('land', 'land the branch');
  const full = prompt('full', 'something looks truly off, run the full suite');
  const asks = [
    ['a question about the suite is no request', askedForFull('why is the entire suite running?'), false],
    ['a sentence about full runs is no request', askedForFull('full complete runs should only be if I notice something off'), false],
    ['do a complete run', askedForFull('do a complete run of everything'), true],
    ['run all the tests', askedForFull('please run all the tests'), true],
  ].map(([label, got, want]) => [label, got ? 1 : 0, want ? 1 : 0]);
  const as = (cmd, transcript) => runHook(hook, dir, { ...bashOf(cmd, dir), transcript_path: transcript });
  const sh = (cmd) => as(cmd, land);
  const committed = [
    ['the whole suite to land committed work: the gate is the changed tests now', sh('npm test'), 2],
    ['the project\'s own whole-suite command, committed and unasked', sh('bash tools/all.sh'), 2],
    ['the whole suite when the user asks for it', as('npm test', full), 0],
    ['the project\'s own whole-suite command when asked', as('bash tools/all.sh', full), 0],
    ['no transcript: nobody asked', runHook(hook, dir, bashOf('npm test', dir)), 2],
  ];
  put(`${dir}/a.txt`, 'two\n');
  const said = sh('npm test');
  return verdicts('suite-once', [
    ...asks,
    ...committed,
    ['npm test on uncommitted work', said, 2],
    ['the changed tests against the trunk', sh('npm run test:changed -- --base origin/main'), 0],
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
