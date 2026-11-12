# W10b item 4: an independent read of the daemon, the proxy and the sampler

Read on branch `work/2.0.0-ts-w10b-review` (from `origin/work/2.0.0-typescript`): `packs/base/hooks/resident.mts`, `resident/`,
`lib/proxy-wire.mts`, `lib/daemon-find.mts`, `lib/child-group.mts`, `lib/proxy-client.mts` (the TypeScript client, read because it
owns the other half of the wire), `proxy/*.go`, `scripts/build-proxy.mts`. Read-only; `go vet .` and `go test .` in `proxy/` are
green. The wave's other agents are changing the daemon's index start and git-guard; none of that is judged here.

**Findings: 22** (high 3, medium 11, low 8). Sizes: S a few lines, M one file or one table, L several files or a design change.

Answer to the brief's first question, in one line: there is **no** single owner across the two languages. `proxy-wire.mts` is the
TypeScript owner and `proxy/wire.go` copies it by hand; only the daemon key has a shared vector test (`proxy/main_test.go` carries
vectors made by `daemonKey`). Everything else the two languages need is written twice, and some of it three or four times.

## A. One owner per shared constant (TS and Go)

**1. [high, L] The wire and file-name constants are written in two languages, with a test for the key only.**
Files: `packs/base/hooks/lib/proxy-wire.mts` (`PROTOCOL`, `MAX_STDIN`, `MAX_REPLY`, `MAX_SOCKET_PATH`, `daemonKey` prefix `claude-packs`,
`daemonFiles` suffixes `.sock` and `.lock`, the `/tmp/claude-packs-<uid>` fallback, `cacheFolder`'s env names and per-platform
defaults), `proxy/wire.go` (`protocol`, `maxStdin`, `maxReply`, `maxSocketPath`, `daemonKey`, `cacheFolder`, `daemonFiles`), `proxy/daemon.go`
(`holderAlive` reads the lock file's `pid\n` format that `resident/lifecycle.mts takeStartLock` writes), `proxy/client.go` (`jobFor` reads
`.claude/claude-packs.lock.json`, the string `LOCK_FILE` in `resident.mts`; env names `CLAUDE_PROJECT_DIR`, `CLAUDE_PACKS_DAEMON`,
`HOME`, `PATH`, `CLAUDE_PACKS_CACHE`; the ready fd `3`; the daemon flags `--serve --hooks --ready-fd --proxy`).
Wrong: a change to one side (a new file suffix, a new limit, a changed `LOCK_FILE`) compiles and passes on both, and the two
disagree at run time: the client dials a socket the daemon never made and every event silently takes the slow TypeScript path
("hooks: slow path"). Only the key is pinned (two vectors).
Smallest fix: one table, `packs/base/hooks/lib/proxy-wire.json` (or a `WIRE` object exported by `proxy-wire.mts` and written out
by a generator step of `scripts/build-proxy.mts` as `proxy/wire_gen.go`, whose `sourceHash` already covers every `.go`): protocol,
limits, name prefix, suffixes, tmp folder pattern, env names, lock-file path, ready fd, flag names, the ready words. TS reads the
table, Go gets constants. Until then add a Go test that reads `proxy-wire.mts`'s exports (via `node -e` in the test) and compares each.

**2. [medium, S] `/tmp/claude-packs-<uid>` and `.sock` are written a third time in `lib/daemon-find.mts`.**
`daemonsOf` builds `join('/tmp', 'claude-packs-${uid}')` and `${state.key}.sock` itself instead of calling `daemonFiles`. Wrong: a
rename in `daemonFiles` leaves `daemon status|stop` and doctor looking in the old place. Fix: export one `socketFolders(host)` and
`socketOf(folder, key)` from `proxy-wire.mts` and use them; or read the socket path from the pid file (add `socket` to `DaemonState`,
which the daemon knows from `files.socket`). S.

**3. [medium, S] The binary cache folder is a second, different "cache folder".**
`lib/proxy-binary.mts cachedBinary`, `packs/base/hooks/bin/hook-proxy` (the `sh` picker) and `scripts/build-proxy.mts goCache` each
default to `~/.cache/claude-packs`, while `proxy-wire.mts cacheFolder` (and Go `cacheFolder`) give `~/Library/Caches/claude-packs` on macOS
and honour `XDG_RUNTIME_DIR`. Two folders for one product on the same Mac, and four hand-written defaults (the `sh` one cannot import).
Fix: decide that binaries and sockets share one root or are deliberately apart; if apart, say so in `proxy-wire.mts` and have
`cachedBinary` and `goCache` call one `binaryCache(env, home)` there. S.

**4. [medium, M] The hooks.log line is written by Go with its own format string.**
`proxy/daemon.go logWall` repeats `hook-log.mts hookLogLine` (tab layout, `proxy` hook and source, the `-` for empty, tab and newline
cleaning in `orDash`). A new column in `hookLogLine` makes the proxy's lines unreadable to `logs` and doctor's budgets. Only a test of
the rendered line (`main_test.go`) guards it. Fix: put the column list in the generated table (finding 1) or have the daemon write the
proxy's wall line from a field the client sends (it already logs `event` lines); then Go does not format the log at all. M.

**5. [medium, S] The "what a detached child carries of the environment" list exists three times.**
`resident/lifecycle.mts reexec` (`HOME PATH CLAUDE_PACKS_CACHE XDG_RUNTIME_DIR`), `lib/proxy-client.mts KEEP` (the same four),
`resident/sampling.mts launch` (`HOME PATH`) and Go `startDaemon` (`HOME PATH CLAUDE_PACKS_CACHE`, no `XDG_RUNTIME_DIR`). The Go one
drops `XDG_RUNTIME_DIR`, which is safe only because it also passes the cache folder it resolved. Fix: one `keepEnv(env, keys)` and one
exported `DAEMON_ENV` in `proxy-wire.mts`; three call sites. S.

**6. [low, S] `alive(pid)` has four owners with two behaviours.**
`resident/lifecycle.mts alive` and `lib/daemon-find.mts alive` (EPERM counts as alive; the second says it is "the one `alive` of the kit"),
`resident/selftest-rig.mts alive` (EPERM is dead), and Go `holderAlive` / sampler `syscall.Kill(pid,0) != nil` (EPERM is dead). Fix:
`lifecycle.mts` imports `alive` from `lib/daemon-find.mts` (it is a lib; `resident.mts` already imports `alive` from lifecycle, so re-export
once); the selftest imports it too. S.

**7. [medium, M] The daemon's own option list is parsed and re-serialised by hand, and re-exec loses flags.**
`resident.mts serveOptions` builds `again` (the re-exec argv) from a hand-picked subset: `--max-rss-mb`, `--recycle-after`, `--state-ms`,
`--sample-ms`, `--watchdog-ms`, `--test-ms` and `--hooks` defaults are not forwarded, so a re-exec after 24 hours or at 400 MB comes
back with defaults (a test's tuned daemon becomes a production one; a user's `--max-rss-mb` is forgotten). Also `--proxy` is read twice
(`const proxy` and `valueOf(argv,'--proxy')` in the literal). Fix: a flag table `[{flag, default, parse}]` read once, with `again` made
from the parsed values that were given on the command line (same table, no second list). M.

## B. Closed error paths

**8. [high, S] `serve` leaks the pool and the start lock, and never tells the client, when `listen` fails.**
`resident.mts serve`: `startPool` has started workers and `takeStartLock` holds the lock when `await listen(...)` runs. `listen` rejects on
`EADDRINUSE`, `EACCES`, or a path too long. The rejection unwinds `serve`; the top-level `await` makes the process exit non-zero with
workers alive until exit, the ready pipe never gets a word (the Go client waits its full `ready` time, then the next event starts another
daemon), and the lock stays until a later starter finds its holder dead. Fix: `try { listening = await listen(...) } catch (e) { log; await pool.close(); releaseStartLock; sayReady(fd, 'failed listen ...'); return 1 }`. S. Plant: bind the socket path to a directory.

**9. [high, S] `stop` can hang forever, and so can the process.**
`resident.mts serve` `stop`: `listening.close().then(() => pool.close()).then(...)` has no rejection handler and no timer. If
`pool.close` rejects (`worker.terminate()` rejecting) `done(0)` is never called; `ending` is already true, so every later signal is
ignored: the daemon neither exits nor serves (the socket is closed). Fix: `.catch(log).finally(...)` and a `setTimeout(() => process.exit(0), 5000).unref()` after `ending = true`. S.

**10. [medium, S] A connection that sends nothing, or a partial request, is never closed.**
`resident/socket.mts listen`: no socket timeout; the `open` set keeps it until `close()`. A client killed after `connect` (Claude's own
timeout kills the proxy mid-write) leaves half-open sockets if the OS does not deliver the close, and a stalled peer holds a
descriptor and its buffered chunks for the daemon's whole life. Fix: `c.setTimeout(REQUEST_MS, () => c.destroy())` with the
request's deadline once the header is decoded. S.

**11. [medium, S] Request and reply bytes are re-concatenated on every chunk (quadratic) in both directions.**
`resident/socket.mts` (`Buffer.concat(parts)` then `decodeRequest` per `data` event) and `lib/proxy-client.mts askDaemon`
(`Buffer.concat(chunks)` per chunk). A 64 MB stdin arrives in about a thousand 64 KB chunks: about 30 GB of copying on the daemon's
main thread, which also serves every other session. Fix: keep a running length and decode only when the 4-byte length prefix has been
read and `length >= 4 + n`; `decodeRequest`'s `readFrame` already knows the size, so return `need: n` and wait. S.

**12. [medium, S] `proxy-client.mts startDaemon` can report `failed` for a daemon that said `busy` or `ready`.**
It treats `child.on('exit')` as failure; the daemon writes its word to fd 3 and, for `busy`, exits 0 at once. `exit` can be delivered
before the pipe's `data`. A race the Go client does not have (it reads the pipe to EOF). Fix: finish on the pipe's `end`/`close` (and
let `exit` only set a flag read when the pipe closed with no word). S.

**13. [low, S] The start lock's stale takeover is not atomic.**
`resident/lifecycle.mts takeStartLock`: two starters both read a dead holder, A removes and creates the file, B (which had already read
the dead pid) removes A's new file and creates its own; both then run `listen`, the second `rmSync`s the first's socket, and the first
daemon is alive but unreachable until it idles out (15 min). Window is a few microseconds, so low. Fix: after `rmSync`, re-read the
holder before the next `wx`; or take over with `renameSync(file, file+'.'+pid)` (only one rename wins). S.

**14. [low, S] `child-group.mts killGroup` trusts a pid.**
`process.kill(-pid, 'SIGKILL')` with `pid` 0 or 1 or a negative signals the caller's own group or every process the user owns
(`-1`). The pids come from the worker's own `started` messages, but nothing checks them on the main thread. Fix: `if (!Number.isInteger(pid) || pid <= 1) return false`. S. Also: there is no TERM before KILL, and a SIGKILLed daemon leaves its hooks' groups for the
sampler's watchdog; say so in the file header (documented gap, not a fix).

**15. [medium, S] The Go client does not forward its death to the TypeScript child.**
`proxy/client.go runTypeScript`: `exec.Command` without a process group or a signal hook. When Claude kills the proxy at the entry's
timeout the `node run-hooks.mjs` child keeps running, together with its own hook children (the KWB-205 class, one level up). Fix:
`Setpgid: true`, `signal.Notify` for TERM/INT/HUP, and `syscall.Kill(-pid, SIGKILL)` on the signal (or `cmd.Cancel` with a
`CommandContext`). S.

**16. [low, S] `reexec` and `startSampling` leave spawn errors unhandled.**
`lifecycle.mts reexec`: `spawn(...).unref()` has no `'error'` listener; a failed re-exec emits an unhandled `'error'`, which the daemon's
`uncaughtException` handler logs and swallows, so a daemon at its limit has already closed its socket and now simply vanishes with no
successor. `sampling.mts launch` does attach one. Fix: `.on('error', log)` and, in `stop`, only close the socket after the successor has
started (or log that none did). S.

**17. [low, S] `build-proxy.mts buildOne` writes a fixed temp name.**
`<binary>.new` is shared by two concurrent `build-proxy` runs (`npm run build` in two worktrees of the shared cache is not the case, but
a test and a developer on the same checkout are); `go build -o` of both races and a half-written binary can be renamed into place. Also
`go build` has no timeout, and `goCache` has a pointless `join(` around one argument. Fix: `${final}.${process.pid}.new`; a kill timer. S.

## C. Global state outside the main thread's owners

**18. [medium, M] `usage` is a module singleton read by three places, written by one, and passed in a fourth way.**
`resident/usage.mts` exports `usage = new UsageStore()`; `sampling.mts` takes `store ?? usage`; `resident.mts snapshot` reads `usage.all()`
directly; `status.mts` reads it as `sampled` (default `usageOf`). `startSampling` accepts a store for tests but the daemon's own
`snapshot` and the status keeper ignore the one it was given, so a test with a private store sees an empty state file. Fix: build
the store in `serve`, give it to `startSampling`, `StatusKeeper` (`usageOf`) and `snapshot`. M.

**19. [low, S] `serve` installs process-wide handlers it never removes.**
`process.on('uncaughtException'|'unhandledRejection'|'SIGTERM'|'SIGINT'|'SIGHUP')` inside the `new Promise` of `serve`; a second `serve` in
one process (the selftests and `test/` call it) adds to the list (MaxListeners warning), and a swallowed `uncaughtException` leaves the
daemon running in an unknown state (the handler logs and continues). Fix: keep the handles and `off` them in `stop`; for
`uncaughtException`, count them and `stop('too many faults', true)` past a few. S.

**20. [low, S] `watch`'s timer is returned and never cleared; `ticker` and `watch` are two interval owners.**
`lifecycle.mts watch` returns the timer, `resident.mts` ignores it; after `stop` it ticks until exit (unref'd, so harmless, and
guarded by `ending`). Fix: clear it in `stop` with `ticker`. S.

## D. Other things a senior reviewer would stop at

**21. [medium, M] The Go sampler's macOS reader depends on raw syscall numbers and struct offsets.**
`proxy/sample_darwin.go`: `syscall.Syscall6(202 ...)`, `336`, `kinfoSize 648`, `offComm 243`, `offPpid 560`, `vnodeInfoSize 2352`.
These are private ABI: a macOS update that changes `kinfo_proc` or `proc_taskinfo` gives wrong numbers, not an error (a
`list()` error falls back to `ps`; a wrong offset does not). Fix: a startup check that compares the native reading of this very process (pid, ppid,
comm of `os.Getpid()`, `os.Getppid()`) with what Go knows, and falls back to `ps` when they differ; then log the OS version on a
mismatch. M.

**22. [low, S] Small items.**
- `proxy/sample.go runSample` checks `--exit-with` only after the tick, and a blocked `Encode` (the daemon not reading) is ended only by
  SIGPIPE; fine, but say it in the comment, and make the first check run before the first snapshot.
- `proxy/sample.go take` calls `memo(s.cwds ...)` and `memo(s.argv ...)` for every process in two loops; the second `isClaude` call
  recomputes what the first loop knew. Keep `claude` in the first loop's map. S.
- `resident/socket.mts answers` has no timeout on the probe `connect` (a wedged old daemon blocks the starting one forever, past the
  Go client's wait). Add `setTimeout(250)`.
- `proxy/selftest.go` (242 lines) ships inside the production binary; keep it (it is the proof) but build-tag it or say why it ships.
- `resident.mts` is the daemon's start, its flag parser, its serve loop and its tail (184 lines): `serve` is one 90-line closure with
  six pieces of mutable state (`counts`, `sampling`, `ending`, `ticker`, `listening`, `state`); extract `Daemon` as a class so `stop`
  has one owner (findings 8, 9, 19, 20 are the same function).

## What is sound

The frame is defined once per language and read whole (`readFrame`, `readReply`: a cut reply is never exit 0); the key has two shared
vectors; the socket folder is checked for owner and mode 700 on both sides; workers are bounded (`max`, `recycleAfter`, `idleMs`); every
pool path that drops a worker kills its groups; `close()` clears its timers; the state file is written by rename from the main thread
only; the Go sampler never sends a session's prompt (`Claude` flag only); `build-proxy` renames a new file over the signed one
instead of rewriting it.

## Order to fix them

1. Findings 8, 9, 10, 11, 15 (daemon and client robustness, all S).
2. Finding 1 with 2, 3, 4, 5 (one table, generated for Go; the largest, and it removes the class).
3. Findings 7, 18, 19, 20, 22's last item (the daemon's structure, one pass over `resident.mts`).
4. The rest.
