---
# concepts: dockerfile
paths:
  - "placeholder"
---

# Node is PID 1 in exec form, with init, or it never hears SIGTERM

<constraints>
Always do:
- `ENTRYPOINT ["node", "dist/index.js"]` / `CMD [...]`: exec form, a JSON array. Shell form runs `sh -c`, so `sh` is PID 1, swallows SIGTERM, and the app never shuts down cleanly or reports its exit code.
- `init: true` in compose (or `docker run --init`) so zombies are reaped and signals forwarded.
- `STOPSIGNAL SIGTERM` and a `stop_grace_period` at least as long as the app's shutdown hard timeout (`process-lifecycle`).
- Run as a non-root `USER`; copy `package.json` + lockfile first and `npm ci --omit=dev` before copying source, so the dependency layer caches.

Never do:
- `CMD node dist/index.js` or `CMD npm start` (shell form, and npm adds a second process between Docker and Node). The `docker-exec-form` check refuses shell form.
- Secrets in `ENV` or build args; they land in the image history.
</constraints>

## Check
Lesson check for this rule: `docker-exec-form`.
