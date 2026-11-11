// KWB-24: every installed hook writes one timing line per call to .claude/hooks.log (one helper per language), the log
// stays bounded, and doctor reads it: per hook the median and the worst of its last 100 calls, a median over 500 ms red.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isDisabled, readPack } from '../lib/packs.mjs';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const run = (dir, ...args) => spawnSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
const PACKS = ['base', 'audio-core', 'gpu-painter', 'stellix'];

function stellix() {
  const dir = mkdtempSync(join(tmpdir(), 'cpt-'));
  execFileSync('node', [CLI, 'init', 'audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix', '--dir', dir], { encoding: 'utf8' });
  for (const d of ['lib/app/src', 'lib/world/src']) mkdirSync(join(dir, d), { recursive: true });
  return dir;
}

// The hooks the packs register for an event and a tool (or a SessionStart source), async-rewake ones and the ones the
// project's layout switches off aside.
function expected(dir, event, target) {
  const layout = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
  const out = new Set();
  for (const p of PACKS) for (const g of readPack(p).hooks?.[event] ?? []) {
    if (g.matcher && g.matcher !== '*' && !new RegExp(`^(?:${g.matcher})$`).test(target)) continue;
    for (const h of g.hooks) {
      const [file, name] = h.command.match(/hooks\/(([\w-]+)\.(?:mjs|py))/).slice(1);
      if (!h.asyncRewake && !isDisabled(layout, `hooks/${file}`)) out.add(name);
    }
  }
  return [...out];
}

// Every settings entry of the event that matches, run the way Claude Code runs it.
function fireEvent(dir, payload) {
  const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
  const target = payload.tool_name ?? payload.source ?? '';
  for (const g of settings.hooks[payload.hook_event_name] ?? []) {
    if (g.matcher && g.matcher !== '*' && !new RegExp(`^(?:${g.matcher})$`).test(target)) continue;
    for (const h of g.hooks) {
      if (h.asyncRewake) continue;
      spawnSync('bash', ['-c', h.command], { input: JSON.stringify(payload), cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir, PYTHONDONTWRITEBYTECODE: '1' }, encoding: 'utf8' });
    }
  }
}

const logged = (dir) => (existsSync(join(dir, '.claude/hooks.log')) ? readFileSync(join(dir, '.claude/hooks.log'), 'utf8') : '')
  .split('\n').filter(Boolean).map((l) => l.split('\t'));

test('every installed hook writes one timing line per call: time, event, hook, ms, exit code', () => {
  const dir = stellix();
  const cases = [
    [{ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: join(dir, 'lib/world/src/a.h'), content: '// a\n' } }, 'Write'],
    [{ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm lib/world/src/none.h' } }, 'Bash'],
    [{ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(dir, 'lib/world/src/a.h'), old_string: 'a', new_string: 'b' } }, 'Edit'],
    [{ hook_event_name: 'Stop', session_id: 't', transcript_path: join(dir, 'none.jsonl') }, ''],
  ];
  for (const [payload, target] of cases) {
    const before = logged(dir).length;
    fireEvent(dir, payload);
    const rows = logged(dir).slice(before);
    for (const r of rows) {
      assert.equal(r.length >= 5, true, `a line has time, event, hook, ms, exit: ${r.join(' | ')}`);
      assert.ok(!Number.isNaN(Date.parse(r[0])), `ISO time: ${r[0]}`);
      assert.equal(r[1], payload.hook_event_name);
      assert.match(r[3], /^\d+$/);
      assert.match(r[4], /^-?\d+$/);
    }
    const names = new Set(rows.map((r) => r[2]));
    for (const h of expected(dir, payload.hook_event_name, target)) assert.ok(names.has(h), `${h} wrote no timing line on ${payload.hook_event_name} ${target}`);
  }
});

test('a full log rotates and nothing is lost', async () => {
  const { logHook, LOG_MAX_BYTES } = await import('../packs/base/hooks/lib/hook-log.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'cpt-log-'));
  mkdirSync(join(dir, '.claude'));
  const n = 60000;
  for (let i = 0; i < n; i += 1) logHook(dir, { event: 'PreToolUse', hook: `h${i % 17}`, ms: i % 900, code: 0 });
  assert.ok(statSync(join(dir, '.claude/hooks.log')).size <= LOG_MAX_BYTES);
  const rotated = readdirSync(join(dir, '.claude/logs')).filter((f) => /^hooks-.*\.log$/.test(f));
  assert.ok(rotated.length >= 1, 'a full log moved to .claude/logs');
  const lines = [...rotated.map((f) => join(dir, '.claude/logs', f)), join(dir, '.claude/hooks.log')].flatMap((f) => readFileSync(f, 'utf8').split('\n').filter(Boolean));
  assert.equal(lines.length, n, 'every line is kept');
});

test('browser-guard, ported from python, writes the same line through the hook tail', () => {
  const dir = stellix();
  const payload = { hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: join(dir, 'lib/world/src/b.h'), content: '// b\n' } };
  spawnSync('node', [join(dir, '.claude/hooks/browser-guard.mjs')], { input: JSON.stringify(payload), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  const row = logged(dir).find((r) => r[2] === 'browser-guard');
  assert.ok(row, 'browser-guard wrote a line');
  assert.deepEqual([row[1], row[4]], ['PreToolUse', '0']);
});

// The planted fault: a hook that sleeps 600 ms on every call makes doctor red; one that does not, does not.
test('doctor: a hook whose median is over 500 ms is a red check, with its median and worst', () => {
  const dir = stellix();
  const fake = (name, ms) => {
    const file = join(dir, '.claude/hooks', `${name}.mjs`);
    writeFileSync(file, `import { asHook, isMain } from './lib/hook-log.mjs';\nconst hook = () => { const t = Date.now(); while (Date.now() - t < ${ms}); return 0; };\n` +
      `if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? 0 : await asHook('${name}', hook));\n`);
    for (let i = 0; i < 3; i += 1) spawnSync('node', [file], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  };
  fake('slow-fake', 600);
  fake('quick-fake', 0);
  const r = run(dir, 'doctor');
  assert.match(r.stdout, /PROBLEM: slow-fake: median [0-9]+ ms over its last 3 calls \(worst [0-9]+ ms\), over 500 ms/);
  assert.doesNotMatch(r.stdout, /PROBLEM: quick-fake: median/);   // the fakes are in no settings entry, which doctor says too (0.18.0)
  assert.match(r.stdout, /hook timing/);
  assert.equal(r.status, 1);
});

// One node process per settings entry (KWB-24): every kit node hook of an entry is named in one run-hooks.mjs command, and
// each exports hook(text) for it; an async hook (idle-wake waits for minutes; heartbeat, 1.8.0, never holds a call) keeps
// its own entry, as throughRunner leaves it.
test('settings run the kit node hooks through run-hooks.mjs, and every such hook exports hook(text)', () => {
  const dir = stellix();
  const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
  const commands = Object.values(settings.hooks).flatMap((gs) => gs.flatMap((g) => g.hooks));
  const direct = commands.filter((h) => !h.async && !h.asyncRewake && /^node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/(?!run-hooks\.mjs)[\w-]+\.mjs"$/.test(h.command));
  assert.deepEqual(direct.map((h) => h.command), [], 'no kit node hook runs as its own process');
  const named = new Set(commands.filter((h) => h.command.includes('run-hooks.mjs')).flatMap((h) => [...h.command.matchAll(/\.claude\/hooks\/([\w-]+)\.mjs/g)].map((m) => m[1])).filter((n) => n !== 'run-hooks'));
  assert.ok(named.size >= 15, `${named.size} hooks through the runner`);
  for (const n of named) assert.match(readFileSync(join(dir, '.claude/hooks', `${n}.mjs`), 'utf8'), /^export (?:const|function) hook\b/m, `${n} exports hook`);
  for (const p of PACKS) for (const f of readdirSync(new URL(`../packs/${p}/hooks/`, import.meta.url)).filter((x) => x.endsWith('.mjs') && !['run-hooks.mjs', 'idle-wake.mjs'].includes(x))) {
    assert.match(readFileSync(new URL(`../packs/${p}/hooks/${f}`, import.meta.url), 'utf8'), /^export (?:const|function) hook\b/m, `${p}/${f} exports hook`);
  }
  assert.equal(spawnSync('node', [join(dir, '.claude/hooks/run-hooks.mjs'), '--selftest'], { encoding: 'utf8' }).status, 0, 'the runner\'s own selftest');
});
