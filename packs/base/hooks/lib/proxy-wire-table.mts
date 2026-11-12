// proxy-wire-table: the one table of what the Go client and the resident runner share (typescript order W10b finding 1): the protocol
// and its limits, the names of the daemon's files, the environment names, the flags a daemon is started with, the project's lock file
// and the columns of hooks.log. TypeScript reads it here; `scripts/wire-gen.mts` writes it out as `proxy/wire_gen.go`, so Go reads
// the same numbers and names. A value that two files need is changed here and nowhere else (test/unit/lib/wire-owner.test.mts holds it:
// it is red on a second copy of any value below, and on a `wire_gen.go` that is not this table's rendering). Pure data, no imports.
export const WIRE = {
  protocol: 1,
  /** A request whose stdin is longer than this is judged by the TypeScript runner, not held in the daemon's memory (review-2 1.9). */
  maxStdin: 64 * 1024 * 1024,
  maxHeader: 1024 * 1024,
  maxReply: 64 * 1024 * 1024,
  /** macOS's sun_path is 104 bytes and Linux's 108: past this the socket lives under /tmp (review-2 3.11). */
  maxSocketPath: 100,
  /** The first word of the daemon's key, and the name of the cache folder under the cache root. */
  name: 'claude-packs',
  /** `/tmp/claude-packs-<uid>`: where the daemon's files go when the socket's path would be over the limit. */
  tmpPrefix: 'claude-packs-',
  suffix: { socket: '.sock', pid: '.pid', lock: '.lock' },
  logPrefix: 'daemon-',
  logSuffix: '.log',
  env: { cache: 'CLAUDE_PACKS_CACHE', runtime: 'XDG_RUNTIME_DIR', project: 'CLAUDE_PROJECT_DIR', daemon: 'CLAUDE_PACKS_DAEMON', home: 'HOME', path: 'PATH' },
  /** What a detached daemon (and the client that starts one) carries of the caller's environment, and nothing else. */
  daemonKeeps: ['HOME', 'PATH', 'CLAUDE_PACKS_CACHE', 'XDG_RUNTIME_DIR'],
  /** What the daemon's sampler child carries. */
  samplerKeeps: ['HOME', 'PATH'],
  /** The project's install lock, whose hash names the daemon. */
  lockFile: '.claude/claude-packs.lock.json',
  /** The pipe a starting client reads the daemon's first word on. */
  readyFd: 3,
  flag: { serve: '--serve', hooks: '--hooks', readyFd: '--ready-fd', proxy: '--proxy' },
  /** hooks.log: its file, the order of a line's columns, those a line may leave off (`source` given, they follow), and the client's own values. */
  hooksLog: {
    file: 'hooks.log',
    columns: ['time', 'event', 'hook', 'ms', 'code', 'tool', 'queue', 'source'],
    optional: ['queue', 'source'],
    empty: '-',
    proxyHook: 'proxy',
    proxySource: 'proxy',
  },
} as const;
