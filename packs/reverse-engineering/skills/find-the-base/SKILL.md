---
name: find-the-base
description: Use when the load address of an image, a bank or a blob is unknown, when jump targets and strings do not line up, when a bank is relocated, mirrored or banked, or before any address in a listing is given a meaning.
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
8. Read an Intel-hex or update file's own load addresses before scoring anything. Where no start is known, scan the blob in three phases (windows, then alignment, then boundary) to find the code in it.

Never do:
- Report a base scored under recursive descent as proved.
- State a base without its margin, or without naming the space (`addresses-name-their-space`).
</constraints>
