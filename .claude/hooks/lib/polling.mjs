// polling: a sleep loop or a long sleep in the commands a shell line runs. The one reader, shared by base's no-polling hook
// (KWB-204: the refusal lived only in one configuration's build guard, so a base install refused nothing).
import { blankQuotes, dropHeredocs } from './shell-lex.mjs';
/** What a line waits in, or null: a loop that sleeps, a sleep over 5 seconds, `tail -f`. Quoted text and heredoc bodies are no commands. */
export function pollingIn(cmd) {
    // a wait on one process holds the turn for a job of its own (KWB-210): `tail --pid=N -f /dev/null` follows no log
    const body = blankQuotes(dropHeredocs(cmd)).replace(/\btail\s+(?:-\S+\s+)*--pid[=\s]\d+\s+(?:-\S+\s+)*\/dev\/null\b/g, 'true');
    if (/\b(until|while)\b[^\n]*\bdo\b[\s\S]*\bsleep\b/.test(body) || /\b(until|while)\b[\s\S]*;\s*do\b[\s\S]*\bsleep\b/.test(body))
        return 'a loop that sleeps';
    for (const m of body.matchAll(/(?:^|[;&|(\n]|\bdo\b|\bthen\b)\s*sleep\s+([0-9.]+)/g))
        if (Number(m[1]) > 5)
            return `sleep ${m[1]}`;
    if (/for\s+\w+\s+in\s+\$\(seq[^)]*\)[\s\S]*\bsleep\b/.test(body))
        return 'a loop that sleeps';
    // any words of the same command before the -f (`tail -n +1 -f`, KWB-213), never past a pipe or a separator (grep -f is grep's)
    if (/\btail\s+(?:[^\s|;&]+\s+)*?-[a-zA-Z]*[fF]\b/.test(body))
        return 'tail -f on a log (watching, not working)';
    return null;
}
