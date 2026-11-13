// stop-look: the look git-guard takes at Stop, with the kept verdict first (stop-cache.mts) and GitHub given one second (W8.3).
// A look that cannot reach GitHub in that second comes back as the failure git-guard already tells ("GitHub was not checked at
// the end of this session"), and a refresh is started detached: it takes the look with the full time and keeps it, so the next
// Stop is answered from the cache. The same refresh runs after a commit or a push the hook saw, once the ref has moved.
//   stopLook(root, env, cfg, { lag, told, now, refresh }) -> StopLook
//   refreshStop(root, env, cfg, lag, waitMs) -> the look, taken after the refs changed (or waitMs) with the full time, and kept
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { localBranches } from './branches-ahead.mjs';
import { startOrphan, underDaemon } from './child-group.mjs';
import { put, readText } from './files.mjs';
import { gitDirsOf, refsFingerprint, trackedRefs } from './git-files.mjs';
import { keepKitRefs } from './kit-fresh-look.mjs';
import { failed, pushSeen, remoteHeads } from './remote-heads.mjs';
import { blankQuotes, dropHeredocs } from './shell-lex.mjs';
import { forget, hitFor, keep, slotOf } from './stop-cache.mjs';
/** How long the end of a session waits on GitHub. */
export const STOP_LIVE_MS = 1000;
/** What lives on this machine only, left for the owner to push (guards.git.pushNeedsYes, KWB-157). */
export const hereOnly = (found) => `git-guard: ${found.length} local branch(es) hold commits that no GitHub branch has, left for you to push (guards.git.pushNeedsYes):\n` +
    found.map((f) => `    ${f.branch}: ${f.ahead} commit(s)${f.missing ? ', the branch not on GitHub' : ''}`).join('\n');
/** The look itself. With pushNeedsYes the last look of the heads serves unless it would tell something new (`told`). */
function lookNow(root, env, cfg, lag, told) {
    const owner = !!cfg.pushNeedsYes;
    let found = localBranches(root, env, owner ? { ...cfg, cachedOnly: true } : cfg);
    if (owner && Array.isArray(found) && found.length && hereOnly(found) !== told)
        found = localBranches(root, env, cfg); // looked up live before telling
    return { found, behind: lag(root, env, cfg) };
}
export function stopLook(root, env, cfg, { lag, told, now, refresh }) {
    const slot = slotOf(root, cfg);
    const kept = hitFor(slot, cfg, now);
    if (kept)
        return kept;
    const look = lookNow(root, env, { ...cfg, until: now + (cfg.stopLiveMs ?? STOP_LIVE_MS) }, lag, told);
    keep(slot, cfg, look, now);
    if (failed(look.found) || look.behind?.error)
        refresh?.();
    return look;
}
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
/** What the refresh waits to see change: every ref and the config; for a command that pushes, the remote's tracking refs alone (a commit before the
 *  push moves the others at once, and the look must be taken after the push, not between the two). */
const watched = (dirs, push) => (push ? [...trackedRefs(dirs, 'origin')].map(([ref, sha]) => `${ref} ${sha}`).sort().join('\n') : refsFingerprint(dirs));
/** Waits until what is watched differs from what it is now (a commit or push has landed), or `waitMs` has passed. */
async function untilChanged(root, waitMs, push) {
    const dirs = gitDirsOf(root);
    if (!dirs)
        return;
    const before = watched(dirs, push);
    const end = Date.now() + waitMs;
    while (Date.now() < end && watched(dirs, push) === before)
        await sleep(200);
}
const REFRESH_LOCK = 'claude-packs-stop.refresh';
const REFRESH_SKIP_MS = 10_000;
/** Starts `self --refresh-stop <waitMs>` detached (a process of its own: the event never waits on it). One at a time: another
 *  started less than 10 s ago is enough, since it takes the look after the same ref change. */
export function refreshLater(self, root, env, waitMs, force = false, push = false) {
    try {
        const dirs = gitDirsOf(root);
        if (!dirs)
            return;
        const lock = join(dirs.common, REFRESH_LOCK);
        const last = Number(readText(lock)) || 0;
        if (!force && Date.now() - last < REFRESH_SKIP_MS)
            return; // a push always starts its own: it must look after the push
        put(lock, String(Date.now()));
        // under the daemon the child is one of the worker's groups, so the daemon's stop ends it, and init is its parent, so nothing of the daemon is left to collect it; from the per-hook runner it is on its own (the runner exits at once)
        const start = underDaemon() ? startOrphan : spawn;
        start(process.execPath, [self, '--refresh-stop', String(waitMs), ...(push ? ['--push'] : [])], { cwd: root, detached: true, stdio: 'ignore', env: { ...env, CLAUDE_PROJECT_DIR: root } }).unref();
    }
    catch { /* the next Stop looks for itself */ }
}
const COMMIT_WAIT_MS = 30_000;
const PUSH_WAIT_MS = 5_000;
/** A command the hook let through that commits or pushes (either, or both: `git commit && git push`): the kept looks are taken again, detached,
 *  once the refs have moved. A push by URL moves no local ref, so what was kept is dropped first. */
export function landedLater(self, command, root, env) {
    const body = blankQuotes(dropHeredocs(command));
    const push = /\bgit\b[^|;&\n]*?\bpush\b/.test(body);
    if (!push && !/\bgit\b[^|;&\n]*?\bcommit\b/.test(body))
        return;
    if (push) {
        forget(root);
        pushSeen(root, env);
    }
    refreshLater(self, root, env, push && !/\bcommit\b/.test(body) ? PUSH_WAIT_MS : COMMIT_WAIT_MS, push, push);
}
const SETTLE_ROUNDS = 3;
/** The refresh itself: waits for the change, then takes every look the next commit's Pre would otherwise take on its own clock (GitHub's heads, the
 *  Stop look, the kit's kept list of newer work), and again when a ref moved while it looked (the push of `commit && push` lands in the middle). */
export async function refreshStop(root, env, cfg, lag, waitMs, push = false) {
    await untilChanged(root, waitMs, push);
    const dirs = gitDirsOf(root);
    let look = { found: null, behind: null };
    for (let round = 0; round < SETTLE_ROUNDS; round += 1) {
        const before = dirs ? refsFingerprint(dirs) : '';
        remoteHeads(root, env, 'origin', { ...cfg, live: true }); // keeps the heads the Pre Bash law reads offline up to date
        keepKitRefs(root, env);
        const slot = slotOf(root, cfg); // the key before the look: a ref that moves during it makes the next Stop look again
        look = lookNow(root, env, cfg, lag, undefined);
        keep(slot, cfg, look, Date.now());
        if (!dirs || refsFingerprint(dirs) === before)
            break;
    }
    return look;
}
