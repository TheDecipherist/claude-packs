---
paths:
  - ".github/workflows/**"
---

# CI builds and tests every language the repo ships, with pinned tools and stated permissions

<constraints>
Always do:
- Run a build and the tests for every language in the repo, and build the images.
- Pin actions and tools to a version.
- State `permissions:` at the top of each workflow, as narrow as it needs.

Never do:
- Use `version: latest` for a tool.
- Treat a language CI never runs as tested.
</constraints>

## Check
`ci-tools-pinned`, `ci-permissions-stated`.
