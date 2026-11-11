// no-find (PreToolUse, Bash; 1.8.2): no searching the disk for a file. The user: "we need a hook that stops using find. there
// would never be a good reason for using find unless it is explicitely told to do so. Locations should always be defined in
// anything that is in workorders". A BANDWARP agent on the Mac ran `find / -name QwertyPlayer.h` for a file the order lists
// in ~/projects/synthcore: 1.8 TB, 435% CPU for a minute and a half, the fan loud, the load at 28 (KWB-154).
// Refused, as a command anywhere in the line (past wrappers: `timeout 60 find`, `xargs find`): find, gfind, bfs, fd,
// fdfind, locate, mlocate, plocate, mdfind. Allowed when the user's prompt that started the turn asks for one by name
// ("use find to ..."). The refusal says where to look instead: the order's sources and the project's own Glob and Grep.
// The worked example of the hook contract (typescript order W4, docs/workorders/typescript/briefs/W4-hook.md): `hook(event, ctx)`
// returns its Verdict, reads nothing of the process, and its worktree case is data beside its selftest.
import { bareWords } from './lib/command-prefix.mjs';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { bashOf, promptFile, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mjs';
import { lastPrompt } from './lib/turn.mjs';
import { judgeVerdict } from './lib/writes.mjs';
import { fileURLToPath } from 'node:url';
const SEARCHERS = new Set(['find', 'gfind', 'bfs', 'fd', 'fdfind', 'locate', 'mlocate', 'plocate', 'mdfind']);
const RUNNERS = new Set(['xargs', 'exec', 'command', 'builtin', 'time']); // run the command they are given
const SEARCHER_NAMES = [...SEARCHERS].join('|');
// The user asks for one by name, in their own words: "use find", "run fd", "search with locate". A question about one ("why did
// it use find?") asks nothing of the agent.
const ASKS = new RegExp(String.raw `\b(?:use|run|with|try)\s+(?:the\s+)?\x60?(?:${SEARCHER_NAMES})\b`, 'i');
const QUESTION = /^\s*(?:why|how|what|when|where|who|did|does|do|is|was|are|were|can|could|should)\b|\?\s*$/i;
export const askedFor = (prompt) => (prompt ?? '').split(/(?<=[.!?\n])/).some((s) => ASKS.test(s) && !QUESTION.test(s));
/** The search command a line runs, or null: a part's first real word, past wrappers and runners. Quoted text and heredoc
 *  bodies are no commands. */
export function searcherIn(command) {
    const body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
    for (const part of body.split(/&&|\|\||;|\||\n|(?<![&>])&(?![&>])|\$\(|\x60/)) {
        let words = bareWords(part.trim().split(/\s+/).filter(Boolean));
        while (words.length && RUNNERS.has(words[0] ?? ''))
            words = words.slice(1).filter((w, i) => i > 0 || !w.startsWith('-'));
        const name = (words[0] ?? '').split('/').pop() ?? '';
        if (SEARCHERS.has(name))
            return name;
    }
    return null;
}
export function refusal(command, asked = false) {
    const found = searcherIn(command);
    if (!found || asked)
        return null;
    return `BLOCKED by no-find: \`${found}\` searches the disk for what should be known. Every location is named: the work order lists ` +
        'its sources with their paths (a library, a reference project, JUCE in out/), the project\'s layout names its folders, and a brief ' +
        'carries both. Read the file where the order says it is; to look inside a known folder, use the Glob or Grep tool on that folder. ' +
        'A location the order does not name is a gap in the order: say so, and add it there. The user can allow it for a turn ' +
        `("use ${found} to ...") (KWB-154: a find / took a Mac for a minute and a half for a file in ~/projects/synthcore).\n`;
}
export const hook = (event, ctx) => {
    const asked = askedFor(event.transcript_path ? lastPrompt(event.transcript_path) : '');
    return judgeVerdict(event, { name: 'no-find', command: (command) => refusal(command, asked) }, ctx);
};
/** A search is refused in a worktree as in the main checkout (1.8.2, KWB-154): nobody asked for one. */
export const worktreeCase = {
    steps: [
        { label: 'a find after a cd into the worktree', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && find . -name x' } }, want: 2 },
        { label: 'a find after a cd into the main checkout', event: { tool_name: 'Bash', tool_input: { command: 'cd {here} && find . -name x' } }, want: 2 },
        { label: 'git grep in the worktree is no search of the disk', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && git grep -n x' } }, want: 0 },
    ],
};
export function selftest() {
    const hookFile = fileURLToPath(import.meta.url);
    const dir = scratchProject({ 'a.txt': 'one\n' });
    const plain = promptFile(dir, 'plain', 'build the settings layer');
    const told = promptFile(dir, 'told', 'use find to list every wav under reference/');
    const before = snapshot(dir); // the project as the judge finds it: the rows below must leave it as it is
    const sh = (cmd, transcript = plain) => runHook(hookFile, dir, { ...bashOf(cmd, dir), transcript_path: transcript }).status;
    const total = (...codes) => codes.reduce((sum, c) => sum + (c ?? 0), 0);
    return verdicts('no-find', [
        ['find from the root', sh('find / -name QwertyPlayer.h -path "*core*"'), 2],
        ['find in the project', sh('find . -name "*.cpp"'), 2],
        ['bfs, fd and locate', total(sh('bfs ~ -name x'), sh('fd QwertyPlayer'), sh('locate QwertyPlayer.h')), 6],
        ['mdfind (Spotlight)', sh('mdfind -name QwertyPlayer.h'), 2],
        ['after a cd, in a chain', sh('mkdir -p src && cd src && find . -name x 2>/dev/null | head'), 2],
        ['behind a wrapper', sh('timeout 60 find / -name x'), 2],
        ['through xargs', sh('ls | xargs find -name x'), 2],
        ['inside $( )', sh('cat $(find . -name x)'), 2],
        ['by its path', sh('/usr/bin/find . -maxdepth 1'), 2],
        ['the user asked for find by name', sh('find reference -name "*.wav"', told), 0],
        ['no transcript: nobody asked', runHook(hookFile, dir, bashOf('find . -name x', dir)).status, 2],
        ['the word in a string is no command', sh('echo "find the bug"'), 0],
        ['nor after a separator inside a string', sh('git commit -m "fix it; find the leak later" -- a.txt'), 0],
        ['git grep and grep in a named folder', sh('git grep -n QwertyPlayer -- src && grep -rn x src/'), 0],
        ['a heredoc body', sh("cat <<'EOF'\nfind / -name x\nEOF"), 0],
        ['a word that only starts with find', sh('./tools/findings.sh'), 0],
        ['a question about find is no request', askedFor('why did it use find?') ? 1 : 0, 0],
        ['a request among other sentences', askedFor('the samples moved. Use find to list them under reference/.') ? 1 : 0, 1],
        ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'no-find', hook, selftest);
