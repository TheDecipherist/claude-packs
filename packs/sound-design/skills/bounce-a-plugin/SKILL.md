---
name: bounce-a-plugin
description: Use when audio is to be rendered from a VST3 with no DAW, when an engine is compared with a plugin or emulator, when a law is fitted against a plugin, or when a plugin will not load or plays silence.
---

# Bounce a plugin (one job: a known input through a plugin, and the audio out, repeatable)

`.claude/tools/vst3host/` is an offline VST3 renderer: no DAW, no audio device, no window, faster than real time. It does not link JUCE, on purpose: a JUCE host cannot load every JUCE plugin.

```
bash .claude/tools/vst3host/build.sh            # once, after the project's first configure; macOS and Linux
R=out/vst3host/render
$R --vst3 <plugin> --list                       # every parameter, with its id
$R --vst3 <plugin> --out a.wav --note 60 --vel 100 --hold 1.5 --tail 0.6
$R --vst3 <plugin> --param 12=0.75 --sweep 38:9 --dir out/   # one note per value of 38, 12 frozen
$R --vst3 <plugin> --program 5 --bank 0:1 --out a.wav        # the same factory patch a machine was recorded on
$R --vst3 <plugin> --sysex patch.syx --dump-params           # send a patch, and read whether it was taken
```

The WAV is 32-bit float, so a plugin that peaks over 1.0 is measured, never clipped. For a Roland machine, `--dt1-head "41 10 00 06" --dt1-base 1004000` sends DT1: `--dt1 OFF=VAL` pins a value, `--sweep-dt1 OFF:STEPS[:MAX]` and a repeated `--axis` sweep, `--probe LO-HI[:V1,V2]` finds which offset is a control, and `--map LO-HI[:VAL]` asks the plugin which parameter an offset is.

<constraints>
Always do:
1. Run `--list` first. `--param` and `--sweep` take the id, never the row number. A wrong id is ignored, and the sweep renders the same sound with no complaint.
2. Prove the bounce before trusting it. Render twice: same bytes means the plugin is repeatable, and the two can be compared exactly. If it is not (a free-running oscillator, modelled drift), compare averages of several bounces, and say so.
3. Prove a control reaches the audio: sweep it, and measure that the audio moves. Two renders that match byte for byte mean the control did nothing.
4. Render one note per value. Move a control between notes, never under one.
5. Give a firmware emulator its boot: `--boot 12`. The emulated processor needs real samples before it answers a note, and a short boot reads as a silent plugin.
6. When parameters do nothing, try sysex. A firmware emulator may ignore host automation and answer only the machine's own messages. The renderer sets both the controller and the processor's queue, and if the audio is still byte-identical, sysex is the way in.
7. Ask whether a dump was taken: `--dump-params` before and after. A rejected dump and an accepted one that sounds alike cannot be told apart in a WAV. Identical output means the patches never arrived, whatever the spectra look like.
8. Fix everything else: patch, note, velocity, sample rate, effects off. To fit one control, move only that control. A factory-patch recording cannot fit a law, since a performance has its chorus on.
9. To compare two engines, render both with the same patch and the same notes, and name in the report what the other engine is. An emulation is a reference, not the machine: tag it as what it is, and record where it disagrees with the schematic rather than choosing quietly.
10. Prove which binary loaded: its path, size and version. Resolve the path from the emulator's own configuration, never from memory.
11. On a silent render of the right length, prove the source before the sink: a known note must make sound at the plugin before the capture is suspected.
12. Confirm a state load took: load a different patch first, then read the displays before rendering.
13. Reset every probed offset before each render, so one probe's value does not reach the next.
14. Enumerate parameters headless as a second naming of them, and drive an emulator with a crafted patch in a spare slot.
15. Sweep one value per note with settle time between notes, never a knob under a held note.
16. When the offline renderer cannot load a plugin, open it once in an interactive host: see whether it loads at all and takes sysex, before a day goes into the renderer.

Never do:
- Open an audio device, or route through a loopback, to capture a plugin. On macOS a permission denial returns silence, not an error.
- Load a plugin in a JUCE host to measure it and trust a crash as the plugin's fault: an allocator clash across the boundary aborts inside the plugin's own loader.
- Read one output bus as all of them. The renderer gives every bus a buffer and keeps bus 0: a plugin with several may send a part elsewhere.
- Commit a render: it is a build output, and a plugin's sound may be someone else's. Keep the numbers.
- Run a cracked or unlicensed plugin. Use the maker's trial.
</constraints>
