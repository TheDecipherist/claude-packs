---
# hook: time-guard.mjs
---
# Long work runs in the background, and a warning about time is acted on

<constraints>
Always do:
- Start anything over about two minutes as a background job with its output in a file; you are told when it ends. Do other work meanwhile.
- When `time-guard` says something is slow, look at it now: find what is running, say so, and stop it if it is not needed.
- Commit an agent's work when `time-guard` says it has gone unsaved.
- Give every shell-out to a browser or renderer a deadline, and check the artefact it should have made before believing its error.
- After each batch, list the calls that ran past five minutes, group them by kind and fix the cause (a test with no fast form, a cache that misses, a build of too much), not the one case.

Never do:
- Wait in a `sleep`, `until` or `pgrep` loop, or poll a job's output file.
- Start a second copy of a job that is still running, or start it again without reading why the first one ended.
- Treat a slow job as normal because the last one was slow too.
</constraints>
