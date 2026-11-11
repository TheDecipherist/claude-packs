import { allowedPacks, readConfig } from './configs.mjs';
import { kitCommand } from './kit-command.mjs';
import { normalisePacks } from './packs.mjs';
import { filesOf } from './project-files.mjs';
import { recommend } from './scan-detect.mjs';
export const suggestionOf = (dir) => recommend(dir, filesOf(dir));
export function suggest(dir, { log = console.log } = {}) {
    const pick = suggestionOf(dir);
    log(`configuration: ${pick.config} (${pick.why})`);
    if (pick.early)
        log('no source yet: this comes from the notes alone. Run `suggest` again once code exists, and `add` what it finds.');
    log(`always: ${pick.always.join(', ')}`);
    if (pick.packs.length)
        log('suggested:');
    for (const p of pick.packs)
        log(`  ${p.pack.padEnd(14)} ${p.why}`);
    if (pick.leftOut.length)
        log(`${pick.early ? 'not named yet' : 'left out, nothing here needs them'}: ${pick.leftOut.join(', ')}`);
    if (pick.fullStack)
        log('this looks like the full-stack configuration: `init --config full-stack` fixes its folder layout, so it is offered and never assumed');
    log(`\nInstall exactly this: ${kitCommand(dir)} init --auto`);
    return pick;
}
/** The configuration of an `init <pack>` that names none: the project's own, when it takes those packs. A Node project that asks
 *  for one pack must not land in whichever configuration is smallest. With no code yet nothing says what the project is, so the
 *  packs decide. */
export function detectedConfig(dir, requested) {
    const pick = suggestionOf(dir);
    if (pick.early)
        return null;
    const allowed = allowedPacks(readConfig(pick.config));
    return normalisePacks(requested).every((p) => allowed.includes(p)) ? pick.config : null;
}
