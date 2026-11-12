---
# concepts: compose
paths:
  - "placeholder"
---

# Compose files are written for Swarm from day one

Compose and Swarm read the same file and interpret it differently, and Swarm fails **silently**: `docker stack deploy` skips `build`, `container_name`, `depends_on`, `links`, `restart`, `network_mode`, `cap_add`, `devices`, `tmpfs`, `extra_hosts`, `sysctls`, `security_opt` with no error.

<constraints>
Always do:
- `init: true` on every service: tini as PID 1 forwards signals and reaps zombies. The one always missed (`compose-service-needs-init`).
- `stop_grace_period` at least as long as the app's shutdown hard timeout (`process-lifecycle`); default is 10 s.
- `deploy:` block on every service: `replicas`, `resources.limits` **and** `resources.reservations`, `restart_policy: { condition: on-failure }`, `update_config: { order: start-first, failure_action: rollback }`, `rollback_config`, paired with a `healthcheck` that has a `start_period`.
- Connect by service name (`mongodb://mongo:27017`), never by IP: container IPs change on every restart, scale and update.
- Named volumes, never host bind mounts for app data; `overlay` networks, not `bridge`.
- Publish the container port only and let the routing mesh assign; a MongoDB replica set publishes 27017 with `mode: host`, pinned per node with placement labels.
- Env with defaults: `image: registry/app:${BUILD_VERSION:-latest}`. Secrets through `secrets:`, non-sensitive files through `configs:`.
- The app retries its dependencies with backoff: there is no `depends_on` on Swarm.

Never do:
- `restart:` (Swarm ignores it; use `deploy.restart_policy`), `container_name:`, `depends_on:`, `links:`, `network_mode:` (`compose-no-swarm-ignored-keys`).
- A hardcoded IP or `ipv4_address`.
- `exit(0)` on a crash in the app: `restart_policy: on-failure` only restarts non-zero.
</constraints>

## Check
Lesson checks for this rule: `compose-no-hardcoded-ip`, `compose-no-host-bind-for-data`, `compose-no-plaintext-secret`, `compose-no-swarm-ignored-keys`, `compose-overlay-not-bridge`, `compose-service-needs-healthcheck`, `compose-service-needs-init`.
