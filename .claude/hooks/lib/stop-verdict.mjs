// stop-verdict: what git-guard says at Stop (KWB-26): refused, a local branch not on GitHub, and the main checkout's trunk a
// landing left behind (`lag`, trunk-lag.mts, KWB-96). What could not be judged, or cannot be fixed by the session, goes to the
// user as a message. Three refusals with the same list end the session, the list going to the user. With guards.git.pushNeedsYes
// no branch is refused: what GitHub lacks is told once a session, by the cached look unless it would tell something new
// (KWB-157). The state of a session (the last list, how often it was sent) is kept in `stateDir`, the caller's TMPDIR.
//   stopVerdict(root, env, cfg, session, { lag, stateDir }) -> { code, stdout?, stderr? }
import { join } from 'node:path';
import { localBranches } from './branches-ahead.mjs';
import { readJson, toJson, writeJson } from './json.mjs';
import { NEVER_DELETE, pushCommand } from './push-form.mjs';
import { failed } from './remote-heads.mjs';
export const MAX_SENDS = 3;
/** What lives on this machine only, left for the owner to push (guards.git.pushNeedsYes, KWB-157). */
const hereOnly = (found) => `git-guard: ${found.length} local branch(es) hold commits that no GitHub branch has, left for you to push (guards.git.pushNeedsYes):\n` +
    found.map((f) => `    ${f.branch}: ${f.ahead} commit(s)${f.missing ? ', the branch not on GitHub' : ''}`).join('\n');
export function stopVerdict(root, env, cfg = {}, session = 'session', { lag = () => null, stateDir = env['TMPDIR'] ?? '/tmp' } = {}) {
    const file = join(stateDir, `git-guard-stop-${String(session).replace(/[^\w-]/g, '')}.json`);
    const st = readJson(file, {}) ?? {};
    const owner = !!cfg.pushNeedsYes;
    let found = localBranches(root, env, owner ? { ...cfg, cachedOnly: true } : cfg);
    if (owner && Array.isArray(found) && found.length && hereOnly(found) !== st.told)
        found = localBranches(root, env, cfg); // looked up live before telling
    const behind = lag(root, env, cfg);
    const list = Array.isArray(found) ? found : [];
    const notes = [];
    if (failed(found))
        notes.push(`git-guard: GitHub was not checked at the end of this session: ${found.error}. Check by hand that every branch is pushed (KWB-26).`);
    if (behind?.error)
        notes.push(`git-guard: the main checkout's trunk was not compared with the remote's: ${behind.error} (KWB-96).`);
    if (behind?.warn)
        notes.push(`git-guard: ${behind.warn}`);
    const tell = owner && list.length ? hereOnly(list) : undefined;
    if (tell && tell !== st.told)
        notes.push(tell);
    const parts = [];
    if (!owner && list.length) {
        const byUrl = new Map();
        for (const f of list)
            byUrl.set(f.url, [...(byUrl.get(f.url) ?? []), f.branch]);
        parts.push(`${list.length} local branch(es) are not on GitHub:\n` +
            list.map((f) => `    ${f.branch}: ${f.missing ? 'not on GitHub at all' : `${f.ahead} commit(s) ahead of GitHub`}`).join('\n') +
            `\nPush them before the session ends (KWB-26):\n${[...byUrl].map(([url, b]) => `  ${pushCommand(url, b, cfg)}`).join('\n')}\n${NEVER_DELETE}`);
    }
    if (behind?.refuse)
        parts.push(behind.refuse);
    const said = notes.length ? toJson({ systemMessage: notes.join('\n') }) : undefined;
    if (!parts.length) {
        writeJson(file, { told: tell });
        return said === undefined ? { code: 0 } : { code: 0, stdout: said };
    }
    const text = parts.join('\n');
    const count = st.text === text ? (st.count ?? 0) + 1 : 1;
    writeJson(file, { text, count, told: tell });
    if (count > MAX_SENDS)
        return { code: 0, stdout: toJson({ systemMessage: [`git-guard refused the end of this session ${MAX_SENDS} times; it ends here for you to decide.\n${text}`, ...notes].join('\n') }) };
    return { code: 2, stderr: `git-guard: ${[text, ...notes].join('\n')}\n` };
}
