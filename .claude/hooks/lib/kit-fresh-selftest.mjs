// kit-fresh's selftest (KWB-156): a planted older lock, a planted newer branch and an offline case, each seen red against its
// clean twin; the kit's repo through the runner (a commit refused, then allowed once the work is merged). No case reaches the
// network: npm is a planted function or a kept answer, and origin is a bare repo in the scratch folder.
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toJson } from './json.mjs';
import { atCommit, atStart, compareVersions, KIT, newestOnNpm } from './kit-fresh-look.mjs';
import { git, put, scratchProject, verdicts } from './selftest.mjs';

const HOOK = fileURLToPath(new URL('../kit-fresh.mjs', import.meta.url));
const RUNNER = fileURLToPath(new URL('../run-hooks.mjs', import.meta.url));
const run = (dir, payload, env = {}) => spawnSync(process.execPath, [RUNNER, HOOK], {
  cwd: dir, input: toJson(payload), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir, ...env },
});
const lock = (kit) => ({ '.claude/claude-packs.lock.json': toJson({ kit }) });
const answer = (version) => () => ({ version });
const offline = () => ({ error: 'getaddrinfo ENOTFOUND registry.npmjs.org' });

/** the kit's repo at `version` on main, with origin a bare repo holding main and `work/<newer>-x` one commit ahead */
function kitRepo(version, newer) {
  const hub = mkdtempSync(join(tmpdir(), 'cp-kf-hub-'));
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
  const oldSays = atStart(old, { npm: answer('1.9.0'), unattended: false });
  cases.push(['an older lock is said with the update command', /1\.5\.13.*npm has 1\.9\.0.*npx --no-install @thedecipherist\/claude-packs update/.test(say(oldSays)), true]);
  cases.push(['an older lock does not block with someone there', oldSays?.block, false]);
  cases.push(['an older lock blocks a run with nobody there', atStart(old, { npm: answer('1.9.0'), unattended: true })?.block, true]);
  cases.push(['the newest lock says nothing', atStart(scratchProject(lock('1.9.0')), { npm: answer('1.9.0'), unattended: true }), null]);
  cases.push(['a lock newer than npm (a tarball before its release) says nothing', atStart(scratchProject(lock('1.9.1')), { npm: answer('1.9.0') }), null]);

  // the installed package is what runs, the lock only its note (KWB-162): a stale lock beside a current package is up to date
  const packed = scratchProject({ ...lock('1.0.0'), 'node_modules/@thedecipherist/claude-packs/package.json': toJson({ name: KIT, version: '1.9.0' }) });
  cases.push(['the installed package wins over a stale lock', atStart(packed, { npm: answer('1.9.0'), unattended: true }), null]);
  cases.push(['an installed package older than npm is said', /runs the kit 1\.8\.0/.test(say(atStart(scratchProject({ 'node_modules/@thedecipherist/claude-packs/package.json': toJson({ name: KIT, version: '1.8.0' }) }), { npm: answer('1.9.0') }))), true]);

  // 2. offline: what could not be checked is said; never a block, even with nobody there
  const off = atStart(old, { npm: offline, unattended: true });
  cases.push(['offline is said as not checked', /could not check.*ENOTFOUND/.test(say(off)), true]);
  cases.push(['offline never blocks', off?.block, false]);

  // the day's answer is kept: a second ask within the day is not made, a day later it is
  const cache = mkdtempSync(join(tmpdir(), 'cp-kf-cache-'));
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
  cases.push(['newer work in the kit is named', /lacks newer work: origin\/work\/1\.9\.0-x/.test(say(atStart(kit))), true]);
  cases.push(['a commit in the kit with newer work is refused', Boolean(atCommit(kit, 'git commit -m x -- a.mjs')), true]);
  cases.push(['a command that is no commit is not judged', atCommit(kit, 'git status'), null]);
  cases.push(['through the runner, the commit is refused', run(kit, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit -m x -- a.mjs' }, cwd: kit }).status, 2]);
  cases.push(['through the runner, the session start names it', /work\/1\.9\.0-x/.test(run(kit, { hook_event_name: 'SessionStart', cwd: kit }).stdout), true]);
  git(kit, 'merge', '-q', '--ff-only', 'origin/work/1.9.0-x');
  cases.push(['merged, the commit is allowed', atCommit(kit, 'git commit -m x -- a.mjs'), null]);

  // 4. the kit's repo with origin unreachable: said, not blocked
  const lost = kitRepo('1.9.0', '1.8.0');
  git(lost, 'remote', 'set-url', 'origin', join(lost, 'no-such-remote'));
  const lostSays = atStart(lost);
  cases.push(['an unreachable origin is said as not checked', /could not fetch origin/.test(say(lostSays)), true]);
  cases.push(['an unreachable origin blocks nothing', Boolean(atCommit(lost, 'git commit -m x -- a.mjs')), false]);

  return verdicts('kit-fresh', cases);
}
