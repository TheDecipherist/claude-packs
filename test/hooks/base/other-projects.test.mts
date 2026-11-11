// One session often edits sibling projects (rolling a lesson out to every synth). This project's hooks must never block that: each hook
// judges only files inside its own project. No hook of its own: it fires every installed hook at files in another project.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { CLI, assert, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

/** A copy of the stellix install, with the folders its profile's layout names (what the old test made before `init`). */
function stellixLike(): string {
  const dir = fixture('stellix-profile');
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  return dir;
}

test('no hook of this project blocks an edit in another project', () => {
  const here = stellixLike();
  const other = scratchDir('cpo-other-');
  put(join(other, 'src/dsp/Big.cpp'), 'x\n'.repeat(320));
  const env = { ...process.env, CLAUDE_PROJECT_DIR: here };
  execFileSync('node', [join(here, '.claude/tools/freeze.mjs'), 'on', 'bug 1', '**/*'], { env });
  execFileSync('node', [join(here, '.claude/hooks/spec-lock.mjs'), 'lock', 'build running'], { env, stdio: 'ignore' });

  const nasty = `${'y\n'.repeat(330)}void processBlock() { new int[3]; std::mutex m; std::rand(); }\n#include <cmath>\nstd::unordered_map<int,int> u; sin(1.0);\n`;
  const targets = ['src/dsp/Big.cpp', 'src/dsp/New.cpp', 'lib/world/src/sim.cpp', 'lib/engines/src/tabula/Voice.h', 'docs/stellix-spec.md', 'Resources/logo.png', 'CMakeLists.txt'];
  // Every hook, node and python, as a PreToolUse call (time-guard's PostToolUse reports on the machine, not on a file).
  const hooks = readdirSync(join(here, '.claude/hooks')).filter((f) => /\.(mjs|py)$/.test(f));
  assert.ok(hooks.includes('git-guard.mjs') && hooks.includes('browser-guard.mjs'), 'the house hooks are installed and fired too');
  const fire = (hook: string, payload: Record<string, unknown>) =>
    spawnSync('node', [join(here, '.claude/hooks', hook)], { input: JSON.stringify({ hook_event_name: 'PreToolUse', ...payload }), env, encoding: 'utf8' });
  const blocked: string[] = [];
  for (const hook of hooks) {
    for (const target of [...targets, 'tools/shot.mjs']) {
      const payload = { tool_name: 'Write', tool_input: { file_path: join(other, target), content: `${nasty}const b = await puppeteer.${'launch'}();\n` } };
      const r = fire(hook, payload);
      if (r.status !== 0) blocked.push(`${hook} on ${target}: ${r.stderr.split('\n')[0]}`);
    }
    const bash = { tool_name: 'Bash', tool_input: { command: `cd ${other} && cp a.png Resources/logo.png && sed -i s/a/b/ docs/stellix-spec.md && sed -i s/a/b/ lib/engines/src/tabula/Voice.h` } };
    const r = fire(hook, bash);
    if (r.status !== 0) blocked.push(`${hook} on bash: ${r.stderr.split('\n')[0]}`);
  }
  assert.deepEqual(blocked, []);
});

test('sibling projects are readable and editable: layout.siblings becomes additionalDirectories', () => {
  const here = stellixLike();
  const settings = readJson<{ permissions: { additionalDirectories: string[] } }>(join(here, '.claude/settings.json'));
  assert.deepEqual(settings?.permissions.additionalDirectories, ['../']);
});

test('update-all updates every project that has claude-packs and skips the rest', () => {
  const root = scratchDir('cpo-');
  const a = stellixLike();
  const b = fixture('audio-core');
  mkdirSync(join(root, 'notes'));
  const out = execFileSync('node', [CLI, 'update-all', a, b, join(root, 'notes')], { encoding: 'utf8' });
  assert.match(out, new RegExp(`== .*${basename(a)}[\\s\\S]*OK: base, audio-core, gpu-painter, stellix`));
  assert.match(out, new RegExp(`== .*${basename(b)}[\\s\\S]*OK: base, audio-core`));
  assert.doesNotMatch(out, /notes/);
});
