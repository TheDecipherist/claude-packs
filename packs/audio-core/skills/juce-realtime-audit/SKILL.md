---
name: juce-realtime-audit
description: Use when a realtime-safety audit is due, after a crackle, dropout, xrun or CPU spike, or before merging changes to anything reachable from processBlock.
---

# Realtime audit (one job: find what the audio thread can reach that it must not)

The realtime-guard hook only sees the bodies of known audio functions. This audit follows the **call graph**, which is where most real violations hide.

<constraints>
Always do:
1. Find every audio-thread entry point: `processBlock`, `processBlockBypassed`, `renderNextBlock`, and any `[[clang::nonblocking]]` function.
2. From each one, follow every call into the project's own code (voices, oscillators, filters, effects, matrix, arp). Record the chain, e.g. `processBlock → Matrix::tick → Row::advance`.
3. In each reached function, look for what `.claude/rules/audio-thread-realtime-safe.md` and `audio-ui-thread-handoff.md` forbid. Also look for hidden allocations:
   - `juce::Array` / `std::vector` growth, `MidiBuffer::addEvent` past its reserved size, `AudioBuffer::setSize` / `makeCopyOf` without `avoidReallocating`
   - `std::function` assignment, lambdas capturing by value into containers, `shared_ptr` whose last reference drops on the audio thread
   - `ValueTree` reads or writes, `var`, `DynamicObject`
4. Stop at JUCE and std library calls. Judge them by the hidden-allocation list above rather than reading their source.

Never do:
- Change code in this skill: the report is the output.
</constraints>

## Report
A table with columns Severity, File:line, Call chain, What, Fix. Sort it with blocking or allocating calls first. End with the list of functions that should get `[[clang::nonblocking]]`, so the hook and RealtimeSanitizer cover them from now on.

Don't change code in this skill. The report is the output.
