---
paths:
  - "**/*.ts"
  - "**/*.go"
  - "**/*.mjs"
---

# Root on someone else's machine: verify, keep secrets off the command line, replace atomically

<constraints>
Always do:
- Sign updates, verify before writing, swap by rename, and keep the last good version.
- Pass secrets through stdin, a file with tight permissions, or the environment of the one process.
- Make temp files with `mkdtemp`.
- Verify SSH host keys.
- Write a system file to a temp path, validate it, then rename it over the old one.
- Revoke the old key only after the new one is proven.
- Escape every value written into another program's config, with an escaper for that format.

Never do:
- Make an integrity check optional.
- Pipe a download into a shell, in a script or in a string a program builds.
- Build a path from a parameter without checking it stays in its folder.
</constraints>

## Check
`integrity-check-optional`, `secret-on-argv`, `tmp-path-predictable`, `ssh-verifies-host-key`, `system-file-written-in-place`, `file-path-from-param`, `quoted-value-into-config`.
