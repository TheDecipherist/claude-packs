// git-guard's selftest for the kept Stop verdict (W8.3), on a real repo whose "GitHub" is a bare repo beside it. Each case is a
// plant that must be seen red without the part it names: a Stop that serves its kept look when a commit has changed a ref (the
// key), one that needs the network while nothing changed (the cache), one that waits on a slow GitHub past its second (the cap),
// one that never warms the cache for the next Stop (the detached refresh), one that keeps a look across a push it saw (forget).
// A selftest module is left out of the repo lint's no-process gates (d-20): it runs as a process.
import { chmodSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { put } from './files.mjs';
import { hubRepo } from './hub-rig.mjs';
import { toJson } from './json.mjs';
const sleep = (s) => { spawnSync('sleep', [String(s)]); };
/** A GIT_EXEC_PATH folder whose git-upload-pack answers after `seconds`: a GitHub that is slow. */
function slowGitHub(root, seconds) {
    const real = spawnSync('git', ['--exec-path'], { encoding: 'utf8' }).stdout.trim();
    const shim = join(root, 'slow-exec');
    mkdirSync(shim);
    for (const f of readdirSync(real))
        if (f !== 'git-upload-pack')
            symlinkSync(join(real, f), join(shim, f));
    writeFileSync(join(shim, 'git-upload-pack'), `#!/bin/sh\nsleep ${seconds}\nexec "${real}/git-upload-pack" "$@"\n`);
    chmodSync(join(shim, 'git-upload-pack'), 0o755);
    return shim;
}
export function stopCacheCases(hookFile) {
    const { top, dir, hub, commit, push, run: runAt } = hubRepo('git-guard-stopcache-');
    const stop = () => runAt(hookFile, { hook_event_name: 'Stop', stop_hook_active: false });
    const kept = join(dir, '.git', 'claude-packs-stop.json');
    const cases = [];
    commit('first');
    push('main');
    cases.push(['everything pushed: Stop passes', stop().status, 0]);
    cases.push(['and the look is kept in the git dir', existsSync(kept), true]);
    renameSync(hub, `${hub}.away`);
    const quiet = stop();
    renameSync(`${hub}.away`, hub);
    cases.push(['no ref changed: the kept look answers, with GitHub out of reach and no note of it', quiet.status === 0 && !/not checked|could not be reached/.test(quiet.stdout), true]);
    commit('two');
    const fresh = stop();
    cases.push(['a new commit changes a ref: the kept look is not served, the commit GitHub lacks is refused (the plant)', fresh.status, 2]);
    cases.push(['and the refusal names the branch', /main/.test(fresh.stderr), true]);
    push('main');
    cases.push(['pushed: Stop passes again, from a fresh look', stop().status, 0]);
    cases.push(['a look kept, the same Stop twice: the second is the kept one', existsSync(kept), true]);
    // a slow GitHub: one second, the existing note, and the look kept for the next Stop by a detached refresh
    commit('three');
    rmSync(kept, { force: true }); // the clean look of before: what is kept after this is the refresh's
    put(join(dir, '.claude/layout.json'), toJson({ folders: {}, guards: { git: { house: true } } })); // from here a Stop gives GitHub the default second
    const was = process.env['GIT_EXEC_PATH'];
    process.env['GIT_EXEC_PATH'] = slowGitHub(top, 3);
    const t0 = Date.now();
    const slow = stop();
    const wall = Date.now() - t0;
    cases.push(['GitHub answers in 3 s: Stop goes ahead, with the "not checked" note', slow.status === 0 && /GitHub was not checked/.test(slow.stdout), true]);
    cases.push(['within about a second of GitHub, never its 3 s (the cap)', wall < 2500, true]);
    for (let i = 0; i < 40 && !existsSync(kept); i++)
        sleep(0.25);
    cases.push(['the detached refresh took the look and kept it for the next Stop', existsSync(kept), true]);
    const t1 = Date.now();
    const warm = stop();
    const quick = Date.now() - t1;
    if (was === undefined)
        delete process.env['GIT_EXEC_PATH'];
    else
        process.env['GIT_EXEC_PATH'] = was;
    cases.push(['the next Stop is answered from it, whole: the commit GitHub lacks is refused', warm.status, 2]);
    cases.push(['and without waiting on the slow GitHub', quick < 1500, true]);
    const sawPush = runAt(hookFile, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git push origin main' } });
    cases.push(['a push the hook saw passes its laws', sawPush.status, 0]);
    cases.push(['and drops the kept look (a push by URL moves no ref)', existsSync(kept), false]);
    rmSync(top, { recursive: true, force: true });
    return cases;
}
