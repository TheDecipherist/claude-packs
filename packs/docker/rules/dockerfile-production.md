---
# concepts: dockerfile
paths:
  - "placeholder"
---

# The image is small, pinned, non-root, and shuts down cleanly

<constraints>
Always do:
- Multi-stage: build in a stage with the compilers, `COPY --from=build` only the artifacts into a slim runtime (`node:<exact>-slim` or `-alpine`).
- Stable layers first: copy `package.json` + lockfile, `npm ci --omit=dev`, **then** copy source. A one-line code change must not reinstall every dependency.
- Pin the base image to an exact version (`node:24.11.0-slim`), checked with `latest-versions`. `no-latest-base` refuses `:latest` and an unpinned tag.
- `USER node` (or another non-root user) before the entrypoint (`dockerfile-needs-user`).
- `HEALTHCHECK` that verifies a real dependency, not a route that always returns 200; it is what makes rolling update and rollback work.
- `ENTRYPOINT ["node", "dist/index.js"]`: exec form, no `npm start` in between (`docker-exec-form`).
- One `RUN apt-get update && apt-get install -y --no-install-recommends … && rm -rf /var/lib/apt/lists/*`.
- A `.dockerignore` with `node_modules`, `.git`, `.env*`, `dist`, `coverage`, `.claude`.
- Logs to stdout/stderr only.

Never do:
- Secrets in `ENV` or `ARG`: they live in the layers and show in `docker history` (`no-secret-in-image`). Build-time secrets use `RUN --mount=type=secret`; runtime secrets use Docker secrets or env injected at run time.
- `COPY . .` before the dependency install.
- Run as root, use `:latest`, or write files inside the container that must survive a restart (named volume or object storage).
</constraints>
