// chip-search: looks a chip, a machine or a question up in the reference library before anything is read, found or converted
// again (the user, 2026-11-13). The library owns its search (tools/search.mjs: Atlas first, when MONGODB_URI is set for it
// and the cluster answers; its files otherwise); this tool finds the library and hands the question over, so the kit carries
// no database driver.
//   node .claude/tools/chip-search.mjs "dual JFET op amp" | --part MC6809 | --similar TL072 [--kind K] [--brand B] [--model M]
// The library is REFERENCE_LIBRARY, else ~/projects/reference-library. Exit 4 when there is none here, with how to get it.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mjs';
/** Where the library is on this machine, or null. */
export function libraryDir(env = process.env, home = homedir()) {
    const dir = env.REFERENCE_LIBRARY || join(home, 'projects', 'reference-library');
    return existsSync(join(dir, 'tools', 'search.mjs')) ? dir : null;
}
export function main(args, env = process.env) {
    const dir = libraryDir(env);
    if (!dir) {
        process.stderr.write(`chip-search: no reference library at ${env.REFERENCE_LIBRARY || '~/projects/reference-library'}. Clone it (git clone https://github.com/TheDecipherist/reference-library ~/projects/reference-library, the token by name) or set REFERENCE_LIBRARY; until then, nothing is known to be converted already.\n`);
        return 4;
    }
    const run = spawnSync(process.execPath, [join(dir, 'tools', 'search.mjs'), ...args], { stdio: 'inherit', env });
    return run.status ?? 1;
}
if (isMain(import.meta.url))
    process.exitCode = main(process.argv.slice(2));
