---
# concepts: world, build
paths:
  - "placeholder"
---

# The world gives bit-identical results on Mac and Windows

The world (travellers, hits, pushes, event samples) must replay identically on ARM64 and x86-64. Audio DSP only needs to be identical per platform.

<constraints>
Always do:
- Build world sources with `-ffp-contract=off` (clang and clang-cl) and `/fp:precise` without `/fp:contract` (MSVC). Clang fuses multiply-adds by default (`-ffp-contract=on`), and Apple clang on ARM64 emits `fmadd`.
- Use only `+ − × ÷ sqrt` in the world. IEEE-754 rounds those five exactly, so they match everywhere. Build `sin`, `cos`, `exp` and `pow` from the house polynomial versions (range reduction plus Horner) in one world-math file.
- Keep world state in fixed arrays ordered by stable ID, and break sort ties by ID.
- Keep time as integers: sample timestamps as `int64`, and the tick phase as an integer ratio (48 kHz/240 Hz is exactly 200 samples, but 44.1 kHz/240 Hz is 183.75, so accumulate the remainder exactly).
- Design out denormals in the world: snap magnitudes below 1e-30 to zero explicitly rather than relying on CPU flush modes, which differ between ARM and x86.
- Consider 64-bit fixed point (e.g. Q32.32) for positions. It removes compiler and flag risk entirely (house option, decided in the world plan).

Never do:
- Call libm (`std::sin`, `std::exp`, `std::pow`…) in world code. Apple libm, the MSVC UCRT and glibc differ in the last bits.
- Use `std::unordered_*` or iterate anything in hash order in the world.
- Use fast-math or FMA-contraction flags anywhere (`no-fast-math` check).
</constraints>

## Check
- `.claude/checks/world-no-libm.json` and `world-no-unordered.json` block libm calls and unordered containers in world code.
- Cross-platform gate: render N seconds from a saved state on both CI platforms. The world event log (event, sample index, payload hash) must be byte-identical between Mac and Windows; the audio hash must be identical between runs on each platform.
Lesson checks for this rule: `world-no-libm`, `world-no-unordered`.
