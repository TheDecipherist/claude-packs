// One session often edits sibling projects (rolling a lesson out to every synth). This project's
// hooks must never block that: each hook judges only files inside its own project.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const run = (...a) => execFileSync('node', [CLI, ...a], { encoding: 'utf8' });

function stellixLike(root, name) {
  const dir = join(root, name);
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  run('init', 'audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix', '--dir', dir);
  return dir;
}

test('no hook of this project blocks an edit in another project', () => {
  const root = mkdtempSync(join(tmpdir(), 'cpo-'));
  const here = stellixLike(root, 'stellix');
  const other = join(root, 'tabula');
  mkdirSync(join(other, 'src/dsp'), { recursive: true });
  writeFileSync(join(other, 'src/dsp/Big.cpp'), 'x\n'.repeat(320));
  execFileSync('node', [join(here, '.claude/tools/freeze.mjs'), 'on', 'bug 1', '**/*'], { env: { ...process.env, CLAUDE_PROJECT_DIR: here } });
  execFileSync('node', [join(here, '.claude/hooks/spec-lock.mjs'), 'lock', 'build running'], { env: { ...process.env, CLAUDE_PROJECT_DIR: here }, stdio: 'ignore' });

  const nasty = `${'y\n'.repeat(330)}void processBlock() { new int[3]; std::mutex m; std::rand(); }\n#include <cmath>\nstd::unordered_map<int,int> u; sin(1.0);\n`;
  const targets = ['src/dsp/Big.cpp', 'src/dsp/New.cpp', 'lib/world/src/sim.cpp', 'lib/engines/src/tabula/Voice.h', 'docs/stellix-spec.md', 'Resources/logo.png', 'CMakeLists.txt'];
  // Every hook, node and python, as a PreToolUse call (time-guard's PostToolUse reports on the machine, not on a file).
  const hooks = readdirSync(join(here, '.claude/hooks')).filter((f) => /\.(mjs|py)$/.test(f));
  assert.ok(hooks.includes('git-guard.py') && hooks.includes('browser-guard.py'), 'the python hooks are installed and fired too');
  const fire = (h, payload) => spawnSync(h.endsWith('.py') ? 'python3' : 'node', [join(here, '.claude/hooks', h)], { input: JSON.stringify({ hook_event_name: 'PreToolUse', ...payload }), env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: here } });
  const blocked = [];
  for (const h of hooks) {
    for (const t of [...targets, 'tools/shot.mjs']) {
      const payload = { tool_name: 'Write', tool_input: { file_path: join(other, t), content: `${nasty}const b = await puppeteer.${'launch'}();\n` } };
      const r = fire(h, payload);
      if (r.status !== 0) blocked.push(`${h} on ${t}: ${String(r.stderr).split('\n')[0]}`);
    }
    const bash = { tool_name: 'Bash', tool_input: { command: `cd ${other} && cp a.png Resources/logo.png && sed -i s/a/b/ docs/stellix-spec.md && sed -i s/a/b/ lib/engines/src/tabula/Voice.h` } };
    const r = fire(h, bash);
    if (r.status !== 0) blocked.push(`${h} on bash: ${String(r.stderr).split('\n')[0]}`);
  }
  assert.deepEqual(blocked, []);
});

test('sibling projects are readable and editable: layout.siblings becomes additionalDirectories', () => {
  const root = mkdtempSync(join(tmpdir(), 'cpo-'));
  const here = stellixLike(root, 'stellix');
  const s = JSON.parse(readFileSync(join(here, '.claude/settings.json'), 'utf8'));
  assert.deepEqual(s.permissions.additionalDirectories, ['../']);
});

test('update-all updates every project that has claude-packs and skips the rest', () => {
  const root = mkdtempSync(join(tmpdir(), 'cpo-'));
  const a = stellixLike(root, 'stellix');
  const b = join(root, 'tabula');
  mkdirSync(b);
  run('init', 'audio-core', '--dir', b);
  mkdirSync(join(root, 'notes'));
  const out = run('update-all', a, b, join(root, 'notes'));
  assert.match(out, /== .*stellix[\s\S]*OK: base, audio-core, gpu-painter, stellix/);
  assert.match(out, /== .*tabula[\s\S]*OK: base, audio-core/);
  assert.doesNotMatch(out, /notes/);
});
