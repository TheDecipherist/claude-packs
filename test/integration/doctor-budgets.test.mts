// W8.4, through the real doctor on an install: the sleeping plant is red and named at its event, a full pool is named instead of a hook,
// a daemon of an older lock is said with both hashes, and only init, add and update fetch a team's custom packs.
import { createHash } from 'node:crypto';
import { assert, cli, join, mkdirSync, spawnSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture, lockOf } from '../fixtures/installs.mts';
import { logHook } from '../../packs/base/hooks/lib/hook-log.mts';
import { TABLE_FILE, readHookTable } from '../../packs/base/hooks/lib/hook-table.mts';
import { writeJson } from '../../packs/base/hooks/lib/json.mts';
import { real } from '../../packs/base/hooks/lib/project.mts';
import { cacheFolder } from '../../packs/base/hooks/lib/proxy-wire.mts';
import { homedir } from 'node:os';

// A hook that sleeps `ms` on every call, run as its own process through the hook tail, so its timing line is the one a real hook writes.
function plant(dir: string, name: string, ms: number, calls: number): void {
  const file = join(dir, '.claude/hooks', `${name}.mjs`);
  writeFileSync(file, `import { asHook, isMain } from './lib/hook-log.mjs';\nconst hook = () => { const t = Date.now(); while (Date.now() - t < ${ms}); return 0; };\n` +
    `if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? 0 : await asHook('${name}', hook));\n`);
  for (let i = 0; i < calls; i += 1) spawnSync('node', [file], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
}

// The runner's table names the hooks whose timing lines are the hook's own work; a planted hook the budget is to judge goes in it.
function inTable(dir: string, hook: string, tool: string): void {
  const file = join(dir, '.claude/hooks', TABLE_FILE);
  writeJson(file, [...(readHookTable(join(dir, '.claude/hooks')) ?? []), { hook, events: ['PreToolUse'], matcher: tool, role: 'judge', order: 99 }]);
}

// A loaded machine stretches the p95 and the worst of a 300 ms sleep past 399; the sleep itself is the floor.
test('doctor is red on a hook that sleeps 300 ms at one event, and names the hook and the event', () => {
  const dir = fixture('base');
  plant(dir, 'sleeper', 300, 6);
  plant(dir, 'quick-fake', 0, 6);
  inTable(dir, 'sleeper', 'Bash');   // quick-fake runs as its own process (node's start in its line) and is no table hook: not judged here
  const r = cli(dir, 'doctor');
  assert.match(r.stdout, /PROBLEM: sleeper at Pre Bash: 3\d\d\/(?:[3-9]\d\d|\d{4,}) ms \(p50\/p95, worst (?:[3-9]\d\d|\d{4,})\) over its last 6 calls, over its budget of 10\/50 ms and worst 200/);
  assert.doesNotMatch(r.stdout, /PROBLEM: quick-fake at/);
  assert.match(r.stdout, /event budgets \(wall p50\/p95 ms/);
  assert.equal(r.status, 1);
});

test('doctor names a full pool, not a hook: a daemon\'s events that waited for a worker', () => {
  const dir = fixture('base');
  inTable(dir, 'busy-fake', 'Write');
  for (let i = 0; i < 10; i += 1) {
    logHook(dir, { event: 'PreToolUse', tool: 'Write', hook: 'busy-fake', ms: 280, code: 0 });
    logHook(dir, { event: 'PreToolUse', tool: 'Write', hook: 'event', ms: 300, code: 0, queue: 120, source: 'daemon' });
  }
  const r = cli(dir, 'doctor');
  assert.match(r.stdout, /PROBLEM: the resident runner's pool is full at Pre Write: its events waited for a worker 120 ms at p95/);
  assert.doesNotMatch(r.stdout, /PROBLEM: busy-fake/);
  assert.equal(r.status, 1);
});

test('doctor says the running daemon\'s hash when it is not the lock\'s, naming both', () => {
  const dir = fixture('base');
  const cache = cacheFolder(process.env, homedir(), process.platform);
  mkdirSync(cache, { recursive: true, mode: 0o700 });
  const file = join(cache, `budget-${createHash('sha1').update(dir).digest('hex').slice(0, 8)}.pid`);
  writeJson(file, { pid: process.pid, key: 'budget', project: real(dir), hooks: '/h', node: 'n', lockHash: 'oldoldoldoldold0', started: Date.now(), lastEvent: 0, events: 0, workers: 1, rss: 1, heap: 1 });
  try {
    const r = cli(dir, 'doctor');
    assert.match(r.stdout, new RegExp(`note: the resident runner running now \\(pid ${process.pid}\\) has kit hash oldoldoldoldold0, the project's lock is [0-9a-f]{16}`));
    assert.equal(r.status, 0, r.stdout);
  } finally { spawnSync('rm', ['-f', file]); }
});

test('only init, add and update fetch custom packs: doctor on a project whose lock names an unreachable one is not stopped by it', () => {
  const dir = fixture('base');
  writeJson(join(dir, '.claude/claude-packs.lock.json'), { ...lockOf(dir), sources: { acme: { url: '/nonexistent/acme-packs.git', commit: 'abc' } } });
  for (const command of ['doctor', 'logs', 'status']) assert.doesNotMatch(cli(dir, command).stdout + cli(dir, command).stderr, /could not be fetched/, command);
  const update = cli(dir, 'update');
  assert.notEqual(update.status, 0);
  assert.match(update.stdout + update.stderr, /custom pack acme could not be fetched from \/nonexistent\/acme-packs\.git/);
});
