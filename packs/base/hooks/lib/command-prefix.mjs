// command-prefix: the command a shell line really runs, past the wrappers in front of it. Every guard that reads a
// command by its first word reads it through this, so `timeout 100 git push -u <token url>` is judged as the
// git push it is (KWB-101: the token law read only lines that started with git, and a timeout in front hid it).
//
//   bareWords(words) -> the words from the real command on: VAR=value assignments and the wrappers below left out,
//                       with their own options (sudo -u me, nice -n 5, timeout -k 5 100, stdbuf -oL).
// Each wrapper, and which of its options take a value of their own as the next word.
const WRAPPERS = new Map([
    ['sudo', new Set(['-u', '-g', '-C', '-D', '-h', '-p', '-r', '-t', '-U'])],
    ['env', new Set(['-u', '-C', '-S'])],
    ['nice', new Set(['-n'])],
    ['timeout', new Set(['-k', '-s'])],
    ['stdbuf', new Set(['-i', '-o', '-e'])],
    ['command', new Set()],
    ['builtin', new Set()],
    ['nohup', new Set()],
    ['time', new Set(['-f', '-o'])],
    ['exec', new Set(['-a'])],
]);
const ASSIGNMENT = /^[A-Za-z_]\w*=/;
export function bareWords(words) {
    let i = 0;
    while (i < words.length) {
        const word = words[i] ?? '';
        if (ASSIGNMENT.test(word)) {
            i += 1;
            continue;
        }
        const valued = WRAPPERS.get(word);
        if (!valued)
            break;
        i += 1;
        while (i < words.length && (words[i] ?? '').startsWith('-'))
            i += valued.has(words[i] ?? '') ? 2 : 1;
        if (word === 'timeout' && i < words.length)
            i += 1; // its duration
        while (word === 'env' && i < words.length && ASSIGNMENT.test(words[i] ?? ''))
            i += 1;
    }
    return words.slice(i);
}
