// Agents work in git worktrees under .claude/worktrees/, while CLAUDE_PROJECT_DIR still points at the
// main checkout. Every hook must judge a worktree file against its own checkout (Stellix WB-41, WB-55:
// folder-law refused every new file in a worktree, and agents routed new code into unrelated files).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { APVTS, CLI, caseFrom, fire, fireAs, installedCase, movedConceptCase, project, put } from '../worktree-rig.mts';
import type { Checkouts } from '../worktree-rig.mts';
import { readJson } from '../../packs/base/hooks/lib/json.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { COMMAND_CASES } from '../worktree-cases-commands.mts';
import { PACK_CASES } from '../worktree-cases-packs.mts';
import { RESIDENT_CASE } from '../worktree-cases-resident.mts';
import { worktreeCase as CODE_SHAPE } from '../../packs/base/hooks/code-shape.mts';
import { worktreeCase as DISPATCH_ONCE } from '../../packs/base/hooks/dispatch-once.mts';
import { worktreeCase as FILE_SIZE_GUARD } from '../../packs/base/hooks/file-size-guard.mts';
import { worktreeCase as FOLDER_LAW } from '../../packs/base/hooks/folder-law.mts';
import { worktreeCase as GIT_GUARD } from '../../packs/base/hooks/git-guard.mts';
import { worktreeCase as HEARTBEAT } from '../../packs/base/hooks/heartbeat.mts';
import { worktreeCase as LESSON_CHECKS } from '../../packs/base/hooks/lesson-checks.mts';
import { worktreeCase as ONCE_ONLY } from '../../packs/base/hooks/once-only.mts';
import { worktreeCase as ONCE_ONLY_INDEX } from '../../packs/base/hooks/once-only-index.mts';
import { worktreeCase as PLACEMENT_LAW } from '../../packs/base/hooks/placement-law.mts';
import { worktreeCase as SECRETS_GUARD } from '../../packs/base/hooks/secrets-guard.mts';
import { worktreeCase as SHAPE_LAW } from '../../packs/base/hooks/shape-law.mts';


const PARAMS = (...ids: string[]): string => ids.map((id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };`).join('\n') + '\n';
const RT_BAD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { auto* x = new float[64]; }\n';

// making, making-check (0.9.0): a manifest with one many concept.
const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] };

// One case per installed hook: the worktree file it must allow and the one it must refuse, judged
// from the worktree's own checkout. A hook added to the packs without a case here, in worktree-cases-commands.mts (a base hook
// that judges a command by its checkout's layout) or in worktree-cases-packs.mts (a hook a pack other than base adds) fails the test.
const CASES: Record<string, (checkouts: Checkouts) => void | Promise<void>> = {
  ...PACK_CASES,
  ...COMMAND_CASES,
  ...RESIDENT_CASE,
  // the runner as settings.json runs it (KWB-24): the hooks it names judge a worktree file against the worktree, and the
  // timing lines go to the main checkout's log (CLAUDE_PROJECT_DIR)
  'run-hooks.mjs': ({ here, wt }) => {
    const via = (file: string, content = '// new\n') => spawnSync('node', [join(here, '.claude/hooks/run-hooks.mjs'), '.claude/hooks/folder-law.mjs', '.claude/hooks/file-size-guard.mjs'],
      { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: file, content } }), env: { ...process.env, CLAUDE_PROJECT_DIR: here }, encoding: 'utf8' });
    assert.equal(via(join(wt, 'src/core/Svf.cpp')).status, 0);
    assert.equal(via(join(wt, 'stray/Svf.cpp')).status, 2);
    assert.equal(via(join(wt, 'src/core/Huge.cpp'), 'x\n'.repeat(400)).status, 2);
    assert.match(readFileSync(join(here, '.claude/hooks.log'), 'utf8'), /\tfolder-law\t\d+\t2\tWrite/);
  },
  'folder-law.mjs': caseFrom('folder-law.mjs', FOLDER_LAW),
  'file-size-guard.mjs': caseFrom('file-size-guard.mjs', FILE_SIZE_GUARD),
  'placement-law.mjs': caseFrom('placement-law.mjs', PLACEMENT_LAW),
  'shape-law.mjs': caseFrom('shape-law.mjs', SHAPE_LAW),
  'lesson-checks.mjs': (checkouts) => {
    caseFrom('lesson-checks.mjs', LESSON_CHECKS)(checkouts);   // the worktree's own check, then a concept moved in its layout
    movedConceptCase(checkouts);
  },
  'frozen-files.mjs': installedCase('frozen-files.mjs'),
  'spec-lock.mjs': installedCase('spec-lock.mjs'),
  'secrets-guard.mjs': caseFrom('secrets-guard.mjs', SECRETS_GUARD),
  // 1.8.0: a call in the worktree is that agent's heartbeat, written in the main checkout where the status reads it, never
  // into the worktree; a call in the main checkout is the lead's
  'heartbeat.mjs': (checkouts) => {
    caseFrom('heartbeat.mjs', HEARTBEAT)(checkouts);
    const { here, wt } = checkouts;
    const beat = (name: string, root = here): { tool?: string; event?: string } | null => readJson<{ tool?: string; event?: string }>(join(root, '.claude/logs/heartbeats', `${name}.json`));
    assert.equal(fireAs(here, 'heartbeat.mjs', { hook_event_name: 'PreToolUse', cwd: wt, tool_name: 'Edit', tool_input: { file_path: join(wt, 'src/x.cpp') } }).status, 0);
    assert.equal(beat('agent-x')?.tool, 'Edit');
    assert.equal(beat('agent-x', wt), null);
    assert.equal(fireAs(here, 'heartbeat.mjs', { hook_event_name: 'PostToolUse', cwd: here, tool_name: 'Read', tool_input: { file_path: join(here, 'CLAUDE.md') } }).status, 0);
    assert.equal(beat('lead')?.event, 'post');
  },
  'stage-guard.mjs': installedCase('stage-guard.mjs'),
  'git-guard.mjs': caseFrom('git-guard.mjs', GIT_GUARD),
  // A non-base pack's hook cannot be imported from packs/ (its ./lib/ is base's, merged only by an install), so these cases stay
  // functions, beside the `worktreeCase` data each hook exports, until slice 6 reads it from an install.
  'realtime-guard.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'realtime-guard.mjs', join(wt, 'src/audio/Voice.cpp'), RT_BAD), 2);
    assert.equal(fire(here, 'realtime-guard.mjs', join(wt, 'src/audio/Voice.cpp'), 'void Voice::processBlock (B& b, M& m) { juce::ScopedNoDenormals noDenormals; b.clear(); }\n'), 0);
  },
  'param-id-lock.mjs': ({ here, wt }) => {
    // PostToolUse: the edit is already on disk. A worktree that drops an id is refused even though
    // main still has it; a worktree's new id goes into the worktree's lock, never main's.
    const post = (file: string): number | null => fireAs(here, 'param-id-lock.mjs', { tool_name: 'Write', tool_input: { file_path: file } }).status;
    const lockOf = (root: string): string[] => JSON.parse(readFileSync(join(root, '.claude/param-ids.lock.json'), 'utf8')) as string[];
    put(join(wt, 'src/params/Params.h'), PARAMS('cutoff'));
    assert.equal(post(join(wt, 'src/params/Params.h')), 2);
    put(join(wt, 'src/params/Params.h'), PARAMS('cutoff', 'res', 'drive'));
    assert.equal(post(join(wt, 'src/params/Params.h')), 0);
    assert.ok(lockOf(wt).includes('drive'));
    assert.ok(!lockOf(here).includes('drive'));
    // Main drops an id the worktree still has: the worktree's copy must not hide it.
    put(join(here, 'src/params/Params.h'), PARAMS('cutoff'));
    assert.equal(post(join(here, 'src/params/Params.h')), 2);
    put(join(here, 'src/params/Params.h'), PARAMS('cutoff', 'res'));
  },
  'dispatch-once.mjs': caseFrom('dispatch-once.mjs', DISPATCH_ONCE),
  'once-only.mjs': caseFrom('once-only.mjs', ONCE_ONLY),
  'once-only-index.mjs': caseFrom('once-only-index.mjs', ONCE_ONLY_INDEX),
  'code-shape.mjs': caseFrom('code-shape.mjs', CODE_SHAPE),
  'reuse-hint.mjs': ({ here, wt }) => {
    // The worktree's branch has this helper; main does not. A prompt is judged by the checkout it was typed in.
    put(join(wt, 'src/app/dates.ts'), 'export function formatDateRange(a, b) {\n  return a;\n}\n');
    const said = (cwd: string): string => fireAs(here, 'reuse-hint.mjs', { hook_event_name: 'UserPromptSubmit', prompt: 'format the date range', cwd }).stdout;
    assert.match(said(wt), /formatDateRange/);
    assert.doesNotMatch(said(here), /formatDateRange/);
  },
  'making.mjs': ({ here, wt }) => {
    put(join(wt, 'design/shape.json'), JSON.stringify(SHAPE));
    const said = (cwd: string): string => fireAs(here, 'making.mjs', { hook_event_name: 'UserPromptSubmit', prompt: 'drive slot 2 louder', cwd }).stdout;
    assert.match(said(wt), /you named slot 2: building for all slots/);
    assert.doesNotMatch(said(here), /you named/, 'main has no manifest yet');
  },
};

test('every hook judges a worktree file against the worktree, inside a real git worktree', async () => {
  const p = project(['audio-core', 'gpu-painter', 'stellix', 'reverse-engineering'], (dir) => {
    const lf = join(dir, '.claude/layout.json');
    const layout = readLayout(dir);
    layout.folders.engines_copy = { path: 'src/engines/copied', kind: 'copy', purpose: 'a copy tree' };
    layout.guards = { copy: { tools: ['tools/copy_in.py'] }, git: { refuseTrunk: true } };
    layout.enable = ['hooks/user-asks.mjs', 'hooks/idle-wake.mjs']; // the opt-in hooks too, so every hook is tried
    writeFileSync(lf, JSON.stringify(layout, null, 2));
    execFileSync('node', [CLI, 'update', '--dir', dir], { stdio: 'ignore' });
    put(join(dir, 'src/params/Params.h'), PARAMS('cutoff', 'res'));
    execFileSync('node', [join(dir, '.claude/hooks/param-id-lock.mjs'), '--init'], { cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  });
  const installed = readdirSync(join(p.here, '.claude/hooks')).filter((f) => /\.(mjs|py)$/.test(f)).sort();
  assert.deepEqual(installed, Object.keys(CASES).sort(), 'every installed hook needs a worktree case here');
  const failed: string[] = [];
  for (const [hook, check] of Object.entries(CASES)) {
    try { await check(p); } catch (e) { failed.push(`${hook}: ${(e instanceof Error ? e.message : String(e)).split('\n').slice(0, 5).join(' | ')}`); }
  }
  assert.deepEqual(failed, []);
});

