// polling: a sleep loop or a long sleep in the commands a shell line runs. The one reader, shared by base's no-polling hook
// (KWB-204: the refusal lived only in one configuration's build guard, so a base install refused nothing).
import { blankQuotes, dropHeredocs } from './shell-lex.mjs';
/** What a line waits in, or null: a loop that sleeps, a sleep over 5 seconds, `tail -f`. Quoted text and heredoc bodies are no commands. */
export function pollingIn(cmd) {
    const body = blankQuotes(dropHeredocs(cmd));
    if (/\b(until|while)\b[^\n]*\bdo\b[\s\S]*\bsleep\b/.test(body) || /\b(until|while)\b[\s\S]*;\s*do\b[\s\S]*\bsleep\b/.test(body))
        return 'a loop that sleeps';
    for (const m of body.matchAll(/(?:^|[;&|(\n]|\bdo\b|\bthen\b)\s*sleep\s+([0-9.]+)/g))
        if (Number(m[1]) > 5)
            return `sleep ${m[1]}`;
    if (/for\s+\w+\s+in\s+\$\(seq[^)]*\)[\s\S]*\bsleep\b/.test(body))
        return 'a loop that sleeps';
    if (/\btail\s+(-\S*\s+)*-[a-zA-Z]*[fF]\b/.test(body))
        return 'tail -f on a log (watching, not working)';
    return null;
}
