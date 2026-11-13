---
# concepts: cpp, js, notes, tooling
---

# Every law carries its source, and a guess is a debt

<constraints>
Always do:
- Tag each constant and law with its source on its line: `[FW]` firmware with an address, `[SCH]` a schematic, `[MAN]` a manual page, `[MIDI]` the spec, `[PUB]` a published source, `[COR]` the corpus, `[EAR]` fitted by ear. A law's tag says what it proves, so use these too:
  - `[DS]` a datasheet: cite the sheet's own symbol and page (`Vos`, `Ibias`), never a paraphrase. A clone's sheet names the clone, and says which part the entry describes.
  - `[REF]` a script's fit to a recording with published settings: weaker than a schematic, stronger than an ear, and kept apart from `[EAR]`.
  - `[EMU]` agreement with an emulator and nothing more: it confirms our reading of the firmware, never the hardware, and is never `[FW]`. Record where it disagrees with a published derivation; do not reconcile them.
  - `[SVC]` a service manual (page and sheet), `[DER]` derived from other tagged laws (name them), `[PHOTO]` read off a photograph.
  - `[ASSUMED]` a law not measured yet, a debt like `[EAR]` and listed in every output that used it; `[MEAS]` one measured.
- Keep one tag list: this one and the work-order template's tag line say the same.
- Keep every `[EAR]` value in a ledger, with a lead to what would close it.
- Replace an `[EAR]` value only with evidence. An ear will approve a wrong constant.
- Say which tags cannot exist on a machine: a chip whose program was never dumped can have no `[FW]`.
- Keep a list of non-negotiable constants, each with a test that fails if someone corrects it.
- Treat `[COR]` as weak where the corpus never varies the parameter: a value that never moved cannot confirm anything.
- Hold a law read from the host side alone as provisional until the code that consumes it is read.
- Say what the board did to compensate when a chip fact is about the hardware: the chip's figure is not the machine's.
- Say which is ours when one button name stands for two different features.

Never do:
- Let a sourced fact launder a guess in the same formula.
- Tag a block you wrote yourself as firmware-exact. Say what it is: the right kind of effect, not a clone.
</constraints>
