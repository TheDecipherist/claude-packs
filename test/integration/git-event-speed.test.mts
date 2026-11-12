// The budgets of the git-heavy Pre Bash calls (typescript order, session 2 "budgets"): in the kit's own install `git commit`, `git push`,
// `git merge` and `git add` took 1,201 to 2,082 ms in git-guard (a look at GitHub), 126 to 835 ms in kit-fresh (a merge-base for each remote
// work branch) and up to 187 ms in repo-litter (a `git ls-files` over the tree). This installs a scratch project that is the kit's own repo
// (its package.json names the kit) with a branch whose commit is pushed (its remote-tracking ref says so) while the kept look of GitHub is
// older, and an origin that accepts a connection and never answers: any call to the network waits out git's own 15 s. It drives the calls
// through the picker and holds each hook's wall.
import { createServer, type Server } from 'node:net';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { gitOut } from '../../packs/base/hooks/lib/git-run.mts';
import { git } from '../../packs/base/hooks/lib/selftest.mts';
import { readHookLog } from '../../packs/base/hooks/lib/hook-log.mts';
import { toJson } from '../../packs/base/hooks/lib/json.mts';
import { percentile } from '../../lib/hook-budget.mts';
import { hostTarget, shippedBinary } from '../../lib/proxy-binary.mts';
import { PACKS_DIR } from '../../lib/packs.mts';
import { withLayout } from '../fixtures/installs.mts';
import { stopDaemon } from '../fixtures/proxy-rig.mts';
import { fire, proxyRig } from './proxy-fire-rig.mts';
import { assert, test } from '../kit-cli.mts';

const target = hostTarget();
const skip = target !== null && existsSync(shippedBinary(join(PACKS_DIR, '..'), target)) ? false : 'no proxy binary is built here (Go is not on PATH)';

const bash = (cwd: string, command: string): string => toJson({ session_id: 's', cwd, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
const listening = (server: Server): Promise<number> => new Promise((done) => { server.listen(0, '127.0.0.1', () => done((server.address() as { port: number }).port)); });

test('git commit, git add and the other git calls never wait on the network or scan the tree: each hook p50 under 50 ms, worst under 500 ms', { skip, timeout: 300_000 }, async () => {
  const r = proxyRig('git-speed-cache-');
  const silent = createServer(() => { /* takes the connection and never answers */ });
  try {
    const port = await listening(silent);
    const url = `git://127.0.0.1:${port}/claude-packs.git`;
    const hub = scratchDir('git-speed-hub-');
    writeFileSync(join(r.project, 'package.json'), toJson({ name: '@thedecipherist/claude-packs', version: '2.0.0' }));
    withLayout(r.project, { guards: { git: { house: true, stopCacheMs: 0 } } });
    git(hub, 'init', '-q', '--bare');
    git(r.project, 'init', '-q', '-b', 'work/x');
    git(r.project, 'add', 'package.json', '.claude/layout.json');
    git(r.project, 'commit', '-q', '-m', 'first');
    git(r.project, 'remote', 'add', 'origin', hub);
    git(r.project, 'push', '-q', 'origin', 'work/x');          // the remote-tracking ref now holds the commit
    git(r.project, 'remote', 'set-url', 'origin', url);         // and GitHub is out of reach, with a kept look that lacks the commit
    const common = gitOut(['rev-parse', '--git-common-dir'], { cwd: r.project, env: process.env }) ?? '.git';
    writeFileSync(join(r.project, common, 'claude-packs-heads.json'), toJson({ [url]: { time: Date.now() - 3_600_000, heads: { 'work/x': '0'.repeat(40) } } }));
    writeFileSync(join(r.project, 'notes.txt'), 'x');
    for (let i = 0; i < 3; i += 1) assert.equal(fire(r, bash(r.project, "git commit -m 'next' -- notes.txt")), 0);
    for (let i = 0; i < 12; i += 1) assert.equal(fire(r, bash(r.project, 'git add notes.txt')), 0);
    for (const hook of ['git-guard', 'kit-fresh', 'repo-litter']) {
      const ms = readHookLog(r.project).filter((l) => l.hook === hook && l.event === 'PreToolUse' && l.tool === 'Bash').map((l) => l.ms);
      process.stdout.write(`# ${hook}: ${ms.length} calls, p50 ${percentile(ms, 50)} p95 ${percentile(ms, 95)} worst ${Math.max(...ms)} ms\n`);
      assert.ok(ms.length >= 15, `${hook} judged ${ms.length} calls`);
      assert.ok(percentile(ms, 50) < 50 && Math.max(...ms) < 500, `${hook}: p50 ${percentile(ms, 50)}, worst ${Math.max(...ms)} ms`);
    }
  } finally { stopDaemon(r); silent.close(); }
});
