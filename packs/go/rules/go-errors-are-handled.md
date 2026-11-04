---
paths:
  - "**/*.go"
---

# Every error is handled or returned, wrapped with what was being done

<constraints>
Always do:
- Return an error wrapped with `%w` and what was being attempted.
- Take `ctx context.Context` first in anything that does I/O, and honour it.
- Use the standard library or a maintained client for a protocol.
- Run `go vet` and `staticcheck` in CI.

Never do:
- Discard an error with `_` on a state change or a parse.
- Start a goroutine with no way to stop it.
- Write a function again in another package: `template-law` reads Go.
</constraints>

## Check
`go-unmarshal-error-ignored`, `go-exec-result-ignored`.
