// no-zsh-only (PreToolUse, Bash; 2.0.0): a zsh-only parameter expansion is refused before Claude Code's own safety check meets it. In
// supernova2_monitor (its WB-5) `C=(${(f)"$(git status ...)"})` could not be parsed by that check, which asked the user's approval even
// under skip-permissions: an unattended run, or one steered through a channel that cannot relay a prompt, stalls there until someone
// clicks. Refused: a `${` whose first character after the brace is a zsh flag group `(...)`, or one of `=`, `^`, `~` (word split, rc
// expansion, glob subst). `${VAR}`, `${#VAR}`, `${VAR:-x}` and `${VAR%x}` are POSIX and pass; quoted text and heredoc bodies are no commands.
// The refusal names the portable form: a list written out, or kept in a file and passed with --pathspec-from-file or xargs.
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { bashRig, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { dropHeredocs } from './lib/shell-lex.mts';
import type { Hook } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

// `${(f)x}`, `${(s:,:)x}`, `${=x}`, `${^x}`, `${~x}`: the zsh flags and the three one-character modifiers
const ZSH_ONLY = /\$\{(?:\([a-zA-Z@#%:,;!.'"0-9\- ]+\)|[=^~])/;
const singleQuoted = (text: string): string => text.replace(/'[^']*'/g, "''");

// an escaped dollar is a literal one wherever it stands: a note quoting the form it was refused for is no expansion (KWB-next)
const escapedDollars = (text: string): string => text.replace(/\\\$/g, '');

/** The zsh-only expansion a command uses, or null. Single-quoted text, heredoc bodies and escaped dollars are no commands. */
export function zshOnlyIn(command: string): string | null {
  const body = escapedDollars(singleQuoted(dropHeredocs(command)));
  return ZSH_ONLY.exec(body)?.[0] ?? null;
}

export function refusal(command: string): string | null {
  const found = zshOnlyIn(command);
  if (!found) return null;
  return `BLOCKED by no-zsh-only: \`${found}...}\` is a zsh-only expansion. Claude Code's safety check cannot parse it and stops for the ` +
    "user's approval, which an unattended run never gets (supernova2_monitor WB-5). Write the list out, or keep it in a file: " +
    '`git add --pathspec-from-file=<file>`, `xargs <cmd> < <file>`. A `$VAR` holding several words does not split in zsh either.\n';
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, { name: 'no-zsh-only', command: (command) => refusal(command) }, ctx);

/** A zsh-only expansion is refused in a worktree as in the main checkout. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a zsh flag expansion after a cd into the worktree', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && git add ${=FILES}' } }, want: 2 },
    { label: 'a POSIX expansion in the main checkout', event: { tool_name: 'Bash', tool_input: { command: 'cd {here} && echo ${HOME:-x}' } }, want: 0 },
  ],
};

export function selftest(): number {
  const { dir, before, sh } = bashRig(fileURLToPath(import.meta.url));
  return verdicts('no-zsh-only', [
    ['the command that stalled a build', sh('C=(${(f)"$(git status --short | cut -c4-)"}) && git add $C'), 2],
    ['a word split', sh('git add ${=P}'), 2],
    ['a split flag with its argument', sh('for x in ${(s:,:)LIST}; do echo $x; done'), 2],
    ['rc and glob expansion', sh('echo ${^ARR}.c ${~PAT}'), 2],
    ['a plain expansion', sh('echo ${HOME}/x'), 0],
    ['a length', sh('echo ${#PATH}'), 0],
    ['a default and a strip', sh('echo ${A:-x} ${B%.md}'), 0],
    ['the form in single quotes is no command', sh("echo 'never ${(f)x}'"), 0],
    ['nor in a heredoc body', sh("cat <<'EOF'\n${=P}\nEOF"), 0],
    ['an escaped dollar in double quotes is a literal, no expansion (KWB-next)', sh('npx x logs mark 1 right "used \\${=F}; staged from a file"'), 0],
    ['the form unescaped in double quotes still expands, and is refused', sh('echo "${=F}"'), 2],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'no-zsh-only', hook, selftest);
