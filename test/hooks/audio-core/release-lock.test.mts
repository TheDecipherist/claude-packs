// release-lock: what a patch or a song depends on is frozen at the first release; additions pass (PostToolUse). The contract, then the facts.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { write } from '../../fixtures/installs.mts';
import { hookRun, spawnSync, test } from '../../kit-cli.mts';
import { workProject } from '../work-project.mts';
import { fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

const PARAMS_H = 'src/params/Params.h';
const BANK = 'data/factory.csv';
const flt = (id: string, range: string): string => `layout.add (std::make_unique<juce::AudioParameterFloat> (juce::ParameterID { "${id}", 1 }, "${id}", juce::NormalisableRange<float> (${range}), 1.0f));\n`;
const mode = (...names: string[]): string => `layout.add (std::make_unique<juce::AudioParameterChoice> (juce::ParameterID { "mode", 1 }, "Mode", juce::StringArray { ${names.map((n) => `"${n}"`).join(', ')} }, 0));\n`;
const bank = (...names: string[]): string => `program,name\n${names.map((n, i) => `${i},${n}`).join('\n')}\n`;
const WIDE = '20.0f, 20000.0f, 0.0f, 0.3f';

function released(): string {
  const dir = workProject('audio-core');
  put(join(dir, PARAMS_H), flt('cutoff', WIDE) + mode('Saw', 'Pulse'));
  put(join(dir, BANK), bank('Init', 'Pad'));
  const r = spawnSync('node', [join(dir, '.claude/hooks/release-lock.mjs'), '--release'], { cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return dir;
}
const post = (dir: string, rel: string, text: string): number | null => (put(join(dir, rel), text), hookRun(dir, 'release-lock.mjs', write(join(dir, rel), text)).status);

async function worktreeCase(checkouts: Checkouts): Promise<void> {
  await installedWorktreeCase(checkouts, 'release-lock.mjs');
}

holdsTheContract({
  hook: 'release-lock.mjs',
  dir: () => fixture('audio-core'),
  worktree: worktreeCase,
  same: (project) => {
    put(join(project, PARAMS_H), flt('cutoff', WIDE));
    spawnSync('node', [join(project, '.claude/hooks/release-lock.mjs'), '--release'], { cwd: project, env: { ...process.env, CLAUDE_PROJECT_DIR: project }, stdio: 'ignore' });
    put(join(project, PARAMS_H), flt('cutoff', '20.0f, 9000.0f, 0.0f, 0.3f'));
    return { payload: write(join(project, PARAMS_H)), status: 2 };
  },
});

test('release-lock refuses a range, a skew, a mid-list choice and a renumbered program after the release', () => {
  const dir = released();
  assert.equal(post(dir, PARAMS_H, flt('cutoff', '20.0f, 9000.0f, 0.0f, 0.3f') + mode('Saw', 'Pulse')), 2);
  assert.equal(post(dir, PARAMS_H, flt('cutoff', '20.0f, 20000.0f, 0.0f, 0.6f') + mode('Saw', 'Pulse')), 2);
  assert.equal(post(dir, PARAMS_H, flt('cutoff', WIDE) + mode('Saw', 'Tri', 'Pulse')), 2);
  assert.equal(post(dir, BANK, bank('Pad', 'Init')), 2);
});

test('release-lock passes what is appended, and every change before the release', () => {
  const dir = released();
  assert.equal(post(dir, PARAMS_H, flt('cutoff', WIDE) + mode('Saw', 'Pulse', 'Tri') + flt('drive', '0.0f, 1.0f')), 0);
  assert.equal(post(dir, BANK, bank('Init', 'Pad', 'Bass')), 0);
  const free = workProject('audio-core');
  put(join(free, PARAMS_H), flt('cutoff', WIDE));
  assert.equal(post(free, PARAMS_H, flt('cutoff', '1.0f, 2.0f')), 0, 'no release, no lock');
});
