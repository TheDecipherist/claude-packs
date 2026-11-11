// pushed: what a repo holds that GitHub does not (KWB-26: eight kit branches lived on one machine only, and nothing said so).
// git-guard reads it twice: before a `git commit` (the branch's earlier commits must be on GitHub; the first commit of a new
// branch passes, the next waits for its push) and at Stop (no local branch may be ahead of GitHub or missing there).
// With guards.git.pushNeedsYes neither waits: Stop tells the owner what GitHub lacks (KWB-157).
// GitHub out of reach (offline, no token): the caller lets the work through and says so.
// The importers' one name for the laws, split by what each part does (W3: the file passed the line limit once typed):
//   remote-heads.mts    what GitHub holds: ls-remote, the kept look, the token, `withHeads`
//   push-form.mts       the push a refusal offers: `sshOwner`, `pushCommand`, `unpushedMessage`
//   branches-ahead.mts  which branches hold commits GitHub lacks: `forRepo`, `unpushed`, `localBranches`, `ownerPushes`
//   stop-verdict.mts    what git-guard says at Stop: `stopVerdict`
// Every function takes the folder and the environment of the event it judges (`cwd, env, ...`), never this process's own.
export { forRepo, localBranches, othersBranches, ownerPushes, unpushed } from './branches-ahead.mts';
export { pushCommand, sshOwner, unpushedMessage } from './push-form.mts';
export { remoteHeads, withHeads } from './remote-heads.mts';
export { MAX_SENDS, stopVerdict } from './stop-verdict.mts';
