---
# hook: file-size-guard.mjs
---
# Split a file as it nears the line limit, not at it

<constraints>
Always do:
- Check a source file's length before adding to it. Past about 250 lines of the 300 limit (`layout.maxFileLines`), put the new code in its own file, and move what belongs with it.
- Split by what the code does, so each file has one job and a name that says so.

Never do:
- Squeeze lines together, drop comments or shorten names to fit under the limit.
- Put new code into an unrelated file to get past the refusal.
</constraints>
