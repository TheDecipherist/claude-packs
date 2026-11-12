// KWB-26: the kit is a project like any other (split from base-install.test.mts so no file sums over a minute). Its own .claude/ carries the base
// pack (every base hook judges work on the kit, kit-lock beside them), doctor --strict passes on it, and a project's own node hook that is not
// written for the runner keeps its own settings entry (the kit's kit-lock was folded into run-hooks.mjs and failed there as exit 1, so it never refused).
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { KIT, assert, join, put, run, spawnSync, test } from '../../kit-cli.mts';

interface SettingsFile { hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]>; permissions?: unknown }
const commandsOf = (settings: SettingsFile, event: string): string[] => (settings.hooks[event] ?? []).flatMap((g) => g.hooks).map((h) => h.command);

test('a project\'s own node hooks, with or without an export, keep their own settings entries through install and updates (KWB-26)', () => {
  const dir = scratchDir('cpk-');
  put(join(dir, '.claude/hooks/own-alone.mjs'), 'process.exit(0);\n');
  put(join(dir, '.claude/hooks/own-hook.mjs'), 'export const hook = () => 0;\n');
  const own = (n: string) => ({ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${n}"`, timeout: 10 });
  put(join(dir, '.claude/settings.json'), toJson({ hooks: { PreToolUse: [{ matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash', hooks: [own('own-alone.mjs'), own('own-hook.mjs')] }] } }));
  run(dir, 'init', 'base');   // the install and its updates are the subject: the second `init` here
  for (const pass of ['init', 'update', 'a second update']) {
    if (pass !== 'init') run(dir, 'update');
    const pre = commandsOf(readJson<SettingsFile>(join(dir, '.claude/settings.json')) ?? { hooks: {} }, 'PreToolUse');
    assert.ok(pre.includes('node "$CLAUDE_PROJECT_DIR/.claude/hooks/own-alone.mjs"'), `${pass}: own entry kept:\n${pre.join('\n')}`);
    assert.ok(pre.includes('node "$CLAUDE_PROJECT_DIR/.claude/hooks/own-hook.mjs"'), `${pass}: a project's hook written for the runner keeps its own entry too (W8.1: the runner runs the kit's table):\n${pre.join('\n')}`);
    assert.equal(pre.filter((c) => c.includes('own-hook.mjs')).length, 1, `${pass}: once`);
    const table = readJson<{ hook: string }[]>(join(dir, '.claude/hooks/hooks.json')) ?? [];
    assert.ok(table.length > 0 && !table.some((r) => r.hook.startsWith('own-')), `${pass}: the kit's table names none of the project's hooks`);
    assert.equal(pre.filter((c) => c === 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/run-hooks.mjs"' || c.startsWith('sh "$CLAUDE_PROJECT_DIR/.claude/hooks/bin/hook-proxy"')).length, 1, `${pass}: one runner entry for the event (the TypeScript runner, or since W8.2 the picker of the Go proxy)`);
  }
});

test('the kit repo has its own base pack installed: kit-lock and every base hook registered, git-guard on Bash and Stop', () => {
  const lock = readJson<{ packs: string[] }>(join(KIT, '.claude/claude-packs.lock.json'));
  assert.deepEqual(lock?.packs, ['base']);
  const settings = readJson<SettingsFile>(join(KIT, '.claude/settings.json'));
  assert.ok(settings, 'the kit has settings');
  // a hook is registered by a settings entry, or by a row of the table the runner reads (W8.1)
  const rows = (readJson<{ hook: string }[]>(join(KIT, '.claude/hooks/hooks.json')) ?? []).map((r) => `.claude/hooks/${r.hook}.mjs`);
  const all = [...Object.values(settings.hooks).flat().flatMap((g) => g.hooks).map((h) => h.command), ...rows].join('\n');
  const base = readJson<{ hooks: Record<string, { hooks: { command: string }[] }[]> }>(join(KIT, 'packs/base/pack.json'));
  for (const g of Object.values(base?.hooks ?? {}).flat()) {
    for (const h of g.hooks) {
      const name = /hooks\/([\w-]+\.mjs)/.exec(h.command)?.[1] ?? '';
      if (['build-sweep.mjs', 'idle-wake.mjs', 'user-asks.mjs'].includes(name)) continue; // opt-in
      assert.match(all, new RegExp(`\\.claude/hooks/${name.replace('.', '\\.')}`), name);
    }
  }
  assert.match(all, /kit-lock\.mjs/, 'kit-lock stays');
  // since W8.1 the runner's entry names no hook: the table's git-guard row says which events it judges
  const table = readJson<{ hook: string; events: string[] }[]>(join(KIT, '.claude/hooks/hooks.json')) ?? [];
  const guard = table.filter((r) => r.hook === 'git-guard').flatMap((r) => r.events);
  assert.ok(guard.includes('Stop') && guard.includes('PreToolUse'), `git-guard judges Bash and the end of a session: ${guard.join(', ')}`);
  // the runner, or since W8.2 the picker that starts the proxy (which falls back to the runner)
  assert.ok(commandsOf(settings, 'Stop').some((c) => /\.claude\/hooks\/(run-hooks\.mjs|bin\/hook-proxy)/.test(c)), 'the runner answers Stop');
  const layout = readJson<{ guards: { git: { house: boolean } }; folders: Record<string, { path: string }> }>(join(KIT, '.claude/layout.json'));
  assert.equal(layout?.guards.git.house, true, 'the house git laws hold on the kit');
  for (const f of ['bin', 'lib', 'packs', 'global', 'test', 'docs']) assert.ok(Object.values(layout?.folders ?? {}).some((x) => x.path === f), f);
  const r = spawnSync('node', [join(KIT, 'bin/claude-packs.mjs'), 'doctor', '--strict', '--dir', KIT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
