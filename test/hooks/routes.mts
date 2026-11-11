// WB-69: close the route, not just the brief. Every guard that refuses a write refuses it by EVERY tool that can write: Write, Edit,
// MultiEdit, NotebookEdit, and the shell (>, >>, tee, sed -i, cp, mv, a heredoc into a file, an inline program). A hook's test file
// calls `unrefused` once per guard: it tries each route against a file the guard must refuse, and returns the routes that got through.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { put, scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { withLayout } from '../fixtures/installs.mts';
import { writeFileSync } from '../kit-cli.mts';
import type { Payload } from '../kit-cli.mts';
import { extraFixture } from './hook-rig.mts';

export const ROUTES = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash >', 'Bash >>', 'Bash tee', 'Bash sed -i', 'Bash cp', 'Bash mv', 'Bash heredoc', 'Bash program'] as const;
export type Route = (typeof ROUTES)[number];

const sedSafe = (s: string): string => s.replace(/[\\|&]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
const shell = (command: string): Payload => ({ tool_name: 'Bash', tool_input: { command } });

// The payload of one route. The target holds `existing` (with the word PLACEHOLDER in it); a route that replaces the file writes
// `full` (existing with PLACEHOLDER replaced by `bad`), one that edits or appends adds `bad`.
function payloadOf(route: Route, target: string, existing: string, bad: string, scratch: string): Payload {
  const full = existing.replace('PLACEHOLDER', bad);
  const src = join(scratch, `src-${route.replace(/\W/g, '')}.txt`);
  writeFileSync(src, route === 'Bash >>' ? bad : full);
  const edits = [{ old_string: 'PLACEHOLDER', new_string: bad }];
  switch (route) {
    case 'Write': return { tool_name: 'Write', tool_input: { file_path: target, content: full } };
    case 'Edit': return { tool_name: 'Edit', tool_input: { file_path: target, ...edits[0] } };
    case 'MultiEdit': return { tool_name: 'MultiEdit', tool_input: { file_path: target, edits } };
    case 'NotebookEdit': return { tool_name: 'NotebookEdit', tool_input: { notebook_path: target, new_source: bad, edit_mode: 'insert' } };
    case 'Bash >': return shell(`cat '${src}' > '${target}'`);
    case 'Bash >>': return shell(`cat '${src}' >> '${target}'`);
    case 'Bash tee': return shell(`cat '${src}' | tee '${target}' > /dev/null`);
    case 'Bash sed -i': return shell(`sed -i 's|PLACEHOLDER|${sedSafe(bad)}|' '${target}'`);
    case 'Bash cp': return shell(`cp '${src}' '${target}'`);
    case 'Bash mv': return shell(`mv '${src}' '${target}'`);
    case 'Bash heredoc': return shell(`cat > '${target}' <<'EOF'\n${full}${full.endsWith('\n') ? '' : '\n'}EOF`);
    // KWB-8: an inline program that writes the file (a JSON string is a python string literal)
    case 'Bash program': return shell(`python3 - <<'EOF'\nopen(${JSON.stringify(target)}, 'w').write(${JSON.stringify(full)})\nEOF`);
  }
}

/** The project the route tests share: the three synth packs, and a copy tree in its layout. A copy of the run's install. */
export function routeProject(): string {
  const dir = extraFixture('routes', ['audio-core', 'gpu-painter', 'stellix']);
  withLayout(dir, (layout) => ({ folders: { ...(layout.folders as Record<string, unknown>), engines_copy: { path: 'src/engines/copied', kind: 'copy', purpose: 'a copy tree' } } }));
  return dir;
}

export interface RouteOptions {
  routes?: readonly Route[];
  before?: (target: string, landed: string) => void;
  /** the hook's own path, when it is not one of the project's (a global hook) */
  run?: string;
}

/** Fires `hook` once per route at `rel` in `dir`; returns the routes that were NOT refused. `existing` null: the file does not exist. */
export function unrefused(dir: string, hook: string | null, rel: string, existing: string | null, bad: string, { routes = ROUTES, before = () => {}, run }: RouteOptions = {}): string[] {
  const scratch = scratchDir('cpr-src-');
  const target = join(dir, rel);
  const missed: string[] = [];
  for (const route of routes) {
    if (existing === null) put(join(dir, '.keep'), ''); else put(target, existing);
    before(target, (existing ?? 'PLACEHOLDER').replace('PLACEHOLDER', bad));
    const payload = { ...payloadOf(route, target, existing ?? 'PLACEHOLDER', bad, scratch), hook_event_name: 'PreToolUse', cwd: dir };
    const exe = run ?? join(dir, '.claude/hooks', hook ?? '');
    const r = spawnSync(exe.endsWith('.py') ? 'python3' : 'node', [exe], { cwd: dir, input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: dir } });
    if (r.status !== 2) missed.push(`${route} (exit ${r.status}${r.stderr ? `: ${r.stderr.split('\n')[0]}` : ''})`);
  }
  return missed;
}
