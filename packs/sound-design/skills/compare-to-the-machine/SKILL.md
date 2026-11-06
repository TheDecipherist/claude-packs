---
name: compare-to-the-machine
description: Use when an engine's sound has to be checked against the real instrument, when a recording or video of the machine exists, or when asked whether a build sounds like the original.
---

# Compare with the real machine (one job: the same patch, set beside a recording of the real thing)

A rebuild is judged against the machine, never against another emulation. A plugin everyone praises may not sound like the original at all, so a recording of the real unit outranks it.

<constraints>
Always do:
1. Find a recording of the real machine: your own first, then a demo that plays it raw. Say which unit it is, and what the recording chain adds.
2. Take the audio, and keep it outside the repo. For a video: `yt-dlp -f bestaudio --no-playlist -o "<name>.%(ext)s" <url>`. Note its codec: lossy audio is no evidence near its top end.
3. Identify each sound from the machine's own display. Step through the video and write a timeline: time, patch number, patch name, page. Then look each name up in your banks.
4. Match by **name**, never by number alone. A unit's slots get overwritten, so the same number can be a different patch. A name at the same slot is the same patch; a number with no name proves nothing. A multi or combination's name is not the sound's: its voice fields say which single is playing.
5. Sort the timeline in two: same patch, for a direct comparison, and everything else, for character only. Compare singles: a multi holds per-voice settings you may not have.
6. Cut each same-patch section to its own file: `ffmpeg -ss <from> -to <to> -i <audio> -ar 48000 -c:a pcm_f32le <name>.wav`. Check it holds sound, and write down the cut points.
7. Render the same patch through your engine, with no effects unless the recording has them. Use `bounce-a-plugin` for anything that is a plugin. Find a clear held note in the recording, read its pitch, and play that note.
8. Level-match, then compare what a performance can show: the long-term spectrum, brightness over time, the attack of a clear note, the pitch of a held one, and the noise floor.
9. Prove the comparison can fail: a planted fault, such as a filter a third too low, has to show in the report.
10. Report the numbers as where to look, with the audio beside them, so a person can listen. The ear of someone who knows the machine is the verdict.
11. Tag what comes from this as a recording, never as firmware or schematic. Where it disagrees with firmware or a schematic, write that down and find out why: don't quietly choose.

Never do:
- Compare waveforms sample by sample, or give a percentage. A performance has its own levers, timing and edits, and the patch may have been changed while it played.
- Tune a constant until a recording fits, when the firmware or schematic says otherwise. The recording has a room, a chain and one unit's drift in it.
- Treat one unit as the machine. Every analog unit differs, and so do its voices.
- Commit a recording, a cut or a frame, or ship one. They are someone else's, and stay at a path outside the repo.
</constraints>

A timeline that works:

| Time | On the display | Bank at that slot | Use |
|---|---|---|---|
| 7:09 | S02 `2001` | `2001` | Same patch |
| 8:34 | S05, about `BIG-STR2` | `FOREIGNR` | Character |
| 12:03 | M05 `SOLOBASS` | Another multi | Character |
