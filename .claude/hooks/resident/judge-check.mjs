var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
// resident/judge-check: the table check of the daemon's roles (review-2-go 2.12). A hook the table marks a judge runs in parallel with
// the other judges and writes nothing; a hook that writes is a recorder, and runs in turn. Each judge of a table is run here, on the
// events given, under a trap on the file system's writing calls, and a judge that wrote is named. fs is patched in this process and
// its named exports synchronised (so a module that imported `writeFileSync` is trapped too), then put back.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contextOf } from '../lib/hook-log.mjs';
import { isVerdict } from '../lib/verdict.mjs';
const WRITERS = ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'rmdirSync', 'unlinkSync', 'renameSync', 'copyFileSync', 'symlinkSync', 'truncateSync', 'utimesSync', 'chmodSync', 'createWriteStream'];
const PROMISED = ['writeFile', 'appendFile', 'mkdir', 'rm', 'unlink', 'rename', 'copyFile'];
/** Runs `run` with every writing call of fs recorded (and still made); the writes it saw. */
async function trapped(run) {
    const seen = [];
    const undo = [];
    const intercept = (target, name) => {
        const original = target[name];
        if (typeof original !== 'function')
            return;
        target[name] = (...args) => { seen.push(`${name} ${String(args[0])}`); return original(...args); };
        undo.push(() => { target[name] = original; });
    };
    for (const name of WRITERS)
        intercept(fs, name);
    for (const name of PROMISED)
        intercept(fs.promises, name);
    const open = fs.openSync;
    if (typeof open === 'function') {
        fs.openSync = (path, flags, ...rest) => {
            if (flags !== undefined && flags !== 'r' && flags !== 0)
                seen.push(`openSync ${String(path)}`);
            return open(path, flags, ...rest);
        };
        undo.push(() => { fs.openSync = open; });
    }
    syncBuiltinESMExports();
    try {
        await run();
    }
    finally {
        for (const u of undo)
            u();
        syncBuiltinESMExports();
    }
    return seen;
}
/** The judges of `table` (hooks in `dir`, with the given file extension) that wrote a file while judging one of `events` in `project`. */
export async function judgesThatWrite(table, dir, ext, project, events) {
    const writers = [];
    for (const row of table.filter((r) => r.role === 'judge')) {
        const mod = await import(__rewriteRelativeImportExtension(pathToFileURL(join(dir, `${row.hook}${ext}`)).href));
        const fn = mod.hook;
        if (typeof fn !== 'function')
            continue;
        const writes = await trapped(async () => {
            for (const event of events) {
                const verdict = await fn(event, contextOf({ projectDir: project, cwd: project, env: {} }));
                if (!isVerdict(verdict))
                    writers.push(`${row.hook} (returned no Verdict)`);
            }
        });
        if (writes.length > 0)
            writers.push(row.hook);
    }
    return [...new Set(writers)];
}
