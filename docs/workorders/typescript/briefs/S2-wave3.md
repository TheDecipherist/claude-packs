# Session 2, wave 3: four agents (W10b's review fixed in two halves, W10b's fuzzing and race, KWB-208 and KWB-210)

The order is `docs/workorders/typescript/workorder.md` (read W10b) and its `PROMPT.md`. The rules for every agent are those of
`briefs/S2-wave1.md`, section "Rules for every agent", with your own name and branch, word for word, plus: wait for a test run of
your own only by the run's own completion notice, or a blocking wait on its process (`caffeinate -w <pid>`); never end your turn
while a run of yours is going, since it is stopped with you.

The review is `docs/workorders/typescript/review/w10b-review.md` (22 findings; its own "Order to fix them" section). Each finding
you take is fixed with a test or selftest case seen red first where behaviour changes, or, where a fix is not worth its size, written
in your report with why it stays. Three agents of this wave edit the daemon and the proxy; keep to your own findings and files, and
say in your report every file you changed, so the lead can merge in turn.

## w10b-owners: findings 1 to 7 (section A: one owner per shared constant)

The shared constants of the wire and the file names get one source: a table that TypeScript reads and `scripts/build-proxy.mts`
writes out as `proxy/wire_gen.go` (covered by its source hash), with a check red on a planted second copy (W10b's Done when: "every
shared constant has one source (a check, red on a planted second copy)"). Then findings 2 to 7: daemon-find's socket path from the
owner, one cache folder (the binary cache and the sockets: decide and record the choice and its migration in your report), Go's
hooks.log line from the owner's format, one list of the environment a detached child keeps, `alive` with one owner, the daemon's
options parsed and re-serialised by one table so re-exec keeps every flag.

## w10b-paths: findings 8 to 20 (sections B and C: closed error paths, global state)

`serve` releasing the pool and the start lock and telling the client when `listen` fails; `stop` bounded by a timer with its
rejection handled; idle and partial connections closed after a deadline; request and reply bytes gathered once, not re-joined per
chunk; `startDaemon`'s busy and ready; the start lock's takeover made atomic; `killGroup`'s pid check; the Go client forwarding its
death to its TypeScript child; spawn errors handled in `reexec` and `startSampling`; `buildOne`'s temp name unique; `usage` passed by
its store, never a module singleton; process handlers removed on stop; one interval owner. Findings 8 and 9 (high) first.

## w10b-fuzz: W10b item 3 and finding 21

Go's native fuzzing of the client's frame reader and a TypeScript fuzz of `proxy-wire`'s parser (truncated frames, a length over
the cap, bad JSON, a zero length, 1 MB of garbage as seeds), 10 minutes each, 0 crashes and 0 hangs, every input answered by the
TypeScript path or a refusal and never exit 0 unjudged; the fuzz targets kept as tests with their seed corpus (a short run in the
suite, the 10-minute run measured once with its output in `build/evidence/W10b/`); `go test -race` over the client and the
sampler; `go vet` and `staticcheck` clean, `staticcheck`'s version pinned with its row in `docs/versions.md` (the
`latest-versions` skill: look up the current release); finding 21, the macOS sampler checking its raw syscall numbers and offsets
at start against one known process (itself) and falling back to `ps` with a logged reason when they disagree.

## kwb208-210: two hook faults from session 2

Read rows KWB-208 and KWB-210 in `workflow-bugs.md`. KWB-208: kit-fresh refuses a commit because a later-version work branch made
from this checkout's branch is "newer work" this checkout lacks; a work branch whose version is above this checkout's and which
contains this branch's commits up to its fork point (it was made from this branch) is the next work, never missing work. KWB-210:
no-polling (`packs/base/hooks/lib/polling.mts`) refuses `tail --pid=N -f /dev/null`, a blocking wait on one process; a wait on a
process (`tail --pid=N -f /dev/null`, `caffeinate -w N`, `wait N`) passes, while a `tail -f` on a file and any loop that sleeps
still refuse. Each with selftest cases red first and its worktree case green.
