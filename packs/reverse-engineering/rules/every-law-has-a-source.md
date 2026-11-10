---
# concepts: cpp, js, notes, tooling
---

# Every law carries its source, and a guess is a debt

<constraints>
Always do:
- Tag each constant and law with its source on its line: `[FW]` firmware with an address, `[SCH]` a schematic, `[MAN]` a manual page, `[MIDI]` the spec, `[PUB]` a published source, `[COR]` the corpus, `[EAR]` fitted by ear.
- Keep every `[EAR]` value in a ledger, with a lead to what would close it.
- Replace an `[EAR]` value only with evidence. An ear will approve a wrong constant.
- Say which tags cannot exist on a machine: a chip whose program was never dumped can have no `[FW]`.
- Keep a list of non-negotiable constants, each with a test that fails if someone corrects it.

Never do:
- Let a sourced fact launder a guess in the same formula.
- Tag a block you wrote yourself as firmware-exact. Say what it is: the right kind of effect, not a clone.
</constraints>
