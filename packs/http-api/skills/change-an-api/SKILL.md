---
name: change-an-api
description: Use when changing what a route accepts or returns, when removing or renaming a field, or when a client needs something a published version does not give.
---

# Change an API (one job: no client that works today breaks)

<constraints>
Always do:
1. Decide if the change is additive: a new optional field, a new route, a new optional parameter. Additive goes in the current version.
2. Treat these as breaking: a field removed, renamed or changed in type; a new required input; tighter validation; another status code; another default.
3. For a breaking change, add `/api/v<N+1>/` beside the old version. Freeze the old schema, and copy nothing you can share through a handler.
4. Mark the old version with `Deprecation` and `Sunset` headers, and say when it goes in the changelog.
5. Update the contract test for the new version only. A failing old-version test means the change broke it.
6. Move the clients you own, then watch the old version's traffic before removing it.

Never do:
- Edit an old version's contract test to make it pass.
- Remove a version that still has traffic.
</constraints>
