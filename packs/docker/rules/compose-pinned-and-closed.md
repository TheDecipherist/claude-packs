---
paths:
  - "**/*compose*.yml"
  - "**/*compose*.yaml"
---

# Compose: images are pinned, and a database has auth

<constraints>
Always do:
- Pin every image to a version.
- Start a database with auth on, even on a private network.
- Make a health check test what the service needs.

Never do:
- Use `:latest`, or a major tag alone.
- Write a health route that always says ok.
</constraints>

## Check
`compose-image-pinned`, `compose-db-needs-auth`, `health-checks-nothing`.
