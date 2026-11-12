// resident/load-ask: `hook-proxy load ...` answered by the daemon (typescript order W8.8, item 0's 50 ms). A whole `claude-packs load ask`
// is a node start (about 70 ms here) before the governor says a word; the Go client asks the daemon over its socket instead, and the
// daemon runs the load tool's own verbs (`answerLoad`, loaded once) on the caller's environment, folder and parent. It is no event: no
// hook runs and the idle clock is left alone. A tool that cannot load replies `fallback`, and the client runs the tool itself.
import type { Incoming } from './socket.mts';
import type { Env, Verdict } from '../lib/types.d.mts';

/** The load tool's answer, as `tools/load.mts` exports it. */
interface LoadTool { answerLoad: (args: readonly string[], caller: { env: Env; cwd: string; ppid: number }) => Verdict }

let loaded: Promise<LoadTool> | null = null;

/** The words of a load ask (`{ load: [...] }` in the request's header), or null for any other request. */
export function loadWords(request: Incoming['request']): string[] | null {
  const words: unknown = request.load;
  return Array.isArray(words) && words.every((w) => typeof w === 'string') ? words : null;
}

/** Answers the ask with the tool at `tool` (imported on the first ask, then kept). */
export function serveLoad(incoming: Incoming, words: readonly string[], tool: URL): void {
  // the module is the load tool: its export is checked by the call below, which a failure turns into the fallback
  loaded ??= import(tool.href) as Promise<LoadTool>;
  const { env, cwd, ppid } = incoming.request;
  loaded.then((m) => incoming.reply(m.answerLoad(words, { env, cwd, ppid })))
    .catch(() => incoming.reply({ code: 0, stdout: '', stderr: '', fallback: 'ts' }));
}
