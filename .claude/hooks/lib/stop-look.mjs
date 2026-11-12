// stop-look: the look git-guard takes at Stop, with the kept verdict first (stop-cache.mts) and GitHub given one second (W8.3).
// A look that cannot reach GitHub in that second comes back as the failure git-guard already tells ("GitHub was not checked at
// the end of this session"), and a refresh is started detached: it takes the look with the full time and keeps it, so the next
// Stop is answered from the cache. The same refresh runs after a commit or a push the hook saw, once the ref has moved.
//   stopLook(root, env, cfg, { lag, told, now, refresh }) -> StopLook
//   refreshStop(root, env, cfg, lag, waitMs) -> the look, taken after the refs changed (or waitMs) with the full time, and kept
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { localBranches } from './branches-ahead.mjs';
import { put, readText } from './files.mjs';
import { gitDirsOf, refsFingerprint } from './git-files.mjs';
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
/** Waits until a ref, a worktree or the config differs from what they are now (a commit or push has landed), or `waitMs` has passed. */
async function untilChanged(root, waitMs) {
    const dirs = gitDirsOf(root);
    if (!dirs)
        return;
    const before = refsFingerprint(dirs);
    const end = Date.now() + waitMs;
    while (Date.now() < end && refsFingerprint(dirs) === before)
        await sleep(200);
}
const REFRESH_LOCK = 'claude-packs-stop.refresh';
const REFRESH_SKIP_MS = 10_000;
/** Starts `self --refresh-stop <waitMs>` detached (a process of its own: the event never waits on it). One at a time: another
 *  started less than 10 s ago is enough, since it takes the look after the same ref change. */
export function refreshLater(self, root, env, waitMs, force = false) {
    try {
        const dirs = gitDirsOf(root);
        if (!dirs)
            return;
        const lock = join(dirs.common, REFRESH_LOCK);
        const last = Number(readText(lock)) || 0;
        if (!force && Date.now() - last < REFRESH_SKIP_MS)
            return; // a push always starts its own: it must look after the push
        put(lock, String(Date.now()));
        spawn(process.execPath, [self, '--refresh-stop', String(waitMs)], { cwd: root, detached: true, stdio: 'ignore', env: { ...env, CLAUDE_PROJECT_DIR: root } }).unref();
    }
    catch { /* the next Stop looks for itself */ }
}
const COMMIT_WAIT_MS = 30_000;
const PUSH_WAIT_MS = 5_000;
/** A command the hook let through that commits or pushes: the kept look is taken again, detached, once the ref has moved. A push
 *  by URL moves no local ref, so what was kept is dropped first. */
export function landedLater(self, command, root, env) {
    const did = /\bgit\b[^|;&\n]*?\b(push|commit)\b/.exec(blankQuotes(dropHeredocs(command)))?.[1];
    if (!did)
        return;
    if (did === 'push') {
        forget(root);
        pushSeen(root, env);
    }
    refreshLater(self, root, env, did === 'push' ? PUSH_WAIT_MS : COMMIT_WAIT_MS, did === 'push');
}
export async function refreshStop(root, env, cfg, lag, waitMs) {
    await untilChanged(root, waitMs);
    remoteHeads(root, env, 'origin', { ...cfg, live: true }); // keeps the heads the Pre Bash law reads offline up to date
    const slot = slotOf(root, cfg); // the key before the look: a ref that moves during it makes the next Stop look again
    const look = lookNow(root, env, cfg, lag, undefined);
    keep(slot, cfg, look, Date.now());
    return look;
}
