---
# concepts: ui, painter
paths:
  - "placeholder"
---

# A plugin with its own settings owns the devices: one settings layer, no JUCE Options button

JUCE's standalone window puts an "Options" button in its title bar that opens its own audio and MIDI page. A plugin whose settings layer also sets audio and MIDI then has two places for one device, which can disagree, and the stock page sits outside the plugin's design.

<constraints>
Always do:
- When the plugin's settings layer sets audio or MIDI, build the standalone as the project's own app (`JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1`): its own `JUCEApplication` and window round JUCE's `StandalonePluginHolder`, so the holder still loads and saves the device state, and the title bar holds the app's name and the system's window buttons only.
- Drive the holder's one `AudioDeviceManager` from the settings layer. Show the audio and MIDI tab only in the standalone; in a host, the tab is absent, not greyed.
- Give the audio and MIDI tab the standard rows: device type; input and its channels; output, its channels and a test sound; sample rate; buffer size, with its milliseconds; mute input to avoid feedback, for anything that listens to an input; the MIDI inputs, each device a check box; the MIDI channel; "Enable QWERTY" and its octave (the computer keyboard plays notes, through synthcore's QWERTY where the project links it); MPE; the sustain pedal; clearing MIDI learn.
- Put the settings layer's sections in tabs along its top, never a menu down its side, and let each tab's page scroll, its scroll bar visible when the page is longer than the layer.
- Open the first run with a 128-sample buffer, give a synth no input bus, and prove the latency with an onset probe (a click in, the sample it appears out), never with the figure the device reports.
- Prove it in the project's gate: the standalone window holds no button named "Options"; a sample rate and a MIDI input set in the layer reach the holder's device manager and survive a restart; the audio and MIDI tab is absent in a plugin host.

Never do:
- Leave JUCE's Options button beside the plugin's own settings, or make a second `AudioDeviceManager`.
- Hide the device rows inside a host by greying them: a host owns its devices, so the rows are not there.
</constraints>
