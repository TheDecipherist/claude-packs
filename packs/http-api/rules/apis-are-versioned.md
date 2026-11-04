---
# concepts: api
paths:
  - "placeholder"
---

# Every API is versioned from its first route, and a version never breaks

<constraints>
Always do:
- Serve every route under `/api/v<N>/` from the first line, with the prefix set once, where routes are mounted. That holds for an API only your own pages call: there is no good reason not to version one.
- Keep a published version additive: add optional fields and new routes only.
- Make a breaking change a new version: removing or renaming a field, changing a type, tightening validation, changing a status code or a default.
- Keep the old version working, marked with `Deprecation` and `Sunset` headers and a date, until its traffic is gone.
- Hold each version to a contract test that fails when a response shape changes.
- Point clients at one base URL constant.

Never do:
- Add an unversioned route "for now".
- Change what a published version returns, because a client you cannot see depends on it.
- Share a response schema between versions once they differ: the old one is frozen.

Left out on purpose: `/health`, auth callbacks and webhooks, whose paths belong to the platform or the provider.
</constraints>

## Check
`api-path-versioned`, `next-api-route-versioned`, `client-calls-a-version`. The `change-an-api` skill walks a change.
