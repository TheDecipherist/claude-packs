# ac-a (W5, audio-core panel rules)

| id | new or extend | file | one thing | proof |
|---|---|---|---|---|
| C1 U52-56 | new (split, original deleted) | packs/audio-core/rules/panel-surfaces, column-names, section-header-and-lamp, panel-tabs, instance-grid | one each; glow/shadow/texture line dropped | paths |
| C2 | new (split, original deleted) | knob-gestures, host-parameter-names (C14), display-echo, modulation-by-drag-and-drop | one each; matrix-page line dropped | paths |
| C2 new | new | modulation-overview-page | every synth has the page in settings plus drag and drop | paths |
| U51 | new | keys-belong-to-the-keyboard | keyboard plays notes only | paths |
| U57-59 | new | pan-and-mix-equal-power, panel-colour-safe, signal-reads-left-to-right | originals only | paths |

Loads: all govern panel/ui code (concepts ui, painter, panel-spec; pan rule dsp, ui). No check pointed at the retired rules. Other mentions: only generated packs/manifest-2.0.0.json and test/fixtures/noop/pinned-manifest.json (lead regenerates). pack-content ratchet R1 must be lowered 71 to 69 (two failing files deleted); left to lead. counts tests red until regenerated.
