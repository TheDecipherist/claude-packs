// The worktree cases for hooks a pack other than base adds (synth-creator, gpu-painter, stellix, reverse-engineering): the
// worktree file each must allow and the one it must refuse, judged from the worktree's own checkout. worktrees.test.mjs
// joins them with base's own, and fails for an installed hook with no case.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bash, fire, fireAs, put } from './worktree-rig.mjs';
import { requiredSettings } from '../packs/audio-core/hooks/lib/settings-standard.mjs';

// The worktree's layout says one thing and main's another; the hook is judged by the checkout its file or command is in.
const withGuards = (wt, guards) => put(join(wt, '.claude/layout.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8')), guards }));

export const PACK_CASES = {
  'protect-vendor.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'protect-vendor.mjs', join(wt, 'src/dsp/Svf.cpp')), 0);
    assert.equal(fire(here, 'protect-vendor.mjs', join(wt, 'third_party/lib/lib.h')), 2);
    // the copy tree (a layout folder of kind "copy"), by a tool and by the shell; its sanctioned tool gets through
    assert.equal(fire(here, 'protect-vendor.mjs', join(wt, 'src/engines/copied/Voice.h')), 2);
    assert.equal(bash(here, 'protect-vendor.mjs', `sed -i '' s/a/b/ ${join(wt, 'src/engines/copied/Voice.h')}`), 2);
    assert.equal(bash(here, 'protect-vendor.mjs', `python3 tools/copy_in.py ${join(wt, 'src/engines/copied/Voice.h')}`), 0);
    assert.equal(bash(here, 'protect-vendor.mjs', `sed -i '' s/a/b/ ${join(wt, 'src/engines/Own.h')}`), 0);
  },
  'build-guard.mjs': ({ here, wt }) => {
    assert.equal(bash(here, 'build-guard.mjs', `cd ${wt} && cmake --build build -j8`), 2, 'a build outside the queue');
    assert.equal(bash(here, 'build-guard.mjs', `cd ${wt} && buildq cmake --build build -j8`), 0);
  },
  'time-guard.mjs': ({ here, wt }) => {
    const pre = (command) => fireAs(here, 'time-guard.mjs', { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }).status;
    const loop = (pattern) => ['until', '!', 'pgrep', '-f', pattern, '>/dev/null;', 'do', 'sleep', '5;', 'done'].join(' ');
    assert.equal(pre(`cd ${wt} && ${loop('"cmake --build"')}`), 2);
    assert.equal(pre(`cd ${wt} && ${loop("'[c]make --build'")}`), 0);
  },
  'user-asks.mjs': ({ here, wt }) => {
    const t = join(wt, 'transcript.jsonl');
    writeFileSync(t, `${JSON.stringify({ type: 'user', timestamp: new Date().toISOString(), message: { content: 'make the bank louder' } })}\n`);
    const r = fireAs(here, 'user-asks.mjs', { hook_event_name: 'SessionStart', source: 'compact', transcript_path: t }, { TIMS_ASKS_LEDGER: join(wt, 'ledger.json') });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /make the bank louder/);
  },
  'idle-wake.mjs': ({ here, wt }) => {
    const t = join(wt, 'transcript.jsonl');
    writeFileSync(t, '{}\n');
    const env = { IDLE_WAKE_MIN: '0.0005', IDLE_WAKE_LOOK_S: '0.01', TIMS_ASKS_LEDGER: join(wt, 'ledger.json') };
    assert.equal(fireAs(here, 'idle-wake.mjs', { hook_event_name: 'Stop', transcript_path: t, last_assistant_message: 'Next I would build P4.' }, env).status, 2);
    assert.equal(fireAs(here, 'idle-wake.mjs', { hook_event_name: 'Stop', transcript_path: t, last_assistant_message: 'All done. NOTHING OPEN' }, env).status, 0);
  },
  'browser-guard.py': ({ here, wt }) => {
    const launch = `import puppeteer from 'puppeteer';\nconst b = await puppeteer.${'launch'}();\n`;
    assert.equal(fire(here, 'browser-guard.py', join(wt, 'tools/shot.mjs'), launch), 2);
    assert.equal(fire(here, 'browser-guard.py', join(wt, 'src/painter/Draw.cpp'), 'void draw() {}\n'), 0);
  },
  'firmware-out-of-git.mjs': ({ here, wt }) => {
    // The worktree's layout names this fixture; main's does not.
    put(join(wt, 'one.syx'), 'x');
    put(join(here, 'one.syx'), 'x');
    withGuards(wt, { firmware: { fixtures: ['one.syx'] } });
    const add = (cwd) => fireAs(here, 'firmware-out-of-git.mjs', { tool_name: 'Bash', tool_input: { command: 'git add one.syx' }, cwd }).status;
    assert.equal(add(wt), 0);
    assert.equal(add(here), 2);
  },
  'chart-first.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'chart-first.mjs', join(wt, 'src/dsp/Svf.cpp')), 2, 'no committed chart in the worktree');
    // the worktree's layout names a chart its HEAD holds (CLAUDE.md stands in for one); main's names the default, which it lacks
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8')), chart: 'CLAUDE.md' }));
    assert.equal(fire(here, 'chart-first.mjs', join(wt, 'src/dsp/Svf.cpp')), 0, 'judged by the worktree');
    assert.equal(fire(here, 'chart-first.mjs', join(here, 'src/dsp/Svf.cpp')), 2, 'main has no chart');
  },
  // A non-base pack's hook cannot be imported from packs/ (its ./lib/ is base's, merged only by an install), so the worktree
  // cases of these hooks stay functions here, beside the `worktreeCase` data each hook exports, until slice 6 reads it from an install.
  'no-shipped-images.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'no-shipped-images.mjs', join(wt, 'src/painter/logo.png')), 2);
    assert.equal(fire(here, 'no-shipped-images.mjs', join(wt, 'tests/goldens/panel.png')), 0);
    assert.equal(bash(here, 'no-shipped-images.mjs', `cp /tmp/a.png ${join(wt, 'src/app/logo.png')}`), 2);
  },
  'settings-layer.mjs': ({ here, wt }) => {
    // the worktree's layout declares the settings layer and main's does not: the worktree's file is judged by the worktree's layout
    const layout = JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8'));
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...layout, settingsLayer: { files: ['src/app/SettingsRows.cpp'] } }));
    const rows = (ids) => `const SettingRow rows[] = { ${ids.map((id) => `{ "${id}" }`).join(', ')} };\n`;
    const all = requiredSettings().map(([id]) => id);
    assert.equal(fire(here, 'settings-layer.mjs', join(wt, 'src/app/SettingsRows.cpp'), rows(all.filter((id) => id !== 'midi.qwerty'))), 2);
    assert.equal(fire(here, 'settings-layer.mjs', join(wt, 'src/app/SettingsRows.cpp'), rows(all)), 0);
    assert.equal(fire(here, 'settings-layer.mjs', join(here, 'src/app/SettingsRows.cpp'), rows([])), 0, 'main declares no settings layer');
  },
};
