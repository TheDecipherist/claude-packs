// KWB-26: the kit is a project like any other (split from base-install.test.mts so no file sums over a minute). Its own .claude/ carries the base
// pack (every base hook judges work on the kit, kit-lock beside them), doctor --strict passes on it, and a project's own node hook that is not
// written for the runner keeps its own settings entry (the kit's kit-lock was folded into run-hooks.mjs and failed there as exit 1, so it never refused).
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { KIT, assert, join, put, run, spawnSync, test } from '../../kit-cli.mts';

interface SettingsFile { hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]>; permissions?: unknown }
const commandsOf = (settings: SettingsFile, event: string): string[] => (settings.hooks[event] ?? []).flatMap((g) => g.hooks).map((h) => h.command);

test('a project\'s own node hook with no hook(text) export keeps its own settings entry; one with it joins the runner', () => {
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
    assert.ok(pre.some((c) => c.includes('run-hooks.mjs') && c.includes('.claude/hooks/own-hook.mjs')), `${pass}: a hook written for the runner joins it, and an update keeps it:\n${pre.join('\n')}`);
    assert.ok(!pre.some((c) => c.includes('run-hooks.mjs') && c.includes('own-alone.mjs')), `${pass}: never folded into the runner`);
    assert.equal(pre.join('\n').match(/own-hook\.mjs/g)?.length, 1, `${pass}: once`);
  }
});

test('the kit repo has its own base pack installed: kit-lock and every base hook registered, git-guard on Bash and Stop', () => {
  const lock = readJson<{ packs: string[] }>(join(KIT, '.claude/claude-packs.lock.json'));
  assert.deepEqual(lock?.packs, ['base']);
  const settings = readJson<SettingsFile>(join(KIT, '.claude/settings.json'));
  assert.ok(settings, 'the kit has settings');
  const all = Object.values(settings.hooks).flat().flatMap((g) => g.hooks).map((h) => h.command).join('\n');
  const base = readJson<{ hooks: Record<string, { hooks: { command: string }[] }[]> }>(join(KIT, 'packs/base/pack.json'));
  for (const g of Object.values(base?.hooks ?? {}).flat()) {
    for (const h of g.hooks) {
      const name = /hooks\/([\w-]+\.mjs)/.exec(h.command)?.[1] ?? '';
      if (['build-sweep.mjs', 'idle-wake.mjs', 'user-asks.mjs'].includes(name)) continue; // opt-in
      assert.match(all, new RegExp(`\\.claude/hooks/${name.replace('.', '\\.')}`), name);
    }
  }
  assert.match(all, /kit-lock\.mjs/, 'kit-lock stays');
  assert.ok(commandsOf(settings, 'Stop').some((c) => c.includes('.claude/hooks/git-guard.mjs')), 'git-guard judges the end of a session');
  const layout = readJson<{ guards: { git: { house: boolean } }; folders: Record<string, { path: string }> }>(join(KIT, '.claude/layout.json'));
  assert.equal(layout?.guards.git.house, true, 'the house git laws hold on the kit');
  for (const f of ['bin', 'lib', 'packs', 'global', 'test', 'docs']) assert.ok(Object.values(layout?.folders ?? {}).some((x) => x.path === f), f);
  const r = spawnSync('node', [join(KIT, 'bin/claude-packs.mjs'), 'doctor', '--strict', '--dir', KIT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
