---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# A save is a patch of changed paths, with a base version

<constraints>
Always do:
- Send only the changed paths, validated by a partial schema.
- Send the base version, and detect conflicts per field, so edits that do not overlap both land.
- Feed the audit diff from the patch.
- Make undo the inverse patch.
- Keep drafts and unsaved filters on the server per user, so they follow the user across devices.
- Keep only real session state in the browser, such as the open tab.

Never do:
- Save the whole document: the last writer wins, and silently undoes the other edit.
- Snapshot whole documents for undo: it gets too heavy, and then it gets turned off.
- Keep a draft in `localStorage`: it is a second, device-local truth.
</constraints>

## Check
`draft-on-the-server`.
