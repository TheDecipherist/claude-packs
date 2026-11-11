#!/usr/bin/env node
// The kit's status line (1.8.0; the user: "the statusline should be part of claude-packs because thats how users going forward
// will see everything thats working and where it is"). Claude Code runs it with the session as JSON on stdin and shows each
// printed line as a row; `base` wires it in .claude/settings.json (pack.json "statusLine") with refreshInterval 1, so it moves
// during a long tool call too.
//   line 1: the kit version this project runs (its lock, beside this tool), the model and effort, the context used, the 5h
//           and 7d quotas on a subscription or the session's cost on API billing
//   line 2: the branch, its uncommitted files, ahead and behind; the last tool and its target; the last shell command
//   then:   RUNS, every unattended work order on this machine, per project and per agent, each with a bar
// Every feed is best-effort: a missing or broken one draws nothing, and nothing here ever stops a render.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from '../hooks/lib/json.mjs';
import { checkoutVersion, lockVersion, packageVersion } from '../hooks/lib/kit-version.mjs';
import { bold, COLOURS as C, fitWidth, paintMode, painter } from './statusline-paint.mjs';
import { refreshRuns, runsSegments } from './statusline-runs.mjs';
import { contextSegment, modelSegment, sessionOf, usageSegments } from './statusline-session.mjs';
import { activitySegments, gitSegment, gitState, lastActivity } from './statusline-work.mjs';

const SELF = fileURLToPath(import.meta.url);
const SEPARATOR = ' | ';

/** The kit version the project runs (KWB-162, lib/kit-version.mjs): the installed package of the install this tool belongs to
 *  (.claude/tools, two folders up) or of the session's project; a tool run from the kit's own checkout (packs/base/tools) with no
 *  project reads the checkout's package.json; a lock only where no package is found. */
export function kitVersion(toolDir, projectDir) {
  const install = join(toolDir, '..', '..');
  return packageVersion(install) ?? packageVersion(projectDir) ?? checkoutVersion(join(toolDir, '..', '..', '..')) ??
    lockVersion(install) ?? lockVersion(projectDir);
}

/** Where the RUNS cache lives: the user's cache folder, shared by every project's bar. */
export const runsCache = (env) => join(env.XDG_CACHE_HOME || join(env.HOME || homedir(), '.cache'), 'claude-packs', 'runs.json');

/** The bar's lines for one render. */
export function statusBar(raw, { env = process.env, nowMs = Date.now(), toolDir = dirname(SELF), refresh = true, git = gitState } = {}) {
  const s = sessionOf(raw);
  const mode = paintMode(env);
  const paint = painter(mode);
  const version = kitVersion(toolDir, s.projectDir || env.CLAUDE_PROJECT_DIR);
  const pinned = readJson(join(env.CLAUDE_CONFIG_DIR || join(env.HOME || homedir(), '.claude'), 'settings.json'))?.model;
  const top = [version ? bold(paint(`claude-packs ${version}`, C.orange), mode) : '', modelSegment(s, typeof pinned === 'string' ? pinned : null, paint, C),
    contextSegment(s, paint, C), ...usageSegments(s, env, paint, C)];
  const cwd = s.cwd || env.CLAUDE_PROJECT_DIR || process.cwd();
  const second = [gitSegment(git(cwd), paint, C), ...activitySegments(lastActivity(s.transcript), paint, C)];
  const cache = runsCache(env);
  if (refresh) refreshRuns(cache, nowMs);
  const columns = Number.parseInt(env.COLUMNS ?? '', 10) || 0;
  return [top.filter(Boolean).join(SEPARATOR), second.filter(Boolean).join(SEPARATOR), ...runsSegments(cache, nowMs, paint, mode)]
    .filter(Boolean).map((line) => fitWidth(line, columns));
}

if (process.argv[1] === SELF) {
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { /* no stdin: a bar with what it can find */ }
  process.stdout.write(statusBar(raw).join('\n'));
}
