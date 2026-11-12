// kit-fresh's reads of the repo with no process (commit-cost): the branch and origin/main from the git dir's files, and the refs
// HEAD does not contain (a walk of the whole history, 80 to 110 ms in the kit's repo) kept in the git dir under the key of every
// ref, worktree and config plus HEAD's commit: a commit, a fetch or a switch makes another key and the next call walks again once.
//   refsOf(root) -> { branch, mainKnown, missing(ask) } | null      null: not a checkout's own folder, the caller asks git
import { join } from 'node:path';
import { currentHead, gitDirsOf, refSha, refsFingerprint } from './git-files.mjs';
import { readJson, writeJson } from './json.mjs';
const FILE = 'claude-packs-kitfresh.json';
export function refsOf(root) {
    const dirs = gitDirsOf(root);
    if (!dirs)
        return null;
    const head = currentHead(dirs);
    const file = join(dirs.common, FILE);
    return {
        branch: head.branch ?? 'HEAD',
        get mainKnown() { return refSha(dirs, 'origin/main') !== null; },
        missing(ask) {
            const key = `${refsFingerprint(dirs)}:${head.sha ?? ''}:${dirs.gitDir}`;
            const kept = readJson(file);
            if (kept?.key === key)
                return kept.missing;
            const missing = ask();
            try {
                writeJson(file, { key, missing });
            }
            catch { /* asked again next time */ }
            return missing;
        },
    };
}
