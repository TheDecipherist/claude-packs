// What a hook's `--selftest` runs on: a throwaway project, the hook run the way Claude Code runs
// it (payload on stdin, CLAUDE_PROJECT_DIR set) and its exit code judged. Every hook proves its
// law this way, so nobody probes a hook by pasting payloads into a shell command, where a guard
// that judges command text can refuse the probe itself (Sub37 WB-4). doctor runs every selftest.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const made = [];

export const put = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
export const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.email=selftest@local', '-c', 'user.name=selftest', ...a], { cwd, stdio: 'ignore' });

// files: { "rel/path": "text" }; layout, when given, becomes .claude/layout.json.
export function scratchProject(files = {}, layout = null) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'cp-selftest-')));
  made.push(dir);
  if (layout) put(join(dir, '.claude/layout.json'), JSON.stringify(layout));
  for (const [rel, text] of Object.entries(files)) put(join(dir, rel), text);
  return dir;
}

export const runHook = (hook, dir, payload, args = []) =>
  spawnSync(process.execPath, [hook, ...args], {
    cwd: dir, input: payload ? JSON.stringify(payload) : '', encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  }).status;

export const writeOf = (file_path, content = '// new\n') => ({ tool_name: 'Write', tool_input: { file_path, content } });
export const editOf = (file_path, old_string = 'a', new_string = 'b') => ({ tool_name: 'Edit', tool_input: { file_path, old_string, new_string } });
export const bashOf = (command, cwd) => ({ tool_name: 'Bash', tool_input: { command }, ...(cwd ? { cwd } : {}) });

// cases: [label, actual, wanted]. Prints "<name> selftest: OK (n cases)" or each failure; exit code.
export function verdicts(name, cases) {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  const bad = cases.filter(([, got, want]) => got !== want);
  for (const [label, got, want] of bad) console.error(`${name} selftest FAILED: ${label} (got ${got}, wanted ${want})`);
  if (!bad.length) console.log(`${name} selftest: OK (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}
