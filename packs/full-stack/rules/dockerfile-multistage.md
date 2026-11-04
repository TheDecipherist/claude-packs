---
# concepts: docker
---
# The image is built in stages: dependencies and build, then a small runtime with production modules only

<constraints>
Always do:
- Build in a first stage (install, compile), and copy only the output and production dependencies into a slim final stage that runs as a non-root user.
- Pin the base images by version, and copy the lockfile before the source so the dependency layer caches.

Never do:
- Ship dev dependencies, the source tree, `.env` or the build tools in the final image.
</constraints>
