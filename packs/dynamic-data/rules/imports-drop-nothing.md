---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# An import drops nothing silently, and every run can be traced

<constraints>
Always do:
- Keep the field mapping as data: source, target, type, default, conditions, error policy.
- Quarantine a row that cannot map, with the raw input, the attempt, the error and the batch id. A notice clears itself when the data heals.
- Thread one batch id through every worker, log line and message.
- Write what a batch will do before doing it, so a run can be replayed.
- Guard invariants between systems: an external change to a settled record is quarantined, never applied.
- Take a lock for a run, and release it on every exit path.
- Rate limit third parties, and stop retrying what will keep failing.

Never do:
- Catch a mapping error and carry on with blanks.
- Hardcode a list of exceptions in a transform: an exemption is data with an audit trail.
- Build a query by string concatenation.
</constraints>
