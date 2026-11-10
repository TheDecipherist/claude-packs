---
# concepts: cpp, js, notes, tooling
---

# Say whether this is a reproduction or an original: the laws differ

<constraints>
Declare it in layout.json: `"guards": { "instrument": { "kind": "reproduction" } }`, or `"original"`.

Always do:
- On a reproduction, the machine is the spec. Its naive saw, its aliasing and its linear pan are the instrument, each with a `[FW]`, `[SCH]` or `[MAN]` source.
- On an original, the law is good engineering: band-limited, click-free, and yours to design.
- Default a control the original lacks to "does nothing": a wet/dry at 0.5 once made every preset half wet.

Never do:
- Invent a global control on a reproduction. It rewrites every preset.
- Copy the machine's artwork, unless the brief asks for it and `"guards": { "instrument": { "artwork": "verbatim" } }` says so. By default a reproduction has the same sections, positions and labels, drawn your own way. With `"artwork": "verbatim"` the picture is the spec, and whoever ships it decides whether they may: log that as an open question.
</constraints>
