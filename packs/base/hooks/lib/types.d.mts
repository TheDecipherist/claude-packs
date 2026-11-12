// The shapes the kit shares, each defined once (typescript order W2.4; base-hooks survey section 5, cli-lib section 6). A shape
// one module owns is defined beside it and exported there (the git result in git-run.mts); everything shared is here, and a
// second definition of any of these is refused by the repo lint (gate 4). Only the lead edits this file.

import type { FileStatements } from './near-copies.mts';

// ---- The hook contract (Claude Code's hooks.md: stdin JSON, exit 0 or 2, stderr, JSON on stdout) ----

export type HookEventName = 'PreToolUse' | 'PostToolUse' | 'UserPromptSubmit' | 'Stop' | 'SubagentStop' | 'SessionStart' | 'SessionEnd' | 'Notification' | 'PreCompact';

/** What a Write, Edit, MultiEdit, NotebookEdit, Bash, Read, Agent or other tool call carries; every field optional, since a
 *  payload is outside data and is narrowed where it is read. */
export interface ToolInput {
  file_path?: string;
  content?: string;
  old_string?: string;
  new_string?: string;
  replace_all?: boolean;
  edits?: readonly { old_string: string; new_string: string; replace_all?: boolean }[];
  notebook_path?: string;
  new_source?: string;
  command?: string;
  description?: string;
  run_in_background?: boolean;
  prompt?: string;
  subagent_type?: string;
  model?: string;
  [field: string]: unknown;
}

/** One hook event, as Claude Code writes it on stdin. */
export interface HookEvent {
  hook_event_name?: HookEventName | string;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  permission_mode?: string;
  tool_name?: string;
  tool_input?: ToolInput;
  tool_response?: unknown;
  prompt?: string;
  source?: string;
  agent_id?: string;
  agent_type?: string;
  stop_hook_active?: boolean;
  last_assistant_message?: string;
  [field: string]: unknown;
}

/** What one hook says about one event: an exit code (2 refuses, anything else lets it through), what goes to stdout (JSON
 *  Claude Code reads, or plain context at SessionStart and UserPromptSubmit) and what goes to stderr (the refusal). */
export interface Verdict {
  code: number;
  stdout: string;
  stderr: string;
}

/** An environment: the event's, passed to whatever runs a child or reads a variable (never this process's own by default). */
export type Env = Readonly<Record<string, string | undefined>>;

/** A logger a hook or a command writes its lines through. */
export type Logger = (line: string) => void;

/** Everything a hook may know about the event beyond its payload, built per event from the caller's request (the runner's own
 *  process today, the proxy's request in the resident runner): never this process's env, folder or parent (review-2 8.1). */
export interface HookContext {
  /** The project the event belongs to: the caller's CLAUDE_PROJECT_DIR (the main checkout, also for a worktree agent). */
  projectDir: string;
  /** The folder the caller runs in (a worktree for a worktree agent). */
  cwd: string;
  /** The caller's environment. */
  env: Readonly<Record<string, string | undefined>>;
  /** The Claude Code process the event came from, for the hooks that walk its children (agents-held, time-guard). */
  sessionPid: number;
  /** The event's arrival, in ms since the epoch. */
  now: number;
  /** The project's layout, read for this event. */
  layout: Layout;
  log: Logger;
  /** In the resident runner only: the files that hold these statement hashes, asked of the index on the daemon's main thread. */
  candidates?: (hashes: readonly string[]) => Promise<FileStatements[]>;
}

/** A hook module's interface: judge one event, and say so. */
export type Hook = (event: HookEvent, ctx: HookContext) => Verdict | Promise<Verdict>;

/** A judge refuses and writes nothing, so judges run at once; a recorder writes and refuses nothing, so recorders run in turn. */
export type HookRole = 'judge' | 'recorder';

/** One row of the hook table an install generates from the packs' pack.json (`.claude/hooks/hooks.json`, W8.1). */
export interface HookTableRow {
  hook: string;
  events: readonly HookEventName[];
  matcher?: string;
  timeout?: number;
  async?: boolean;
  asyncRewake?: boolean;
  order?: number;
  role: HookRole;
}

/** One case of a selftest: its label, what the hook did, what it should have done. */
export type VerdictRow = readonly [label: string, got: number | boolean | string | null, want: number | boolean | string | null];

// ---- What a tool call writes (writes.mjs writesOf, shell-writes, program-writes) ----

export type WriteOp = 'write' | 'edit' | 'append' | 'copy' | 'move' | 'link' | 'truncate' | 'touch' | 'delete';

/** One file a tool call writes, by any route, with its text before and after (after is null when it cannot be known). */
export interface FileWrite {
  path: string;
  op: WriteOp;
  before: string | null;
  after: string | null;
}

// ---- The project's own files ----

export interface LayoutFolder { path: string; purpose?: string; kind?: string; planned?: boolean }
export interface LayoutKind { what?: string; in?: string; concepts?: readonly string[]; content?: boolean | string; files?: readonly string[]; extensions?: readonly string[] }
export interface Look { name: string; reference: string; code?: readonly string[]; report?: string }

/** `layout.json` `paramIds`: where param-id-lock reads parameter ids (its default is JUCE ParameterID literals). */
export interface ParamIdSettings { extensions?: string; patterns?: readonly string[] }

/** `layout.json` `guards`: each guard's own settings, every field optional (W10 review, finding 3; a key the kit does not name is
 *  the project's own). git's fields are git-guard's `GitGuards` (lib/remote-heads.mts), which stays its own for now. */
export interface LayoutGuards {
  git?: Readonly<Record<string, unknown>>;
  build?: { queue?: string };
  buildq?: { cores?: number };
  /** audio-core's smoothing law: the module (one glob or several), its namespace, the judged scope; `off` gives the reason there is none. */
  smoothing?: { module?: string | readonly string[]; scope?: string | readonly string[]; namespace?: string; off?: string };
  codeShape?: { exclude?: readonly string[]; [limit: string]: unknown };
  /** Globs of published-text folders (content.mts `isContent`). */
  content?: readonly string[];
  logs?: { maxKb?: number };
  time?: { probePattern?: string; saveCommand?: string };
  images?: { guarded?: readonly string[]; allowed?: readonly string[] };
  watchdog?: { stop?: boolean };
  [guard: string]: unknown;
}

/** `.claude/layout.json`: the project's one source of truth for where things go. Keys the kit does not know are kept. */
export interface Layout {
  configuration?: string;
  complete?: boolean;
  folders: Record<string, LayoutFolder>;
  concepts: Record<string, readonly string[]>;
  kinds?: Record<string, LayoutKind>;
  files?: Record<string, string>;
  protected?: readonly string[];
  writeOnce?: readonly string[];
  disable?: readonly string[];
  enable?: readonly string[];
  commands?: Record<string, string>;
  siblings?: readonly string[];
  maxFileLines?: number;
  sourceFiles?: string;
  looks?: readonly Look[];
  paramIds?: ParamIdSettings;
  guards?: LayoutGuards;
  [key: string]: unknown;
}

/** `.claude/claude-packs.lock.json`: what the kit installed, with a hash per managed file. */
export interface Lock {
  kit: string;
  packs: readonly string[];
  installed?: readonly string[];
  sources?: Record<string, { url: string; commit?: string; ref?: string }>;   // by pack name (lib/sync, custom-packs)
  updated?: string;
  files: Record<string, string>;
}

/** One concept of `design/shape.json`: one thing, or many identical instances of one type. */
export interface ShapeConcept {
  shape: 'one' | 'many';
  count?: number;
  generator?: string;
  selectors?: readonly string[];
  constants?: Record<string, unknown>;
  owns?: readonly string[];
  symmetry?: Readonly<Record<string, unknown>>;   // members, swap, instances, first (tools/shape-symmetry reads it)
  [key: string]: unknown;
}

/** `design/shape.json`. */
export interface ShapeManifest {
  concepts: Record<string, ShapeConcept>;
  exclude?: readonly string[];
}

/** One settings.json hook command and the group it is in. */
export interface SettingsHook { type: 'command'; command: string; timeout?: number; async?: boolean; asyncRewake?: boolean }
export interface SettingsHookGroup { matcher?: string; hooks: SettingsHook[] }
export type SettingsHooks = Partial<Record<HookEventName, SettingsHookGroup[]>>;

/** A pack's `pack.json`, a manifest like a package.json (lib/pack-manifest.mjs checks it). */
export interface PackManifest {
  name: string;
  version: string;
  description: string;
  type: 'stock' | 'custom';
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  repository?: { type?: string; url: string };
  engines?: Record<string, string>;
  folders?: Record<string, LayoutFolder>;
  concepts?: Record<string, readonly string[]>;
  kinds?: Record<string, LayoutKind>;
  hooks?: SettingsHooks;
  optIn?: readonly string[];
  skillsIn?: string;
  /** Hooks that switch on even in a project that already has the pack (an update), named here by their file. */
  onByDefault?: readonly string[];
  requires?: readonly string[];
  /** The configurations the pack may join (W7: replaces the configurations' `choose` lists). */
  fits?: readonly string[];
  tests?: Record<string, readonly string[]>;
  [key: string]: unknown;
}

/** `configurations/<name>/config.json`: a kind of project as data. */
export interface Configuration {
  name?: string;
  description?: string;
  packs: { always: readonly string[]; choose: readonly string[]; default: readonly string[] };
  layout?: Partial<Layout>;
  sourceFiles?: string;
  /** The CLAUDE.md block's opening rules: the ones every project of the kind keeps, and the ones it never does. */
  preamble?: { always: readonly string[]; never: readonly string[] };
  /** Packs or files the configuration leaves out of what its packs would bring. */
  leaveOut?: readonly string[];
  [key: string]: unknown;
}

// ---- The installed modules the CLI imports from a project's own .claude/hooks at run time (no import() is `any`) ----

export interface InstalledLayoutModule {
  readLayout(root: string): Layout;
  codeFolders(layout: Layout): string[];
  globsForConcepts(layout: Layout, concepts: readonly string[]): string[];
}

export interface InstalledGlobModule {
  globToRegExp(glob: string): RegExp;
  matchesAny(relPath: string, globs: readonly string[]): boolean;
}

/** One line of `.claude/hooks.log` as `readHookLog` reads it: the code is the text the line holds (`-` when the hook said none). */
export interface HookLogLine { time: string; event: string; hook: string; ms: number; code: string; tool: string }
export interface InstalledHookLogModule {
  readHookLog(root: string, options?: { rotated?: boolean }): HookLogLine[];
}

export interface LessonCheck {
  id: string;
  why: string;
  rule?: string;
  globs?: readonly string[];
  concepts?: readonly string[];
  exclude?: readonly string[];
  pattern: string;
  mode?: 'forbid' | 'require' | 'needs';
  code?: boolean;
  strings?: boolean;
  language?: string;
  notInTests?: boolean;
  /** Forbid only in a file that is new (its text before the write is empty), never in an edit to an existing one (KWB-198). */
  newFilesOnly?: boolean;
  kind?: string;
  /** The check's file, once loaded from a pack or a project. */
  file?: string;
  bad: string;
  good: string;
  [key: string]: unknown;
}
export interface InstalledLessonChecksModule {
  selftest(checks: readonly LessonCheck[]): string[];
}
