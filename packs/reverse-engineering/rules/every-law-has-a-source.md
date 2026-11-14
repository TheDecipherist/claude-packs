---
# concepts: cpp, js, notes, tooling
paths:
  - "placeholder"
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
- Cite a `[PUB]` source by author and URL, date it, and prefer two independent ones before a finding is settled.
- Record where a transcribed table came from; when its source cannot be found or does not hold it, mark every dependent law `[ASSUMED]` and list a re-capture.
- Make a law's tag agree in every doc and header that names it, list the callers of each copy before calling one dead, and where the evidence points both ways record it OPEN with a table and name what would settle it.
- Treat a parts-list `[SCH]` row as naming a chip, no evidence of what the algorithm does; call a unit with one hard claim and the rest `[REF]` a scaffold, in every report that counts it as decoded.

Never do:
- Let a sourced fact launder a guess in the same formula.
- Tag a block you wrote yourself as firmware-exact. Say what it is: the right kind of effect, not a clone.
</constraints>

## Check
`ear-constant-tagged` refuses a constant tuned by ear with no `[EAR]` tag.
