// verdict: what a hook says about one event, built as a value and never written (typescript order W2.4, W4). A hook returns
// one of these from `hook(event, ctx)`; whoever called it (the runner, runAsHook, the resident runner) writes the streams and
// exits. Nothing here reads the process.
//   pass                  code 0, nothing said
//   refuse(reason)        code 2, the reason on stderr, ending in a newline (Claude Code shows stderr of an exit 2)
//   say(stdout)           code 0, output for Claude Code: a JSON object (a string, or any value, which is serialised) or plain context
import { toJson } from './json.mts';
import type { Verdict } from './types.d.mts';

/** The event passes and nothing is said. One frozen value: a caller reads it and never changes it. */
export const pass: Readonly<Verdict> = Object.freeze({ code: 0, stdout: '', stderr: '' });

/** The event is refused: exit 2, and the reason on stderr with its newline. */
export function refuse(reason: string): Verdict {
  return { code: 2, stdout: '', stderr: reason.endsWith('\n') ? reason : `${reason}\n` };
}

/** The event passes and Claude Code is given `output`: JSON text as it is, a value as JSON, plain text as it is. */
export function say(output: unknown): Verdict {
  return { code: 0, stdout: typeof output === 'string' ? output : toJson(output), stderr: '' };
}

/** True when `value` has the three fields of a Verdict (a hook that returns anything else crashed). */
export function isVerdict(value: unknown): value is Verdict {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === 'number' && typeof v.stdout === 'string' && typeof v.stderr === 'string';
}
