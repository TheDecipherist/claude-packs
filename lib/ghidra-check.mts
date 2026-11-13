// What an order asks of Ghidra, checked before a run starts (the user, 2026-11-13: "check if ghidra can even do X before putting
// it in the order so it doesnt fail when it comes to that step"). An order names the processors it needs Ghidra for in its install
// block, `ghidra: H8/300H, DSP56300`; the check refuses the run when Ghidra is not installed, when no JDK it accepts is on the
// machine, or when it has no processor module for a name. Found on the supernova2 order: Ghidra 12.2 has neither of its two
// processors and needs Java 25, and the order said "Ghidra for the H8 code" until W4 would have failed hours in.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const dirs = (d: string): string[] => { try { return readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; } };
const text = (f: string): string => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };

/** Where Ghidra is: GHIDRA_INSTALL_DIR, else the newest ~/tools/ghidra_*_PUBLIC, else null. */
export function ghidraHome(env: NodeJS.ProcessEnv, home: string = homedir()): string | null {
  if (env.GHIDRA_INSTALL_DIR && existsSync(join(env.GHIDRA_INSTALL_DIR, 'Ghidra', 'application.properties'))) return env.GHIDRA_INSTALL_DIR;
  const found = dirs(join(home, 'tools')).filter((d) => /^ghidra_[\d.]+_PUBLIC$/.test(d)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return found.length ? join(home, 'tools', found.at(-1) as string) : null;
}

/** A JDK's major version from its `release` file, or 0. */
const jdkMajor = (javaHome: string): number => Number(/JAVA_VERSION="(\d+)/.exec(text(join(javaHome, 'release')))?.[1] ?? 0);

/** Where a machine keeps JDKs, each a folder of JDK homes (a Homebrew keg keeps its home deeper: libexec/openjdk.jdk/Contents/Home). */
export const JDK_ROOTS: readonly string[] = ['/opt/homebrew/opt', '/Library/Java/JavaVirtualMachines', '/usr/lib/jvm'];

/** The JDK homes on this machine: JAVA_HOME, Ghidra's own override, and those under `roots`. */
export function jdkHomes(env: NodeJS.ProcessEnv, ghidra: string | null, roots: readonly string[] = JDK_ROOTS): string[] {
  const out = new Set<string>();
  if (env.JAVA_HOME) out.add(env.JAVA_HOME);
  const override = /^JAVA_HOME_OVERRIDE=(.+)$/m.exec(text(join(ghidra ?? '', 'support', 'launch.properties')))?.[1]?.trim();
  if (override) out.add(override);
  for (const root of roots) {
    for (const d of dirs(root)) {
      if (/^openjdk(@\d+)?$/.test(d)) out.add(join(root, d, 'libexec', 'openjdk.jdk', 'Contents', 'Home'));
      out.add(join(root, d, 'Contents', 'Home'));
      out.add(join(root, d));
    }
  }
  return [...out].filter((h) => jdkMajor(h) > 0);
}

/** The processor names Ghidra's modules declare (each language's processor, id and description), lower-cased. */
export function ghidraProcessors(ghidra: string): { module: string; names: string[] }[] {
  const root = join(ghidra, 'Ghidra', 'Processors');
  return dirs(root).map((module) => {
    const languages = join(root, module, 'data', 'languages');
    const ldefs = (() => { try { return readdirSync(languages).filter((f) => f.endsWith('.ldefs')); } catch { return []; } })();
    const names = new Set<string>([module]);
    for (const f of ldefs) {
      for (const m of text(join(languages, f)).matchAll(/processor="([^"]+)"|id="([^":]+)|<description>([^<]+)</g)) names.add((m[1] ?? m[2] ?? m[3] ?? '').trim());
    }
    return { module, names: [...names].filter(Boolean) };
  });
}

/** The refusals for what an order asks of Ghidra; none when it asks nothing. */
export function ghidraRefusals(wanted: readonly string[], env: NodeJS.ProcessEnv, home: string = homedir(), roots: readonly string[] = JDK_ROOTS): string[] {
  if (!wanted.length) return [];
  const ghidra = ghidraHome(env, home);
  if (!ghidra) return [`ghidra: the order needs Ghidra for ${wanted.join(', ')}, and none is installed (GHIDRA_INSTALL_DIR, or ~/tools/ghidra_VERSION_PUBLIC)`];
  const out: string[] = [];
  const min = Number(/^application\.java\.min=(\d+)/m.exec(text(join(ghidra, 'Ghidra', 'application.properties')))?.[1] ?? 0);
  const jdks = jdkHomes(env, ghidra, roots);
  if (min && !jdks.some((h) => jdkMajor(h) >= min)) {
    out.push(`ghidra: it needs Java ${min} or newer, and this machine has ${jdks.length ? jdks.map((h) => `Java ${jdkMajor(h)}`).join(', ') : 'no JDK'}; install one and set JAVA_HOME for it`);
  }
  const modules = ghidraProcessors(ghidra);
  for (const cpu of wanted) {
    const k = norm(cpu);
    const hit = modules.find((m) => m.names.some((n) => { const nn = norm(n); return nn === k || (k.length >= 4 && (nn.includes(k) || (nn.length >= 4 && k.includes(nn)))); }));
    if (!hit) out.push(`ghidra: no processor module for ${cpu} in ${ghidra.split('/').at(-1)} (it has: ${modules.map((m) => m.module).join(', ')}); take Ghidra out of the step that needs it, or install a module first`);
  }
  return out;
}
