// claude-packs suggest: which packs this project needs, read from its own files, so nobody picks them by hand. `init --auto` installs exactly this.
// Fast and read-only: it reads file names and package.json, nothing else. `scan` goes further and runs the checks on a copy.
import { filesOf } from './scan.mjs';
import { recommend } from './scan-detect.mjs';

export const suggestionOf = (dir) => recommend(dir, filesOf(dir));

export function suggest(dir, { log = console.log } = {}) {
  const pick = suggestionOf(dir);
  log(`configuration: ${pick.config} (${pick.why})`);
  log(`always: ${pick.always.join(', ')}`);
  if (pick.packs.length) log('suggested:');
  for (const p of pick.packs) log(`  ${p.pack.padEnd(14)} ${p.why}`);
  if (pick.leftOut.length) log(`left out, nothing here needs them: ${pick.leftOut.join(', ')}`);
  if (pick.fullStack) log('this looks like the full-stack configuration: `init --config full-stack` fixes its folder layout, so it is offered and never assumed');
  log('\nInstall exactly this: npx --no-install @thedecipherist/claude-packs init --auto');
  return pick;
}
