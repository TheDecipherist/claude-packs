export const NEVER_DELETE = 'A branch is never deleted, renamed or left behind to get past this: push it.';
/** The owner an SSH GitHub URL names (git@github.com:Owner/repo.git, an ssh config alias git@github-<name>:Owner/..., or
 *  ssh://git@github.com/Owner/...), else null. */
export function sshOwner(url) {
    return (url ?? '').match(/^(?:ssh:\/\/)?git@github(?:\.com|-[\w.-]+)[:/]([\w.-]+)\/[\w.-]+?(?:\.git)?\/?$/)?.[1] ?? null;
}
export function pushCommand(url, branches, { owner, tokenVar = 'PERSONAL_GITHUB_TOKEN' } = {}) {
    const ssh = sshOwner(url);
    if (ssh && (!owner || ssh === owner))
        return `git push ${url} ${branches.join(' ')}`; // the key picks the account (KWB-88: no owner named)
    const m = (url ?? '').match(/github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?\/?$/);
    const repo = m ? `${m[1]}/${m[2]}` : `${owner ?? '<owner>'}/${(url ?? 'repo').split('/').pop()?.replace(/\.git$/, '') ?? 'repo'}`;
    return `source ~/.env && git push https://x-access-token:$${tokenVar}@github.com/${repo}.git ${branches.join(' ')}`;
}
export function unpushedMessage(u, cfg = {}) {
    const list = u.commits.slice(0, 8).map((c) => `    ${c.sha} ${c.subject}`).join('\n') + (u.commits.length > 8 ? `\n    ... ${u.commits.length - 8} more` : '');
    return `${u.branch} has ${u.commits.length} commit(s) that are not on GitHub (${u.url}):\n${list}\n` +
        `Every branch is pushed from its first commit (KWB-26): push, then commit:\n  ${pushCommand(u.url, [u.branch], cfg)}\n${NEVER_DELETE}`;
}
