#!/usr/bin/env node
// Every plugin has a settings layer with the standard settings, and its standalone shows no JUCE Options button
// (audio-core's `settings-layer-owns-the-devices`; the user, 2026-11-10: "any plugin should always have a way to access a settings
// area with all the standard settings").
//   (PreToolUse)  refuses a write to a file of the settings layer (layout.json "settingsLayer": { "files": [...] }) that leaves out
//                 a standard setting the layer had, or a new layer that lacks one; and a CMake write that adds a JUCE Standalone
//                 without JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP (JUCE's own window, with its Options button). Only what a write adds
//                 is refused, so an old project's other edits pass; doctor names what it still lacks.
//   --status      exit 1, saying why, for a JUCE plugin with no settings layer declared, one missing a standard setting, or a
//                 standalone in JUCE's own window (doctor runs it)
//   --selftest    proves it
// The standard settings are lib/settings-standard.mjs; the layer names each by its id as a string literal. A file is judged in
// its own checkout, by that checkout's layout.json.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { readText } from './lib/shell-writes.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';
import { missingIn, requiredSettings } from './lib/settings-standard.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const CMAKE = /(^|\/)CMakeLists\.txt$|\.cmake$/;
const SKIP_DIRS = /^(out|build|Builds|_deps|JuceLibraryCode|JUCE|node_modules|\.git|\.claude|cmake-build.*)$/;
const PLUGIN = /\bjuce_add_plugin\s*\(/;
const STANDALONE = /\bjuce_add_plugin\s*\([^)]*\bFORMATS\b[^)]*\bStandalone\b/;
const CUSTOM_APP = /\bJUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP\s*=\s*1\b/;
const RULE = 'See .claude/rules/settings-layer-owns-the-devices.md.';

const inJuceWindow = (cmake) => STANDALONE.test(cmake) && !CUSTOM_APP.test(cmake);
const named = (rows) => rows.map(([id, label]) => `"${id}" (${label})`).join(', ');

function cmakeFiles(root, dir = '') {
  let entries = [];
  try { entries = readdirSync(join(root, dir), { withFileTypes: true }); } catch { return []; }
  return entries.flatMap((e) => {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) return SKIP_DIRS.test(e.name) ? [] : cmakeFiles(root, rel);
    return CMAKE.test(rel) ? [rel] : [];
  });
}

/** The text of a checkout's files, the one being written read as `text`. */
const together = (root, files, rel, text) => files.map((f) => (f === rel ? text : readText(join(root, f)) ?? '')).join('\n');

function layerOf(claude) {
  const layer = readLayout(claude).settingsLayer;
  return layer && Array.isArray(layer.files) ? layer : null;
}

// A write to the settings layer: the standard settings it names may not shrink, and a new layer names them all.
function judgeLayer(w, rel, root, claude) {
  const layer = layerOf(claude);
  if (!layer?.files.includes(rel) || w.after === null) return null;
  const required = requiredSettings(layer.without);
  const before = missingIn(together(root, layer.files, rel, w.before), required).map(([id]) => id);
  const after = missingIn(together(root, layer.files, rel, w.after), required);
  const lost = w.before.trim() ? after.filter(([id]) => !before.includes(id)) : after;
  if (!lost.length) return null;
  return `the settings layer (${rel}) leaves out ${named(lost)}. Every plugin's settings layer carries the standard settings, ` +
    `each row named by its id from one table (.claude/hooks/lib/settings-standard.mjs). A group the plugin truly has no use for ` +
    `is left out in layout.json "settingsLayer": { "without": { "<group>": "<why>" } }. ${RULE}\n`;
}

// A CMake write that puts the standalone in JUCE's own window, with its Options button, where it was not before.
function judgeCmake(w, rel, root) {
  if (!CMAKE.test(rel) || w.after === null) return null;
  const files = [...new Set([...cmakeFiles(root), rel])];
  if (!inJuceWindow(together(root, files, rel, w.after)) || inJuceWindow(together(root, files, rel, w.before))) return null;
  return `${rel} adds a JUCE Standalone without JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1, so the standalone opens in JUCE's own ` +
    `window, whose Options button sets the audio and MIDI devices beside the plugin's own settings layer. Build the standalone as ` +
    `the project's own app round StandalonePluginHolder, and set the devices in the settings layer. ${RULE}\n`;
}

function main(text) {
  return judgeEvent(text, {
    name: 'settings-layer',
    write: (w, rel) => {
      const root = checkoutRoot(w.path);
      return judgeLayer(w, rel, root, claudeRoot(w.path)) ?? judgeCmake(w, rel, root);
    },
  });
}

// What a project still lacks, for doctor: one line each.
export function problems(root) {
  const cmake = cmakeFiles(root);
  const all = together(root, cmake, null, '');
  if (!PLUGIN.test(all)) return [];
  const found = [];
  const layer = layerOf(root);
  if (!layer) found.push('a JUCE plugin with no settings layer: declare its files in layout.json "settingsLayer": { "files": [...] }, rows from one table keyed by the standard ids (.claude/hooks/lib/settings-standard.mjs)');
  else {
    const missing = missingIn(together(root, layer.files, null, ''), requiredSettings(layer.without));
    if (missing.length) found.push(`the settings layer leaves out ${named(missing)}`);
  }
  if (inJuceWindow(all)) found.push('the standalone opens in JUCE\'s own window, with its Options button: set JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1 and build its own app');
  return found.map((p) => `settings-layer: ${p}. ${RULE}`);
}

function status(root) {
  const found = problems(root);
  for (const p of found) console.log(p);
  return found.length ? 1 : 0;
}

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const ALL = requiredSettings().map(([id]) => id);
  const rows = (ids) => `const SettingRow rows[] = {\n${ids.map((id) => `    { "${id}" },`).join('\n')}\n};\n`;
  const but = (...gone) => ALL.filter((id) => !gone.includes(id));
  const NO_INPUT = requiredSettings({ input: 'a synth' }).map(([id]) => id);
  const LAYER = 'src/ui/SettingsRows.cpp';
  const layout = (layer) => ({ folders: {}, concepts: {}, ...(layer ? { settingsLayer: layer } : {}) });
  const project = (files, layer = { files: [LAYER] }) => scratchProject(files, layout(layer));
  const write = (dir, rel, text) => runHook(hook, dir, writeOf(join(dir, rel), text));
  const PLUGIN_CMAKE = 'juce_add_plugin(F FORMATS VST3 AU)\n';
  const STANDALONE_CMAKE = 'juce_add_plugin(F FORMATS VST3 Standalone)\n';
  const FLAG = 'target_compile_definitions(F PUBLIC JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1)\n';
  const fresh = project({ 'CMakeLists.txt': PLUGIN_CMAKE });
  const full = project({ 'CMakeLists.txt': PLUGIN_CMAKE, [LAYER]: rows(ALL) });
  const old = project({ 'CMakeLists.txt': STANDALONE_CMAKE, [LAYER]: rows(but('midi.qwerty')) });
  const split = project({ 'CMakeLists.txt': PLUGIN_CMAKE, 'cmake/app.cmake': FLAG, [LAYER]: rows(ALL) });
  const bare = project({ 'CMakeLists.txt': PLUGIN_CMAKE }, null);
  const synth = project({ 'CMakeLists.txt': PLUGIN_CMAKE }, { files: [LAYER], without: { input: 'a synth: nothing listens to an input' } });
  const blank = project({ 'CMakeLists.txt': PLUGIN_CMAKE }, { files: [LAYER], without: { input: '' } });
  const cases = [
    ['a new layer without Enable QWERTY', write(fresh, LAYER, rows(but('midi.qwerty'))), 2],
    ['a new layer with every standard setting', write(fresh, LAYER, rows(ALL)), 0],
    ['an edit that drops mute-input', write(full, LAYER, rows(but('audio.muteInput'))), 2],
    ['an old layer, an edit that drops nothing more', write(old, LAYER, `${rows(but('midi.qwerty'))}// tidy\n`), 0],
    ['a group left out with its reason', write(synth, LAYER, rows(NO_INPUT)), 0],
    ['a group left out with no reason', write(blank, LAYER, rows(NO_INPUT)), 2],
    ['a Standalone added in JUCE\'s own window', write(full, 'CMakeLists.txt', STANDALONE_CMAKE), 2],
    ['a Standalone added as its own app', write(full, 'CMakeLists.txt', STANDALONE_CMAKE + FLAG), 0],
    ['the flag set in another CMake file', write(split, 'CMakeLists.txt', STANDALONE_CMAKE), 0],
    ['an old Standalone, another CMake edit', write(old, 'CMakeLists.txt', `${STANDALONE_CMAKE}# tidy\n`), 0],
    ['--status: a plugin with no settings layer', runHook(hook, bare, null, ['--status']), 1],
    ['--status: an old layer and JUCE\'s window', runHook(hook, old, null, ['--status']), 1],
    ['--status: a complete plugin', runHook(hook, full, null, ['--status']), 0],
    ['another project is not ours', write(full, `../elsewhere-${Date.now()}/src/ui/SettingsRows.cpp`, rows([])), 0],
  ];
  return verdicts('settings-layer', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
const BY_HAND = { '--selftest': selftest, '--status': () => status(ROOT) };
if (isMain(import.meta.url)) {
  const byHand = Object.keys(BY_HAND).find((flag) => process.argv.includes(flag));
  process.exit(byHand ? BY_HAND[byHand]() : await asHook('settings-layer', main));
}
