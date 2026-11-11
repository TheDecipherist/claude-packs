// kit-fresh's selftest (KWB-156): a planted older lock, a planted newer branch and an offline case, each seen red against its
// clean twin; the kit's repo through the runner (a commit refused, then allowed once the work is merged). No case reaches the
// network: npm is a planted function or a kept answer, and origin is a bare repo in the scratch folder.
// A selftest module is left out of the repo lint's no-process gates (d-20): it is the one place that runs as a process.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scratchDir } from './files.mjs';
import { toJson } from './json.mjs';
import { atCommit, atStart, compareVersions, KIT, newestOnNpm } from './kit-fresh-look.mjs';
import { git, put, runHook, scratchProject, snapshot, verdicts, writtenSince } from './selftest.mjs';
const HOOK = fileURLToPath(new URL('../kit-fresh.mjs', import.meta.url));
const run = (dir, payload) => runHook(HOOK, dir, payload);
const lock = (kit) => ({ '.claude/claude-packs.lock.json': toJson({ kit }) });
const installed = (version) => ({ 'node_modules/@thedecipherist/claude-packs/package.json': toJson({ name: KIT, version }) });
const answer = (version) => () => ({ version });
const offline = () => ({ error: 'getaddrinfo ENOTFOUND registry.npmjs.org' });
const START = { env: process.env, now: Date.now() };
const COMMIT = 'git commit -m x -- a.mjs';
/** the kit's repo at `version` on main, with origin a bare repo holding main and `work/<newer>-x` one commit ahead */
function kitRepo(version, newer) {
    const hub = scratchDir('cp-kf-hub-');
    git(hub, 'init', '-q', '--bare');
    const dir = scratchProject({ 'package.json': toJson({ name: KIT, version }) });
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'add', 'package.json');
    git(dir, 'commit', '-qm', 'main');
    git(dir, 'remote', 'add', 'origin', hub);
    git(dir, 'push', '-q', 'origin', 'main');
    git(dir, 'switch', '-q', '-c', `work/${newer}-x`);
    put(join(dir, 'new.txt'), 'newer work\n');
    git(dir, 'add', 'new.txt');
    git(dir, 'commit', '-qm', 'newer');
    git(dir, 'push', '-q', 'origin', `work/${newer}-x`);
    git(dir, 'switch', '-q', 'main');
    return dir;
}
export function selftest() {
    const cases = [];
    const say = (v) => v?.say ?? '';
    // 1. a planted older lock: said, with the update command; blocks only with nobody there; its twin (the newest) says nothing
    const old = scratchProject(lock('1.5.13'));
    const oldSays = atStart(old, { ...START, npm: answer('1.9.0'), unattended: false });
    cases.push(['an older lock is said with the update command', /1\.5\.13.*npm has 1\.9\.0.*npx --no-install @thedecipherist\/claude-packs update/.test(say(oldSays)), true]);
    cases.push(['an older lock does not block with someone there', oldSays?.block ?? null, false]);
    cases.push(['an older lock blocks a run with nobody there', atStart(old, { ...START, npm: answer('1.9.0'), unattended: true })?.block ?? null, true]);
    cases.push(['the newest lock says nothing', say(atStart(scratchProject(lock('1.9.0')), { ...START, npm: answer('1.9.0'), unattended: true })), '']);
    cases.push(['a lock newer than npm (a tarball before its release) says nothing', say(atStart(scratchProject(lock('1.9.1')), { ...START, npm: answer('1.9.0') })), '']);
    // CLAUDE_PACKS_UNATTENDED has one meaning, agents-held's: 1 nobody there, 0 someone there, unset or anything else not said (KWB-185)
    const blocksWith = (said) => atStart(old, { env: said === undefined ? {} : { CLAUDE_PACKS_UNATTENDED: said }, now: START.now, npm: answer('1.9.0') })?.block ?? null;
    cases.push(['CLAUDE_PACKS_UNATTENDED=1 blocks an outdated project', blocksWith('1'), true]);
    cases.push(['CLAUDE_PACKS_UNATTENDED=0 says someone is there: no block (KWB-185)', blocksWith('0'), false]);
    cases.push(['CLAUDE_PACKS_UNATTENDED unset does not block', blocksWith(undefined), false]);
    // the installed package is what runs, the lock only its note (KWB-162): a stale lock beside a current package is up to date
    const packed = scratchProject({ ...lock('1.0.0'), ...installed('1.9.0') });
    cases.push(['the installed package wins over a stale lock', say(atStart(packed, { ...START, npm: answer('1.9.0'), unattended: true })), '']);
    const behind = atStart(scratchProject(installed('1.8.0')), { ...START, npm: answer('1.9.0') });
    cases.push(['an installed package older than npm is said', /runs the kit 1\.8\.0/.test(say(behind)), true]);
    // 2. offline: what could not be checked is said; never a block, even with nobody there
    const off = atStart(old, { ...START, npm: offline, unattended: true });
    cases.push(['offline is said as not checked', /could not check.*ENOTFOUND/.test(say(off)), true]);
    cases.push(['offline never blocks', off?.block ?? null, false]);
    // the day's answer is kept: a second ask within the day is not made, a day later it is
    const cache = scratchDir('cp-kf-cache-');
    let asked = 0;
    const ask = () => { asked += 1; return { version: '2.0.0' }; };
    newestOnNpm({ now: 0, dir: cache, ask });
    newestOnNpm({ now: 1000, dir: cache, ask });
    cases.push(['npm is asked at most once a day', asked, 1]);
    newestOnNpm({ now: 25 * 3600 * 1000, dir: cache, ask });
    cases.push(['npm is asked again the next day', asked, 2]);
    cases.push(['versions compare by number, not as text', compareVersions('1.10.0', '1.9.0') > 0, true]);
    // 3. a planted newer branch in the kit's repo: named, and a commit refused until it is merged; its twin (merged) allows it
    const kit = kitRepo('1.5.13', '1.9.0');
    cases.push(['newer work in the kit is named', /lacks newer work: origin\/work\/1\.9\.0-x/.test(say(atStart(kit, START))), true]);
    cases.push(['a commit in the kit with newer work is refused', Boolean(atCommit(kit, COMMIT, { env: process.env })), true]);
    cases.push(['a command that is no commit is not judged', atCommit(kit, 'git status', { env: process.env }), null]);
    const kitBefore = snapshot(kit); // the project's files as the judge finds them (its fetch moves only .git)
    cases.push(['through the runner, the commit is refused', run(kit, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: COMMIT }, cwd: kit }).status, 2]);
    cases.push(['through the runner, the session start names it', /work\/1\.9\.0-x/.test(run(kit, { hook_event_name: 'SessionStart', cwd: kit }).stdout), true]);
    cases.push(['a judge writes no file of the project (the write trap)', writtenSince(kit, kitBefore).filter((f) => !f.startsWith('.git/')).join(','), '']);
    git(kit, 'merge', '-q', '--ff-only', 'origin/work/1.9.0-x');
    cases.push(['merged, the commit is allowed', atCommit(kit, COMMIT, { env: process.env }), null]);
    // 4. the kit's repo with origin unreachable: said, not blocked
    const lost = kitRepo('1.9.0', '1.8.0');
    git(lost, 'remote', 'set-url', 'origin', join(lost, 'no-such-remote'));
    const lostSays = atStart(lost, START);
    cases.push(['an unreachable origin is said as not checked', /could not fetch origin/.test(say(lostSays)), true]);
    cases.push(['an unreachable origin blocks nothing', Boolean(atCommit(lost, COMMIT, { env: process.env })), false]);
    return verdicts('kit-fresh', cases);
}
