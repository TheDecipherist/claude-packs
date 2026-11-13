// rule-log: one line per rule file loaded into the context, in .claude/logs/rules.jsonl: { t, session, branch, rule, file, why, globs?, trigger? }.
// Claude Code's InstructionsLoaded event carries every load of a CLAUDE.md or .claude/rules/*.md file: why is its load_reason
// (session_start: at launch; path_glob_match: its `paths:` matched a file Claude touched, named in trigger; nested_traversal, include, compact).
// Only a file under a .claude/rules/ folder is a rule. A recorder on the hook contract: it refuses nothing.
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mjs';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { RULES, logUsage } from './lib/usage-log.mjs';
import { pass } from './lib/verdict.mjs';
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : undefined);
export const hook = (event, ctx) => {
    const file = event['file_path'];
    if (event.hook_event_name !== 'InstructionsLoaded' || typeof file !== 'string' || !/(^|\/)\.claude\/rules\/.+\.md$/.test(file))
        return pass;
    const trigger = event['trigger_file_path'];
    const reason = event['load_reason'];
    logUsage(ctx, event, RULES, {
        rule: basename(file, '.md'), file: file.startsWith(`${ctx.projectDir}/`) ? file.slice(ctx.projectDir.length + 1) : file,
        why: typeof reason === 'string' ? reason : 'unknown', globs: strings(event['globs']), trigger: typeof trigger === 'string' ? trigger : undefined,
    });
    return pass; // not a refusal: a usage log only records
};
/** A rule loaded in a worktree is logged in the main checkout, and the event passes. */
export const worktreeCase = {
    steps: [
        { label: 'a rule loaded in the worktree', event: { hook_event_name: 'InstructionsLoaded', cwd: '{wt}', file_path: '{wt}/.claude/rules/a.md', load_reason: 'session_start' }, want: 0 },
        { label: 'a rule loaded in the main checkout', event: { hook_event_name: 'InstructionsLoaded', cwd: '{here}', file_path: '{here}/.claude/rules/a.md', load_reason: 'path_glob_match', globs: ['src/**'], trigger_file_path: '{here}/src/x.ts' }, want: 0 },
    ],
};
export function selftest() {
    const hookFile = fileURLToPath(import.meta.url);
    const dir = scratchProject({ '.claude/rules/split.md': '# r\n' });
    const lines = () => (readText(join(dir, RULES)) ?? '').split('\n').filter(Boolean);
    const send = (ev) => runHook(hookFile, dir, { session_id: 's1', cwd: dir, hook_event_name: 'InstructionsLoaded', ...ev }).status;
    const codes = [
        send({ file_path: join(dir, '.claude/rules/split.md'), load_reason: 'session_start' }),
        send({ file_path: join(dir, '.claude/rules/split.md'), load_reason: 'path_glob_match', globs: ['src/**'], trigger_file_path: join(dir, 'src/a.ts') }),
    ];
    const two = lines();
    send({ file_path: join(dir, 'CLAUDE.md'), load_reason: 'session_start' });
    send({ file_path: join(dir, '.claude/rules/split.md'), load_reason: 'session_start', hook_event_name: 'PostToolUse' });
    return verdicts('rule-log', [
        ['neither load is refused', codes.join(','), '0,0'],
        ['each load is a line', two.length, 2],
        ['a launch load says session_start', /"rule":"split","file":".claude\/rules\/split.md","why":"session_start"/.test(two[0] ?? '') ? 1 : 0, 1],
        ['a paths load says why, its globs and the file that triggered it', /"why":"path_glob_match","globs":\["src\/\*\*"\]/.test(two[1] ?? '') && /"trigger":".*src\/a.ts"/.test(two[1] ?? '') ? 1 : 0, 1],
        ['a CLAUDE.md and another event add nothing', lines().length, 2],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'rule-log', hook, selftest);
