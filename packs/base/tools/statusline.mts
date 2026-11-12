#!/usr/bin/env node
// The kit's status line (1.8.0; the user: "the statusline should be part of claude-packs because thats how users going forward
// will see everything thats working and where it is"). Claude Code runs it with the session as JSON on stdin and shows each
// printed line as a row; `base` wires it in .claude/settings.json (pack.json "statusLine") with refreshInterval 5 (W8.4: each refresh
// is a node start, so it moves every five seconds during a long tool call), and says `hooks: slow path` when no daemon serves the hooks.
//   line 1: the kit version this project runs (its lock, beside this tool), the model and effort, the context used, the 5h
//           and 7d quotas on a subscription or the session's cost on API billing
//   line 2: the branch, its uncommitted files, ahead and behind; the last tool and its target; the last shell command
//   then:   RUNS, every unattended work order on this machine, per project and per agent, each with a bar
// Every feed is best-effort: a missing or broken one draws nothing, and nothing here ever stops a render.
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, readStdinText } from '../hooks/lib/hook-log.mts';
import { readJson } from '../hooks/lib/json.mts';
import { checkoutVersion, lockVersion, packageVersion } from '../hooks/lib/kit-version.mts';
import { residentSegment, residentState, type Resident } from './statusline-daemon.mts';
import { bold, COLOURS as C, fitWidth, paintMode, painter } from './statusline-paint.mts';
import { refreshRuns, runsSegments } from './statusline-runs.mts';
import { contextSegment, modelSegment, sessionOf, usageSegments } from './statusline-session.mts';
import { activitySegments, gitSegment, gitState, lastActivity } from './statusline-work.mts';
import type { GitState } from './statusline-work.mts';

const SELF = fileURLToPath(import.meta.url);
const SEPARATOR = ' | ';

import type { Env } from '../hooks/lib/types.d.mts';

/** The kit version the project runs (KWB-162, lib/kit-version.mjs): the installed package of the install this tool belongs to
 *  (.claude/tools, two folders up) or of the session's project, its lock where no package is installed; the kit's own checkout
 *  (packs/base/tools) reads its package.json only with no project of its own. */
export function kitVersion(toolDir: string, projectDir: string | undefined): string | null {
  const install = join(toolDir, '..', '..');
  // the project's own install first, package before lock; the kit checkout's own version last: only with no project, or in the
  // kit itself (KWB-165: before a project's lock, it showed the kit's version for another project's install)
  return packageVersion(install) ?? packageVersion(projectDir) ?? checkoutVersion(projectDir) ?? lockVersion(install) ?? lockVersion(projectDir) ??
    checkoutVersion(join(toolDir, '..', '..', '..'));
}

/** Where the RUNS cache lives: the user's cache folder, shared by every project's bar. */
export const runsCache = (env: Env): string => join(env.XDG_CACHE_HOME || join(env.HOME || homedir(), '.cache'), 'claude-packs', 'runs.json');

export interface StatusBarOptions {
  env?: Env;
  nowMs?: number;
  toolDir?: string;
  refresh?: boolean;
  /** The git state of a folder. */
  git?: (cwd: string) => GitState;
  /** Whether a daemon serves the project's hooks (statusline-daemon.mts asks it; the bar draws the marker when it is `down`). */
  resident?: Resident;
}

/** The bar's lines for one render. */
export function statusBar(raw: string, { env = process.env, nowMs = Date.now(), toolDir = dirname(SELF), refresh = true, git, resident = 'unused' }: StatusBarOptions = {}): string[] {
  const s = sessionOf(raw);
  const mode = paintMode(env);
  const paint = painter(mode);
  const version = kitVersion(toolDir, s.projectDir || env.CLAUDE_PROJECT_DIR);
  const pinned = readJson<{ model?: unknown }>(join(env.CLAUDE_CONFIG_DIR || join(env.HOME || homedir(), '.claude'), 'settings.json'))?.model;
  const top = [version ? bold(paint(`claude-packs ${version}`, C.orange), mode) : '', modelSegment(s, typeof pinned === 'string' ? pinned : null, paint, C),
    contextSegment(s, paint, C), ...usageSegments(s, env, paint, C), residentSegment(resident, paint, C)];
  const cwd = s.cwd || env.CLAUDE_PROJECT_DIR || process.cwd();
  const second = [gitSegment((git ?? ((dir) => gitState(dir, { env })))(cwd), paint, C), ...activitySegments(lastActivity(s.transcript), paint, C)];
  const cache = runsCache(env);
  if (refresh) refreshRuns(cache, nowMs);
  const columns = Number.parseInt(env.COLUMNS ?? '', 10) || 0;
  return [top.filter(Boolean).join(SEPARATOR), second.filter(Boolean).join(SEPARATOR), ...runsSegments(cache, nowMs, paint, mode)]
    .filter(Boolean).map((line) => fitWidth(line, columns));
}

if (isMain(import.meta.url)) {
  const raw = readStdinText(); // empty with no stdin: a bar with what it can find
  const project = sessionOf(raw).projectDir || process.env.CLAUDE_PROJECT_DIR;
  process.stdout.write(statusBar(raw, { resident: await residentState(project, process.env) }).join('\n'));
}
