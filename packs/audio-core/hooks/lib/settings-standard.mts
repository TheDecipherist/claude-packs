// The standard settings every plugin's settings layer carries (audio-core's `settings-layer-owns-the-devices`), as data: the one
// list the `settings-layer` hook and doctor read. A project's settings layer builds its rows from a table keyed by these ids, so
// each id appears in its source as a string literal ("audio.sampleRate"). A group a plugin truly has no use for is left out in
// layout.json with its reason: "settingsLayer": { "files": [...], "without": { "input": "a synth: nothing listens to an input" } }.

/** One standard setting: its id, and its label. */
export type SettingRow = readonly [id: string, label: string];

export const STANDARD_SETTINGS: Readonly<Record<string, readonly SettingRow[]>> = {
  audio: [
    ['audio.deviceType', 'Audio device type'],
    ['audio.output', 'Output'],
    ['audio.outputChannels', 'Output channels'],
    ['audio.test', 'Test sound'],
    ['audio.sampleRate', 'Sample rate'],
    ['audio.bufferSize', 'Audio buffer size'],
  ],
  input: [
    ['audio.input', 'Input'],
    ['audio.inputChannels', 'Input channels'],
    ['audio.muteInput', 'Mute input to avoid feedback'],
  ],
  midi: [
    ['midi.inputs', 'MIDI inputs (the MIDI source)'],
    ['midi.channel', 'MIDI channel'],
    ['midi.qwerty', 'Enable QWERTY'],
    ['midi.qwertyOctave', 'QWERTY octave'],
    ['midi.mpe', 'MPE'],
    ['midi.sustainPedal', 'Sustain pedal (CC64)'],
    ['midi.learnClear', 'Clear MIDI learn'],
  ],
  interface: [
    ['ui.scale', 'Interface scale'],
    ['ui.tooltips', 'Tooltips'],
  ],
};

export const GROUPS: readonly string[] = Object.keys(STANDARD_SETTINGS);

/** The settings a project's layer must carry: every group but those it leaves out with a reason. */
export function requiredSettings(without: Readonly<Record<string, unknown>> = {}): SettingRow[] {
  return GROUPS.filter((g) => !String(without[g] ?? '').trim()).flatMap((g) => STANDARD_SETTINGS[g] ?? []);
}

/** The required settings a text does not name, as [id, label]. */
export const missingIn = (text: string, required: readonly SettingRow[]): SettingRow[] => required.filter(([id]) => !text.includes(`"${id}"`));
