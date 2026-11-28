---
name: spread-voices-over-cores
description: Use when one core cannot hold a synth's worst block (cpu-gate refuses, or the CPU benchmark is over budget on one thread), or when voices, chips or parts are to render on worker threads.
---

# Spread the voices over cores, inside the block (one job: a worker pool the audio thread never waits on for work nobody started)

The law is `voices-spread-over-cores`; the budget is `cpu-worst-case-per-block`'s; `cpu-gate` holds the landing to it. Read the rule first.

<constraints>
Always do:
- Measure one thread first, and the pool's best case from it, before building anything.
- Finish every block inside the block: the audio thread takes jobs too, and waits only on a job already started.
- Keep one path: zero workers runs the same jobs inline, in the same order.
- Prove it with the null test, ThreadSanitizer and a planted stalled worker, then write the CPU report with the pool's thread count.

Never do:
- Add latency, lock, sleep or wait on a condition variable on the audio thread.
- Start, stop or resize the pool from `processBlock`.
- Sum the outputs in the order jobs finished.
</constraints>

## 1. Measure what one thread costs, and what it is spent on

- The worst block on one thread, as the host runs it: the heaviest patch at full polyphony, 44.1 and 48 kHz, 64 and 128 samples. Write it to the CPU report with `"threads": 1`.
- The cost per part (one voice, one chip, one layer) and how many run at once in the worst case. The pool's best case is `worst / min(parts, workers + 1)`, plus the hand-out and the sum. If that is still over the budget, the pool alone does not settle it: say so, with the numbers.
- Cut thrown-away work first (`optimisations-are-null-tested`): a pool spreads a cost, it does not remove it.

## 2. Choose the job

A job is one part that depends on no other part for the whole block: a voice, a chip with its voices, a part with its voices. Its inputs (its events, the block's parameter snapshot) are set before the jobs start; its output is a buffer of its own. A shared stage after the parts (the effects, the mix) stays on the audio thread, after the sum. Name what each job owns, and what it only reads.

## 3. Build the pool

```cpp
// one per processor; made and sized in prepareToPlay, never in processBlock
struct VoicePool final {
    std::atomic<uint32_t> epoch { 0 };     // moves once a block: a release store wakes the spinning workers
    std::atomic<int> next { 0 };            // the next job to take, by everyone (workers and the audio thread)
    std::atomic<int> done { 0 };            // jobs finished this block
    int jobs = 0;
    // a semaphore for workers that went to sleep (post never blocks), the worker threads, each job's buffer
};
```

- **The block, on the audio thread:** write each job's inputs; `next = 0; done = 0;` then `epoch.fetch_add (1, release)` and post the semaphore once per sleeping worker. Then take jobs like a worker does: `for (int j; (j = next.fetch_add (1)) < jobs;) { run (j); done.fetch_add (1, release); }`. Then spin until `done.load (acquire) == jobs`, with a CPU pause (`_mm_pause`, `__builtin_arm_yield`); only jobs already started remain, so the wait is at most one job. Mark the spin `// rt-ok: worker-join`. Then sum the buffers in job order.
- **A worker:** wait for the epoch to move (spin a bounded while, then sleep on the semaphore), take jobs from `next` until it runs past `jobs`, mark each done, wait for the next epoch.
- **Threads:** `min(jobs, physical cores - 1, cap)`, started in `prepareToPlay` with `juce::Thread::startRealtimeThread` (or the platform's real-time priority), stopped in `releaseResources` and the destructor. With zero, the audio thread runs every job inline: one path.
- **The workgroup (macOS):** keep the host's `juce::AudioWorkgroup` from `audioWorkgroupContextChanged`, and have each worker join it (`workgroup.join (token)`) when it starts and again when the workgroup changes. Without it the OS may run a worker on an efficiency core and the pool is slower than one thread.
- **Every thread that renders** takes `juce::ScopedNoDenormals` (`scoped-no-denormals`).

## 4. Prove it

1. **Null test:** the same session (notes, program changes, the heaviest patch) through the pool at 1, 2 and every thread, and inline; the output bit for bit the same each time. Red first: plant a sum in finish order, and see it differ.
2. **ThreadSanitizer:** the null test in its own build (`-fsanitize=thread`), clean.
3. **Stalled worker (test build only, `cpp-faults-only-in-the-test-build`):** one worker held before it takes a job. The block still finishes, bit for bit the same, and its time is the jobs the others took.
4. **The CPU report:** the worst block with the pool as the host runs it, `"threads"` the pool's count, under the budget, then `cpu-gate` lets it land. Say in the report what the machine had (its cores, the host, the block size).

## 5. Say it

The order's cost ledger (`synth-cost`) gets the pool: the parts, the threads, the worst block before and after, measured, never estimated.
