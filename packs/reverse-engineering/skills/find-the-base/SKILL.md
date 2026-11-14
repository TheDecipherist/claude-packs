---
name: find-the-base
description: Use when the load address of an image, bank or blob is unknown, when jump targets and strings do not line up, or when a bank is relocated, mirrored or banked.
---

# Find the base of an image (one job: prove where it is loaded, by a score with a stated margin)

A listing at the wrong base is as wrong as a wrong decoder and looks as right. The base is a score over candidates, kept with the runner-up's margin, and a score is only worth what it measures.

<constraints>
Always do:
1. Score a candidate by the share of call and jump targets that land on instruction starts, and of words that follow an RTS. Score it ONLY on a straight-through (linear) read, and say so in the result. Under recursive descent the score is self-fulfilling: the descent starts at the targets, so they are instruction starts by construction, and a random image scored 98.8 %.
2. Record the best base with the runner-up's margin. A base without a margin is a guess.
3. Score whether a region is code before scoring a base for it.
4. Look for what fixes the base outright: a pointer table into the blob, vector entries all in range, the reset routine's RAM clear, words that point back inside the file. Test pointer enrichment against bases shifted by 1, 2, 4 and 0x10.
5. Find the data base from long immediates that match known string offsets. A string-reference score alone is too forgiving.
6. Score every alias of a mirrored image. A map right over half a device is not verified: search the data half too.
7. For a relocated or banked image read the code that moves it: the reset path's copy loop first (record the ROM offset and the run address), or the OS routine that relocates a position-independent bank. Bank stubs at identical addresses whose first instruction switches away are stubs, not duplicates.
8. Read an Intel-hex or update file's own load addresses before scoring anything. Where no start is known, scan the blob in three phases (windows, then alignment, then boundary) to find the code in it. Score each window at each of the three byte phases by its undecodable fraction: equal scores at all phases mean padding or data, not code.
9. For a banked image, search operand addresses in the running (CPU) space as well as file offsets.
10. Score every candidate chip order by the share of targets on instruction starts, keep the margin, and read a chip that no call target reaches as data, whose order code flow cannot settle.
11. One EPROM can hold both records and code: classify by region within a chip, and test a part scored as code at one base as records too, by per-column entropy across strides. Zero call targets into a ROM the firmware merely reads says nothing.

Never do:
- Report a base scored under recursive descent as proved.
- State a base without its margin, or without naming the space (`addresses-name-their-space`).
</constraints>
