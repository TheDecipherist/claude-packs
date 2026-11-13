---
# concepts: cpp, js, notes, tooling
---

# Say whether this is a reproduction or an original: the laws differ

<constraints>
Declare it in layout.json: `"guards": { "instrument": { "kind": "reproduction" } }`, or `"original"`.

Always do:
- On a reproduction, the machine is the spec. Its naive saw, its aliasing and its linear pan are the instrument, each with a `[FW]`, `[SCH]` or `[MAN]` source.
- On an original, the law is good engineering: band-limited, click-free, and yours to design.
- Keep a firmware table's anomaly as the machine has it, footnoted with its address, and with a test that pins it. A reproduction plays the machine's entry, not the formula's. No switch: a switch is a control the machine never had.
- Keep the faceplate to the machine's real controls. A control the machine lacks goes to our edit layer, labelled ours.
- Say in every file that touches a patch record that the record and the bank are ours when the machine has no patch memory. The factory sounds then exist only as printed charts, transcribed into a table.
- Build variants as one engine and a range table, never as separate code paths.
- Default a control the original lacks to "does nothing": a wet/dry at 0.5 once made every preset half wet.

Never do:
- Invent a global control on a reproduction. It rewrites every preset.
- Copy the machine's artwork, unless the brief asks for it and `"guards": { "instrument": { "artwork": "verbatim" } }` says so. By default a reproduction has the same sections, positions and labels, drawn your own way. With `"artwork": "verbatim"` the picture is the spec, and whoever ships it decides whether they may: log that as an open question.
</constraints>
