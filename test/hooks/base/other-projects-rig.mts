// What the other-projects files share: a copy of the stellix install, and every installed hook of a letter range fired at files in another project.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { assert, registeredHooks, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

/** A copy of the stellix install, with the folders its profile's layout names (what the old test made before `init`). */
export function stellixLike(): string {
  const dir = fixture('stellix-profile');
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  return dir;
}

/** One test: no installed hook whose name starts with a letter in `first`..`last` blocks an edit in another project. */
export function holdsOtherProjectsAlone(first: string, last: string): void {
  test(`no hook of this project blocks an edit in another project (hooks ${first} to ${last})`, () => {   // was one test over every hook: "no hook of this project blocks an edit in another project"
    const here = stellixLike();
    const other = scratchDir('cpo-other-');
    put(join(other, 'src/dsp/Big.cpp'), 'x\n'.repeat(320));
    const env = { ...process.env, CLAUDE_PROJECT_DIR: here };
    execFileSync('node', [join(here, '.claude/tools/freeze.mjs'), 'on', 'bug 1', '**/*'], { env });
    execFileSync('node', [join(here, '.claude/hooks/spec-lock.mjs'), 'lock', 'build running'], { env, stdio: 'ignore' });

    const nasty = `${'y\n'.repeat(330)}void processBlock() { new int[3]; std::mutex m; std::rand(); }\n#include <cmath>\nstd::unordered_map<int,int> u; sin(1.0);\n`;
    const targets = ['src/dsp/Big.cpp', 'src/dsp/New.cpp', 'lib/world/src/sim.cpp', 'lib/engines/src/tabula/Voice.h', 'docs/stellix-spec.md', 'Resources/logo.png', 'CMakeLists.txt'];
    // Every hook, node and python, as a PreToolUse call (time-guard's PostToolUse reports on the machine, not on a file).
    // the hooks the install registers, never every file there: the daemon resident.mjs is no hook and answers a payload with its usage (KWB-207)
    const registered = new Set(registeredHooks(here));
    const all = readdirSync(join(here, '.claude/hooks')).filter((f) => /\.(mjs|py)$/.test(f) && registered.has(f.replace(/\.(mjs|py)$/, '')));
    assert.ok(all.includes('git-guard.mjs') && all.includes('browser-guard.mjs'), 'the house hooks are installed and fired too');
    const hooks = all.filter((h) => h[0] !== undefined && h[0] >= first && h[0] <= last);
    assert.ok(hooks.length > 0, `hooks from ${first} to ${last}`);
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
}
