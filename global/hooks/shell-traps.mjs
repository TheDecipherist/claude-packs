#!/usr/bin/env node
// shell-traps (PreToolUse, Bash; global by design): refuses the shell traps that cost time on this Mac, with the right form.
//
// "make a skill that triggers the moment you touch bash" (the skill: shell-rules). A skill is read only
// when remembered; this hook sees every command. It refuses (exit 2):
//   - BSD flags on the GNU tools first on PATH: `date -r <seconds>`, `stat -f`, `sed -i ''` (WB-23);
//   - an in-place perl edit of a code file (apprack B-135: twice it wrote its text at the top of the file);
//   - a `for` loop over an unquoted variable while the session runs zsh (the words are not split there, WB-41);
//   - `;` chaining a destructive step (checkout --detach, rm -rf, kill) after another command (WB-19).
// Text inside heredoc bodies and quoted strings is ignored.
//   node shell-traps.mjs --selftest
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export function noHeredocs(cmd) {
  const out = [];
  const lines = cmd.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    out.push(lines[i]);
    const m = lines[i].match(/<<-?\s*['"]?(\w+)['"]?/);
    if (m) { i += 1; while (i < lines.length && lines[i].trim() !== m[1]) i += 1; }
  }
  return out.join('\n');
}

const bodyOf = (cmd) => noHeredocs(cmd).replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
const zshSession = () => basename(process.env.SHELL ?? '').includes('zsh') && !(process.env.CLAUDE_CODE_SHELL ?? '').includes('bash');

export function verdict(cmd, zsh = zshSession()) {
  const b = bodyOf(cmd);
  if (/(^|[\s;&|(])date\s+(-\w*\s+)*-r\s+\$?\(?[\d@$]/.test(b)) {
    return "`date -r <seconds>` is the BSD form; here date is GNU (-r means a FILE's time). Use: date -d @<seconds> '+%Y-%m-%d %H:%M %Z'";
  }
  if (/(^|[\s;&|(])stat\s+(-\w+\s+)*-f\s/.test(b)) {
    return '`stat -f` is the BSD form; here stat is GNU (-f is file-SYSTEM info). Use `stat -c %Y file`, or better Python os.stat for a measurement (WB-23).';
  }
  if (/(^|[\s;&|(])sed\s+-i\s+(''|"")(\s|$)/.test(noHeredocs(cmd))) return "`sed -i ''` is the BSD form; here sed is GNU: `sed -i 's/a/b/' file`."; // the real quotes
  if (/(^|[\s;&|(])perl\s+(-\w+\s+)*-\w*i\w*\b[^;&|]*\.(ts|tsx|js|mjs|cpp|cc|c|h|hpp|py|cmake)\b/.test(b)) {
    return 'an in-place perl edit of a code file: twice it wrote its text at the top of the file instead of in place (apprack B-135). Change code with the Edit tool; perl -pi stays for data files.';
  }
  if (zsh && /\bfor\s+\w+\s+in\s+\$\w+\s*;/.test(b)) {
    return 'this session runs zsh: `for x in $VAR` does not split words. Use `${=VAR}`, an explicit list, or a script file run with bash. Restart Claude Code to get bash 5 (WB-41).';
  }
  if (/;\s*(GUARD_OK=1\s+)?git\s+checkout\s+-q?\s*--detach|;\s*rm\s+-rf\s|;\s*kill\s/.test(b)) {
    return 'a destructive step chained with `;` runs even when the step before it failed (WB-19). Chain with `&&`, or run it as its own command after checking the first.';
  }
  return null;
}

function selftest() {
  const cases = [
    ["TZ=America/New_York date -r 1797000000 '+%F'", false, true], ["date -d @1797000000 '+%F'", false, false],
    ["stat -f '%m %N' x", false, true], ['stat -c %Y x', false, false], ["sed -i '' 's/a/b/' f", false, true],
    ["sed -i 's/a/b/' f", false, false], ['for t in $LIST; do echo $t; done', true, true],
    ['for t in $LIST; do echo $t; done', false, false], ['for t in a b; do echo $t; done', true, false],
    ['python3 x.py; GUARD_OK=1 git checkout -q --detach', false, true], ['python3 x.py && git checkout -q --detach', false, false],
    ["echo 'date -r 5 and stat -f'", false, false], ["cat <<'EOF'\nsed -i '' x\nEOF", false, false],
    ["perl -0pi -e 's|a|b|' src/readonly.ts", false, true], ["cd x && perl -pi -e 's/a/b/' lib/a.cpp", false, true],
    ["perl -pi -e 's/a/b/' docs/not-carried.md", false, false], ["perl -0pi -e 's/a/b/' build.json", false, false],
    ["perl -ne 'print' src/a.ts", false, false],
  ];
  const bad = cases.filter(([cmd, zsh, want]) => (verdict(cmd, zsh) !== null) !== want);
  for (const [cmd, zsh, want] of bad) console.error(`shell-traps selftest FAILED: ${want ? 'not refused' : 'wrongly refused'}: ${cmd.replace(/\n/g, ' / ')}${zsh ? ' (zsh)' : ''}`);
  if (!bad.length) console.log(`shell-traps selftest: OK (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

function main() {
  if (process.argv.includes('--selftest')) return selftest();
  let ev;
  try { ev = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  if (ev.tool_name !== 'Bash') return 0;
  const v = verdict(String(ev.tool_input?.command ?? ''));
  if (!v) return 0;
  process.stderr.write(`shell-traps: ${v}\n`);
  return 2;
}

process.exit(main());
