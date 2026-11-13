// W11: one scripted feature task, timed end to end through an install's own hooks: a knob added to a planted panel and a gain changed in a
// planted DSP block. The same tool calls in the same order run on any install (the published 1.9.0 or this tree), each shown to the hooks as
// Claude Code shows it (the settings' blocking entries of the event, all at once, the wall from spawn to the last exit), and the edits and the
// commit really happen between the Pre and the Post.
//   node feature-task.mts <project-dir> <out.json> [--runs N] [--env KEY=VALUE ...]
// <project-dir> is an installed project (git repository, `init --config synth-creator cpp audio-core`); each run works on a fresh copy
// of it under <project-dir>.run<N>, so a run starts from the same files. Out: per run the summed wall, the wall per step and each refusal.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { toJson } from '../../../../packs/base/hooks/lib/json.mts';

const args = process.argv.slice(2);
const dir0 = resolve(args[0] ?? '');
const out = args[1] ?? 'feature-task.json';
const runs = Number(args[args.indexOf('--runs') + 1] || 5);
const extra: NodeJS.ProcessEnv = {};
args.forEach((a, i) => { if (args[i - 1] === '--env') { const [k, ...v] = a.split('='); extra[k ?? ''] = v.join('='); } });

interface Entry { matcher?: string; hooks: { command: string; async?: boolean }[] }
interface Step { event: string; tool: string; input: object; act?: () => void }

const gitIn = (dir: string, ...a: string[]): void => { spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir }); };

/** Plants the panel, the DSP block, the making line and the shape file in a project, and commits them. */
function plant(dir: string): void {
  mkdirSync(join(dir, 'src/ui'), { recursive: true });
  mkdirSync(join(dir, 'src/dsp'), { recursive: true });
  mkdirSync(join(dir, 'design'), { recursive: true });
  mkdirSync(join(dir, 'docs'), { recursive: true });
  writeFileSync(join(dir, 'docs/chart.mmd'), 'flowchart LR\n  panel --> gain\n');
  writeFileSync(join(dir, 'src/ui/panel.cpp'), '// panel\nstruct Panel {\n  Knob cutoff;\n  Knob resonance;\n};\n');
  writeFileSync(join(dir, 'src/dsp/gain.cpp'), '// gain stage\nfloat gain(float x) { return x * 0.5f; }\n');
  writeFileSync(join(dir, 'design/shape.json'), '{"concepts":{}}\n');
  writeFileSync(join(dir, 'build.md'), '# build\n\n## In progress\n\n- work/feature: making: a knob on the panel and a gain change; concepts: none; reuse: Knob, src/ui/panel.cpp\n');
  gitIn(dir, 'add', 'src', 'design', 'docs', 'build.md');
  gitIn(dir, 'commit', '-q', '-m', 'plant', '--', 'src', 'design', 'docs', 'build.md');
}

function steps(dir: string): Step[] {
  const p = join(dir, 'src/ui/panel.cpp');
  const d = join(dir, 'src/dsp/gain.cpp');
  const bash = (command: string, act?: () => void): Step => ({ event: 'Bash', tool: 'Bash', input: { command, description: 'step' }, ...(act ? { act } : {}) });
  const replace = (file: string, from: string, to: string) => (): void => writeFileSync(file, readFileSync(file, 'utf8').replace(from, to));
  const commitCmd = 'git commit -m "a drive knob and a louder gain" -- src/ui/panel.cpp src/dsp/gain.cpp';
  return [
    { event: 'UserPromptSubmit', tool: '-', input: {} },
    { event: 'Read', tool: 'Read', input: { file_path: p } },
    bash('grep -n Knob src/ui/panel.cpp'),
    { event: 'Read', tool: 'Read', input: { file_path: d } },
    bash('ls src/ui src/dsp'),
    { event: 'Edit', tool: 'Edit', input: { file_path: p, old_string: '  Knob resonance;\n', new_string: '  Knob resonance;\n  Knob drive;\n' },
      act: replace(p, '  Knob resonance;\n', '  Knob resonance;\n  Knob drive;\n') },
    { event: 'Edit', tool: 'Edit', input: { file_path: d, old_string: 'x * 0.5f', new_string: 'x * 0.75f' }, act: replace(d, 'x * 0.5f', 'x * 0.75f') },
    bash('git diff --stat'),
    bash('git status --short'),
    bash('git add src/ui/panel.cpp src/dsp/gain.cpp', () => gitIn(dir, 'add', 'src/ui/panel.cpp', 'src/dsp/gain.cpp')),
    bash(commitCmd, () => gitIn(dir, 'commit', '-q', '-m', 'a drive knob and a louder gain', '--', 'src/ui/panel.cpp', 'src/dsp/gain.cpp')),
    { event: 'Stop', tool: '-', input: {} },
  ];
}

let refusals: string[] = [];
const stderrs: string[] = [];

/** The stdin JSON of an event as Claude Code sends it. */
function payloadOf(dir: string, name: string, phase: string, s: Step): string {
  const head = { session_id: 'feature', cwd: dir, hook_event_name: name };
  if (s.tool === '-') return toJson({ ...head, prompt: 'add a drive knob to the panel and raise the gain', stop_hook_active: false });
  const response = phase === 'PostToolUse' ? { tool_response: { success: true } } : {};
  return toJson({ ...head, tool_name: s.tool, tool_input: s.input, ...response });
}

/** Every blocking entry of the settings for an event of a tool, run at once; resolves with the wall and the worst exit. */
function show(dir: string, phase: string, s: Step, env: NodeJS.ProcessEnv): Promise<{ ms: number; code: number }> {
  const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')) as { hooks: Record<string, Entry[]> };
  const name = s.tool === '-' ? s.event : phase;
  const entries = (settings.hooks[name] ?? []).filter((e) => e.matcher === undefined || e.matcher === '*' || new RegExp(`^(?:${e.matcher})$`).test(s.tool));
  const payload = payloadOf(dir, name, phase, s);
  const started = performance.now();
  const commands = entries.flatMap((e) => e.hooks.filter((h) => !h.async).map((h) => h.command));
  return Promise.all(commands.map((command) => new Promise<number>((done) => {
    const c = spawn('sh', ['-c', command], { cwd: dir, env, stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    c.stderr.on('data', (b: Buffer) => { err += b.toString(); });
    c.on('close', (code) => { if (code !== 0) stderrs.push(`${code}: ${err.slice(0, 160)}`); if (code === 2) refusals.push(`${phase} ${s.tool} ${JSON.stringify(s.input).slice(0, 60)}: ${err.trim().slice(0, 200)}`); done(code ?? 0); });
    c.stdin.end(payload);
  }))).then((codes) => ({ ms: performance.now() - started, code: Math.max(0, ...codes) }));
}

const results: object[] = [];
for (let n = 0; n < runs; n += 1) {
  const dir = `${dir0}.run${n}`;
  rmSync(dir, { recursive: true, force: true });
  cpSync(dir0, dir, { recursive: true });
  plant(dir);
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: dir, ...extra };
  refusals = [];
  const load = loadavg().map((x) => x.toFixed(2)).join(' ');
  const per: { step: string; preMs: number; postMs: number; codes: string }[] = [];
  const t0 = performance.now();
  for (const s of steps(dir)) {
    const hasPost = s.tool !== '-';
    const pre = await show(dir, 'PreToolUse', s, env);
    s.act?.();
    const post = hasPost ? await show(dir, 'PostToolUse', s, env) : { ms: 0, code: 0 };
    const what = s.tool === 'Bash' ? String((s.input as { command: string }).command).slice(0, 30) : '';
    per.push({ step: `${s.event} ${what}`.trim(), preMs: Math.round(pre.ms), postMs: Math.round(post.ms), codes: `${pre.code}/${post.code}` });
  }
  const hookWaitMs = per.reduce((a, r) => a + r.preMs + r.postMs, 0);
  results.push({ run: n, load, endToEndMs: Math.round(performance.now() - t0), hookWaitMs, refusals, per });
  if (n === 0 && stderrs.length > 0) console.log(`non-zero exits in run 0: ${stderrs.slice(0, 3).join(' | ')}`);
  console.log(`run ${n}: hook wait ${hookWaitMs} ms, end to end ${Math.round(performance.now() - t0)} ms, ${refusals.length} refusals, load ${load}`);
  rmSync(dir, { recursive: true, force: true });
}
writeFileSync(out, toJson(results));
