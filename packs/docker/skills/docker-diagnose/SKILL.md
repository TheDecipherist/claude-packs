---
name: docker-diagnose
description: Use when a container will not start, exits non-zero, is OOM-killed, cannot reach another service, a port conflicts, a build fails, an image is bloated, or Docker disk is full. Runs dockerdoctor and acts on its report.
---

# docker-diagnose

One thing: get the measured diagnosis from `dockerdoctor` (The Decipherist's own tool, 50 checks: 25 static, 25 runtime) and fix what it names. No guessing from the symptom.

<constraints>
Always do:
1. `npx dockerdoctor@latest --json > .claude/state/dockerdoctor.json` from the project root (Docker must be running for the runtime checks; static ones work without it). Check the current version with `latest-versions` once per session.
2. Read the JSON. Fix **errors** first, then warnings, in the order dockerdoctor lists them. Each result carries a `fixes[]` with a description and often code; apply the fix in the file it names.
3. Re-run until the error count is 0. Paste the before/after counts as the evidence line (`done-means-fresh-evidence`).
4. For a runtime finding (exit code, OOM, DNS, port conflict), quote the measured value dockerdoctor reports (the exit code, the memory limit, the resolved address) in the fix commit.

Never do:
- Edit the Dockerfile or compose file from the symptom before running dockerdoctor.
- Apply `--fix` blindly on a compose file that is deployed to Swarm; read each fix first.
- Disable a check instead of fixing the cause.
</constraints>

The static checks are also enforced at edit time by this pack's lesson checks (exec form, pinned base, USER, HEALTHCHECK, npm ci, layer order, secrets, init, swarm-ignored keys), so dockerdoctor should mostly report runtime findings here.
