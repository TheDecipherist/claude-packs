---
name: measure-tone
description: Use when an oscillator, shaper, HEAT/BIT stage, filter or effect is new or changed, or a sound is harsh, buzzy, metallic, thin or has DC.
---

# Measure a tone (one job: put numbers on how clean a sound path is)

<constraints>
Always do:
1. Render offline with the project's own render probe or test harness (CLAUDE.md, Project commands), not the live standalone: 2 s mono, 32-bit float WAV, 48 kHz.
   - Oscillators: f0 = 110, 1000, 2000 and 4186 Hz.
   - Nonlinear stages: sine probes at 1, 3, 5 and 7 kHz at the stated drive (add 10 kHz when rendering at 96 kHz).
   - DC check: 1 kHz sine with +0.3 offset into the stage.
2. For each file run `node .claude/tools/tone-report.mjs <wav> <f0> --max-freq 15000` with the threshold for that case:
   - oscillator: `--nonharm-max -60` up to 2 kHz, `-40` at 4186 Hz
   - nonlinear stage: `--snr-min 45`
   - DC: `--dc-max -80`
3. When a stage has a drive control, render one file per drive step, not one at the default. Measure asymmetry as a bias inside the gain stage (the DC the offset puts on its output), not by a separate offset after it.
4. A deliberate crusher or vintage mode is exempt from the aliasing thresholds. Compare it against its golden file instead.

Never do:
- Change code in this skill.
</constraints>

## Report
A table with columns Case, f0, Worst non-harmonic dB, SNR, THD, DC, and PASS/FAIL. For each FAIL, name the rule it breaks (`oscillators-bandlimited`, `nonlinear-stages-antialiased` or `dc-block-after-asymmetry`) and the likely fix. Don't change code in this skill.
