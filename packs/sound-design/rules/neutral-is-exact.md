---
# concepts: engine-source
paths:
  - "placeholder"
---

# A control at its neutral computes exactly nothing

<constraints>
Always do:
- Make a control at its documented neutral compute exactly 1.0, or exactly 0.
- Make 0% wet come out dry, never silent: a mix is a crossfade.
- Start blank programs at neutral. A modulation byte of 0 can mean full negative depth.
- Fail on a blank extraction row: clamping it to zero rendered 66 presets silent.
- Check a stated default against a factory patch: it may be the displayed value, not the stored byte.
- Make each source's switch leave the other sources' level unchanged.

Never do:
- Leave a default that colours every preset: this is how a bank ends up "all sounding the same".
- Hash a value into the signal path to make voices differ.
</constraints>

## Check
`mix-is-a-crossfade` refuses a wet/dry mix that is not a crossfade, and `no-hash-in-the-signal` refuses a hash written into the signal path.
