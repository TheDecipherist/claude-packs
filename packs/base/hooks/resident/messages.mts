// resident/messages: what the main thread and a worker say to each other (structured-clone safe: no functions).
import type { FileStatements } from '../lib/near-copies.mts';
import type { HookEvent, Layout } from '../lib/types.d.mts';

/** The context of an event as it crosses to a worker; the worker adds `log` and `candidates` to make a HookContext. */
export interface WireContext {
  projectDir: string;
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  sessionPid: number;
  now: number;
  layout: Layout;
}

export interface Job { hook: string; event: HookEvent; ctx: WireContext }
/** What one hook did: `{hook, ms, code}` and its words. `late` is set by the pool for a hook that answered after the reply. */
export interface Done { hook: string; ms: number; code: number; stdout: string; stderr: string }

/** `preload`: import every hook at start (the first workers of the pool); the others import a hook when first asked for it. */
export interface WorkerData { dir: string; hooks: readonly string[]; ext: string; preload?: boolean }

export type ToWorker =
  | { type: 'run'; id: number; job: Job }
  | { type: 'answer'; id: number; files: FileStatements[] };

export type FromWorker =
  | { type: 'ready'; failed: readonly string[]; loaded: readonly string[] }
  | { type: 'done'; id: number; done: Done }
  | { type: 'ask'; id: number; hashes: readonly string[] }
  | { type: 'group'; kind: 'started' | 'ended'; pid: number }
  | { type: 'log'; line: string };
