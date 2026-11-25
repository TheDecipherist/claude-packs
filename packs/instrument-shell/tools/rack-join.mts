// rack-join (instrument-shell's tool): a plugin whose standalone is ready to test is on the owner's rack page, and the rack
// opens the app the user would launch (the owner, 2026-11-25: "whenever the standalone build is ready to test for a plugin ...
// it automatically adds it to the rack in synths.html in the eproms project").
//   node .claude/tools/rack-join.mjs check <launched .app> [--rack <rack repo>]
//   node .claude/tools/rack-join.mjs write [--rack <rack repo>] [--no-restart]
// The rack is a generator in another repository: `tools/synths.py` holds the UNITS table (uid, name, maker, year, project
// folder, blurb, ...), resolves each unit's app with `app_path(project, uid)`, and writes `synths.html` with `--write`. Its
// server reads UNITS once at import, so `write` also stops it for launchd to start again. The rack repo is
// `guards.rack.repo` in .claude/layout.json, else ~/projects/eproms.
// check: exit 0 when this project has a row and the rack resolves to the launched app; exit 1 with what is wrong (no row, the
// rack opens another app, none built); exit 2 when used wrongly or the rack cannot be read. write: regenerates and restarts.
import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';
import { parseJson } from '../hooks/lib/json.mts';
import { readLayout } from '../hooks/lib/layout.mts';

/** One row of the rack's UNITS table, as the generator itself reports it. */
export interface RackUnit { uid: string; project: string; app: string | null }

const real = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };

/** The rack repository: the layout's `guards.rack.repo`, else ~/projects/eproms. */
export function rackRepo(root: string, flag: string | undefined): string {
  if (flag !== undefined) return resolve(flag);
  const named = (readLayout(root).guards as { rack?: { repo?: string } } | undefined)?.rack?.repo;
  return named !== undefined ? resolve(named.replace(/^~(?=\/)/, homedir())) : join(homedir(), 'projects', 'eproms');
}

// the generator is asked, never parsed: its own table and its own app_path are the only truth about what the rack opens
const ASK = `import sys, json; sys.path.insert(0, 'tools'); import synths
print(json.dumps([{"uid": u[0], "project": u[4], "app": (lambda a: str(a) if a else None)(synths.app_path(u[4], u[0]))} for u in synths.UNITS]))`;

/** Every unit on the rack, from the generator; the reason, as a string, when it cannot be read. */
export function rackUnits(rack: string): RackUnit[] | string {
  if (!existsSync(join(rack, 'tools', 'synths.py'))) return `no rack generator at ${join(rack, 'tools', 'synths.py')}`;
  const run = spawnSync('python3', ['-c', ASK], { cwd: rack, encoding: 'utf8' });
  if (run.status !== 0) return `the rack generator failed: ${(run.stderr ?? '').trim().split('\n').slice(-3).join(' ')}`;
  return parseJson<RackUnit[]>(run.stdout) ?? `the rack generator printed no table: ${run.stdout.slice(0, 200)}`;
}

/** What is wrong with this project on the rack, for the launched app; empty when its row resolves to it. */
export function rackProblems(units: readonly RackUnit[], project: string, launched: string): string[] {
  const rows = units.filter((u) => u.project === project);
  if (rows.length === 0) return [`no row in UNITS for the project folder "${project}": add one (the join-the-rack skill)`];
  const want = real(launched);
  if (rows.some((u) => u.app !== null && real(u.app) === want)) return [];
  const seen = rows.map((u) => `${u.uid}: ${u.app ?? 'nothing built'}`).join('; ');
  return [`the rack opens another app (${seen}), not ${want}: name it in APP_OVERRIDES (the join-the-rack skill)`];
}

function main(args: readonly string[], root: string): number {
  const [mode, launched] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--rack');
  const at = args.indexOf('--rack');
  const rack = rackRepo(root, at >= 0 ? args[at + 1] : undefined);
  if (mode === 'write') {
    const run = spawnSync('python3', ['tools/synths.py', '--write'], { cwd: rack, encoding: 'utf8' });
    console.log((run.stdout ?? '').trim() || (run.stderr ?? '').trim());
    if (run.status !== 0) return 2;
    if (args.includes('--no-restart')) { console.log('rack-join: synths.html written; the server left running'); return 0; }
    // the server read UNITS at import: stopped, launchd starts it again with the new table
    spawnSync('pkill', ['-f', 'synths.py --no-browser']);
    console.log('rack-join: synths.html written; the rack server stopped for launchd to restart with the new table');
    return 0;
  }
  if (mode !== 'check' || launched === undefined) {
    console.error('usage: node .claude/tools/rack-join.mjs check <launched .app> [--rack <repo>] | write [--rack <repo>]');
    return 2;
  }
  if (!existsSync(launched)) { console.log(`rack-join: the launched app does not exist: ${launched}`); return 1; }
  const units = rackUnits(rack);
  if (typeof units === 'string') { console.error(`rack-join: ${units}`); return 2; }
  const wrong = rackProblems(units, basename(real(root)), launched);
  console.log(wrong.length === 0 ? `rack-join: on the rack, and it opens ${real(launched)}` : ['rack-join: 1 to fix', ...wrong.map((w) => `  ${w}`)].join('\n'));
  return wrong.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2), process.env.CLAUDE_PROJECT_DIR ?? process.cwd()));
