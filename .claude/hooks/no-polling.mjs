// no-polling (PreToolUse, Bash; KWB-204): waiting in a sleep loop is refused in every project. The law is base's
// (long-work-in-the-background, work-inside-the-project); the refusal lived only in one configuration's build guard, so the kit's own
// install refused nothing, and two agents waited on their tests in `until ...; do sleep N; done` loops writing to /tmp.
// Refused: a while/until loop that sleeps, a sleep over 5 seconds, `tail -f`. Allowed: `sleep 2`, a loop with no sleep, and text
// that only mentions them (a quoted string, a heredoc body).
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { pollingIn } from './lib/polling.mjs';
import { bashOf, bashStep, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mjs';
import { judgeVerdict } from './lib/writes.mjs';
export function refusal(command) {
    const found = pollingIn(command);
    if (!found)
        return null;
    return `BLOCKED by no-polling: polling refused (${found}). Waiting in a sleep loop hides what you are doing and burns turns. ` +
        'Run the long command with run_in_background and its output in a file inside the project (build/<name>.txt, never /tmp): you are ' +
        'notified when it ends, and you read the file then. A foreground command may run up to 10 minutes on its own (KWB-204).\n';
}
export const hook = (event, ctx) => judgeVerdict(event, { name: 'no-polling', command: refusal }, ctx);
/** A sleep loop is refused from a worktree as in the main checkout; a plain short sleep is not. */
export const worktreeCase = {
    steps: [
        bashStep('a sleep loop after a cd into the worktree', 'cd {wt} && until test -f x; do sleep 5; done', 2),
        bashStep('a sleep loop after a cd into the main checkout', 'cd {here} && while true; do sleep 9; done', 2),
        bashStep('a short sleep in the worktree', 'cd {wt} && sleep 2 && ls', 0),
    ],
};
// one-off: a selftest opens with the same few setup lines in every hook (the hook file, a scratch project, a snapshot, a runner)
export function selftest() {
    const hookFile = fileURLToPath(import.meta.url);
    const dir = scratchProject({ 'a.txt': 'one\n' });
    const before = snapshot(dir);
    const sh = (cmd) => runHook(hookFile, dir, bashOf(cmd, dir)).status;
    return verdicts('no-polling', [
        ['until ... sleep', sh("until grep -qE 'done' log; do sleep 10; done"), 2],
        ['while true with sleep on its own line', sh('while true; do\n  sleep 15\ndone'), 2],
        ['a seq loop that sleeps', sh('for i in $(seq 1 55); do grep -q x f && break; sleep 20; done'), 2],
        ['a long sleep', sh('sleep 180'), 2],
        ['tail -f', sh('timeout 585 tail -f build/x.log'), 2],
        ['the refusal says what to do instead', runHook(hookFile, dir, bashOf('sleep 99', dir)).stderr.includes('run_in_background') ? 1 : 0, 1],
        ['a plain short sleep', sh('sleep 2 && ls'), 0],
        ['a loop with no sleep', sh('for f in a b; do echo "$f"; done'), 0],
        ['the words in a string', sh('echo "until x; do sleep 60; done"'), 0],
        ['a heredoc body that merely contains them', sh("cat > f.sh <<'EOF'\nwhile true; do sleep 9; done\nEOF"), 0],
        ['tail of a number of lines', sh('tail -n 20 build/x.log'), 0],
        ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'no-polling', hook, selftest);
