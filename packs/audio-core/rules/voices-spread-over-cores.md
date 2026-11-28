---
# concepts: audio, dsp
paths:
  - "placeholder"
---

# A machine one core cannot hold renders its voices on a worker pool, inside the block

A host gives each plugin instance one call per block on one thread. Whatever the plugin does not hand to threads of its own runs on one core, however many the machine has. One build translated a machine's twelve DSP chips into C++ and ran them one after another: a full chord took 87 to 92 % of one core's deadline against the 50 % budget, on a machine with ten cores idle (KWB-263).

<constraints>
Always do:
- Decide it by the measure, not by taste: when the worst block on one thread is over the budget (`cpu-worst-case-per-block`; `cpu-gate` refuses the landing) and the cost is in parts that do not depend on each other (voices, chips, parts, layers), render those parts on a worker pool. Cut thrown-away work first; a pool spreads a cost, it does not remove it.
- Finish the block inside the block: no latency added. The audio thread hands out the block's jobs, takes jobs itself from the same atomic counter, and waits only for a job a worker has already started. A job nobody has started is never waited on, so a late or descheduled worker costs one job, never the block.
- Start the workers off the audio thread (`prepareToPlay` or the constructor), as many as `min(jobs, physical cores - 1, the project's cap)`, at real-time priority (`juce::Thread::RealtimeOptions`), and join each to the host's audio workgroup where the platform has one (macOS: `AudioProcessor::audioWorkgroupContextChanged`, `juce::AudioWorkgroup::join`), so they run on performance cores beside the host's own thread.
- Wake the workers without blocking the audio thread: a release store of the block's epoch, and a semaphore post for workers asleep (a post never waits). Workers spin a short, bounded while on the epoch, then sleep on the semaphore.
- Give every job its own state and its own output buffer. Hand each job its events and the block's parameter snapshot before the epoch moves; the jobs share nothing writable.
- Sum the outputs on the audio thread in job order, so the output is bit for bit the same with any number of threads.
- Keep one path: zero workers runs the same jobs inline, in the same order. An offline render, a test and a machine with one core use it.
- Prove it, all three: a null test (the pool's render against the inline render, bit for bit, at 1, 2 and the full count of threads); ThreadSanitizer over that test in its own build; a planted stalled worker (test build only), with the block still finished and still bit for bit the same.
- Write the pool's thread count into the CPU report (`threads`), and measure the worst block with the pool as the host runs it.

Never do:
- Add a block of latency to buy the pool time, or drop a job that is late: the audio thread renders it itself.
- Lock, wait on a condition variable or sleep on the audio thread to join the workers. The only wait is a spin, with a CPU pause, on a job already running (`// rt-ok: worker-join`).
- Start, stop or resize the pool from `processBlock`.
- Let two jobs write one buffer, or sum in the order jobs happened to finish.
- Spread one voice's samples across threads: a job is a whole part for the whole block.
</constraints>

## Check
`cpu-gate` refuses the landing while the worst block is over the budget, and names this rule when the report says one thread. The pool's null test, its ThreadSanitizer build and its stalled-worker plant are the project's own gates. The `spread-voices-over-cores` skill builds it.
