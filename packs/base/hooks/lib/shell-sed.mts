// shell-sed: the in-place editors of a shell command (sed -i, perl -i, ruby -i), split out of shell-writes when it neared
// the 300-line limit. Its one job is reading those calls, and running a sed -i for real on a copy of the text.
//
//   sedPlan(args) -> { plan, files }   a `sed -i` call's scripts and options (plan is null when a script comes from a file, -f)
//   inPlaceFiles(args) -> [file]        the files of a `perl -i` or `ruby -i` call
//   runSed(plan, before) -> text | null  the text after the plan, run by GNU sed in --sandbox (no e, r or w commands)
import { spawnSync } from 'node:child_process';

/** What a `sed -i` runs: the options that change how it reads, and its scripts. */
export interface SedPlan {
  flags: string[];
  scripts: string[];
}

// The scripts and files of a `sed -i` call, and the options that change how it reads them.
export function sedPlan(args: readonly string[]): { plan: SedPlan | null; files: string[] } {
  const scripts: string[] = [];
  const keep: string[] = [];
  const files: string[] = [];
  let scripted = false;   // a script was given, by -e, -f or as the first plain word
  let fromFile = false;   // one of them is a file, which is not read
  for (let k = 0; k < args.length; k += 1) {
    const a = args[k] ?? '';
    if (a === '-i' && args[k + 1] === '') { k += 1; continue; } // BSD: -i ''
    if (a === '-e' || a === '--expression') { k += 1; scripts.push(args[k] ?? ''); scripted = true; continue; }
    if (a.startsWith('--expression=')) { scripts.push(a.slice(13)); scripted = true; continue; }
    if (a === '-f' || a === '--file') { fromFile = true; scripted = true; k += 1; continue; }
    if (/^-[^-]/.test(a)) { for (const f of a.slice(1).replace(/i.*$/, '')) if ('Ernsz'.includes(f)) keep.push(`-${f}`); continue; }
    if (a.startsWith('--')) { if (['--regexp-extended', '--quiet', '--silent', '--separate', '--null-data'].includes(a)) keep.push(a); continue; }
    if (!scripted) { scripts.push(a); scripted = true; } else files.push(a);
  }
  return { plan: fromFile ? null : { flags: keep, scripts }, files };
}

// The files of a `perl -i` or `ruby -i` call.
export function inPlaceFiles(args: readonly string[]): string[] {
  const files: string[] = [];
  for (let k = 0; k < args.length; k += 1) {
    const a = args[k] ?? '';
    if (/^-\w*[eE]$/.test(a)) { k += 1; continue; } // -e, -pe, -ne: the next word is the program
    if (!a.startsWith('-')) files.push(a);
  }
  return files;
}

// The GNU sed on this machine, or null. Probed on each call, not kept in a module-level memo with no key: a machine's sed
// can change under a long-lived process, and the probe is one short spawn per sed -i call.
function findGnuSed(): string | null {
  for (const s of ['/opt/homebrew/opt/gnu-sed/libexec/gnubin/sed', '/usr/local/opt/gnu-sed/libexec/gnubin/sed', 'gsed', 'sed']) {
    const r = spawnSync(s, ['--version'], { encoding: 'utf8', timeout: 2000 });
    if (r.status === 0 && /GNU sed/.test(r.stdout)) return s;
  }
  return null;
}

/** The text after the plan has run on `before`, or null when there is no GNU sed or it fails. */
export function runSed(plan: SedPlan, before: string): string | null {
  const sed = findGnuSed();
  if (!sed) return null;
  const r = spawnSync(sed, ['--sandbox', ...plan.flags, ...plan.scripts.flatMap((s) => ['-e', s])], { input: before, encoding: 'utf8', timeout: 3000 });
  return r.status === 0 ? r.stdout : null;
}
