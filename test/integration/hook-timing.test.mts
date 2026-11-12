// KWB-24: every installed hook writes one timing line per call to .claude/hooks.log (one helper per language), the log
// stays bounded, and doctor reads it: per hook the median and the worst of its last 100 calls, a median over 500 ms red.
import { KIT, assert, cli, existsSync, fresh, join, mkdirSync, readFileSync, readdirSync, spawnSync, statSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { isDisabled, readPack } from '../../lib/packs.mts';
import { LOG_MAX_BYTES, logHook } from '../../packs/base/hooks/lib/hook-log.mts';
import { parseJson } from '../../packs/base/hooks/lib/json.mts';

const PACKS = ['base', 'audio-core', 'gpu-painter', 'stellix'];

interface HookCommand { command: string; asyncRewake?: boolean; async?: boolean }
interface HookGroup { matcher?: string; hooks: HookCommand[] }
type Hooks = Record<string, HookGroup[]>;
interface Settings { hooks: Hooks }
interface EventPayload { hook_event_name: string; tool_name?: string; source?: string; tool_input?: unknown; session_id?: string; transcript_path?: string }

function stellix(): string {
  const dir = fixture('stellix-profile');
  for (const d of ['lib/app/src', 'lib/world/src']) mkdirSync(join(dir, d), { recursive: true });
  return dir;
}

const matches = (matcher: string | undefined, target: string): boolean => !matcher || matcher === '*' || new RegExp(`^(?:${matcher})$`).test(target);
const settingsOf = (dir: string): Settings => parseJson<Settings>(readFileSync(join(dir, '.claude/settings.json'), 'utf8')) ?? { hooks: {} };

// The hooks the packs register for an event and a tool (or a SessionStart source), async-rewake ones and the ones the
// project's layout switches off aside.
function expected(dir: string, event: string, target: string): string[] {
  const layout = parseJson<Parameters<typeof isDisabled>[0]>(readFileSync(join(dir, '.claude/layout.json'), 'utf8')) ?? {};
  const out = new Set<string>();
  for (const p of PACKS) {
    const groups = (readPack(p).hooks as Hooks | undefined)?.[event] ?? [];
    for (const g of groups) {
      if (!matches(g.matcher, target)) continue;
      for (const h of g.hooks) {
        const found = h.command.match(/hooks\/(([\w-]+)\.(?:mjs|py))/);
        const [file, name] = [found?.[1], found?.[2]];
        if (file && name && !h.asyncRewake && !isDisabled(layout, `hooks/${file}`)) out.add(name);
      }
    }
  }
  return [...out];
}

// Every settings entry of the event that matches, run the way Claude Code runs it.
function fireEvent(dir: string, payload: EventPayload): void {
  const target = payload.tool_name ?? payload.source ?? '';
  for (const g of settingsOf(dir).hooks[payload.hook_event_name] ?? []) {
    if (!matches(g.matcher, target)) continue;
    for (const h of g.hooks) {
      if (h.asyncRewake) continue;
      spawnSync('bash', ['-c', h.command], { input: JSON.stringify(payload), cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir, PYTHONDONTWRITEBYTECODE: '1' }, encoding: 'utf8' });
    }
  }
}

// the hook lines only: the daemon's own start line (commit-cost, doctor's cold-start marker) records no hook call
const logged = (dir: string): string[][] => (existsSync(join(dir, '.claude/hooks.log')) ? readFileSync(join(dir, '.claude/hooks.log'), 'utf8') : '')
  .split('\n').filter(Boolean).map((l) => l.split('\t')).filter((r) => r[1] !== 'DaemonStart');

test('every installed hook writes one timing line per call: time, event, hook, ms, exit code', () => {
  const dir = stellix();
  const cases: [EventPayload, string][] = [
    [{ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: join(dir, 'lib/world/src/a.h'), content: '// a\n' } }, 'Write'],
    [{ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm lib/world/src/none.h' } }, 'Bash'],
    [{ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(dir, 'lib/world/src/a.h'), old_string: 'a', new_string: 'b' } }, 'Edit'],
    [{ hook_event_name: 'Stop', session_id: 't', transcript_path: join(dir, 'none.jsonl') }, ''],
  ];
  for (const [payload, target] of cases) {
    const before = logged(dir).length;
    fireEvent(dir, payload);
    // A PostToolUse call is answered before its recorders run (the daemon's late hooks, KWB-208 wave 2): their lines land just after.
    const want = expected(dir, payload.hook_event_name, target);
    for (let waited = 0; waited < 10000 && !want.every((h) => logged(dir).slice(before).some((r) => r[2] === h)); waited += 100) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    const rows = logged(dir).slice(before);
    for (const r of rows) {
      assert.equal(r.length >= 5, true, `a line has time, event, hook, ms, exit: ${r.join(' | ')}`);
      assert.ok(!Number.isNaN(Date.parse(r[0] ?? '')), `ISO time: ${r[0]}`);
      assert.equal(r[1], payload.hook_event_name);
      assert.match(r[3] ?? '', /^\d+$/);
      assert.match(r[4] ?? '', /^-?\d+$/);
    }
    const names = new Set(rows.map((r) => r[2]));
    for (const h of want) assert.ok(names.has(h), `${h} wrote no timing line on ${payload.hook_event_name} ${target}`);
  }
});

test('a full log rotates and nothing is lost', () => {
  const dir = fresh('cpt-log-');
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
  const fake = (name: string, ms: number): void => {
    const file = join(dir, '.claude/hooks', `${name}.mjs`);
    writeFileSync(file, `import { asHook, isMain } from './lib/hook-log.mjs';\nconst hook = () => { const t = Date.now(); while (Date.now() - t < ${ms}); return 0; };\n` +
      `if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? 0 : await asHook('${name}', hook));\n`);
    for (let i = 0; i < 3; i += 1) spawnSync('node', [file], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  };
  fake('slow-fake', 600);
  fake('quick-fake', 0);
  const r = cli(dir, 'doctor');
  assert.match(r.stdout, /PROBLEM: slow-fake: median [0-9]+ ms over its last 3 calls \(worst [0-9]+ ms\), over 500 ms/);
  assert.doesNotMatch(r.stdout, /PROBLEM: quick-fake: median/);   // the fakes are in no settings entry, which doctor says too (0.18.0)
  assert.match(r.stdout, /hook timing/);
  assert.equal(r.status, 1);
});

// One runner entry per event (KWB-24, W8.1): every kit node hook is a row of the table the runner reads, and each exports hook for
// it; an async hook (idle-wake waits for minutes; heartbeat, 1.8.0, never holds a call) keeps its own entry.
test('settings run the kit node hooks through run-hooks.mjs, and every such hook exports hook(text)', () => {
  const dir = stellix();
  const commands = Object.values(settingsOf(dir).hooks).flatMap((gs) => gs.flatMap((g) => g.hooks));
  const direct = commands.filter((h) => !h.async && !h.asyncRewake && /^node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/(?!run-hooks\.mjs)[\w-]+\.mjs"$/.test(h.command));
  assert.deepEqual(direct.map((h) => h.command), [], 'no kit node hook runs as its own process');
  const runners = commands.filter((h) => h.command.includes('run-hooks.mjs'));
  assert.ok(runners.every((h) => h.command === 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/run-hooks.mjs"'), 'the runner entry names no hook: the table does');
  const events = Object.entries(settingsOf(dir).hooks).map(([event, gs]) => gs.filter((g) => g.hooks.some((h) => h.command.includes('run-hooks.mjs'))).length);
  assert.ok(events.every((n) => n <= 1), `one runner entry per event: ${events.join(',')}`);
  const table = JSON.parse(readFileSync(join(dir, '.claude/hooks/hooks.json'), 'utf8')) as { hook: string; async?: boolean }[];
  const named = new Set(table.filter((r) => !r.async).map((r) => r.hook));
  assert.ok(named.size >= 15, `${named.size} hooks through the runner`);
  for (const n of named) assert.match(readFileSync(join(dir, '.claude/hooks', `${n}.mjs`), 'utf8'), /^export (?:const|function) hook\b/m, `${n} exports hook`);
  for (const p of PACKS) {
    for (const f of readdirSync(join(KIT, `packs/${p}/hooks`)).filter((x) => x.endsWith('.mjs') && !['run-hooks.mjs', 'idle-wake.mjs', 'resident.mjs'].includes(x))) {
      assert.match(readFileSync(join(KIT, `packs/${p}/hooks/${f}`), 'utf8'), /^export (?:const|function) hook\b/m, `${p}/${f} exports hook`);
    }
  }
  assert.equal(spawnSync('node', [join(dir, '.claude/hooks/run-hooks.mjs'), '--selftest'], { encoding: 'utf8' }).status, 0, 'the runner\'s own selftest');
});
