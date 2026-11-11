// A resident runner: the Bash-group hooks loaded once, each event answered over a unix socket.
import { createServer } from 'node:net';
import { unlinkSync } from 'node:fs';
const KIT = new URL('../../../../../.claude/hooks/', import.meta.url).href;   // the kit's own install, from this probe's folder
const names = ['git-guard', 'kit-fresh', 'suite-once', 'no-find', 'repo-litter', 'look-gate'];
const hooks = await Promise.all(names.map((n) => import(`${KIT}${n}.mjs`).then((m) => m.hook)));
const sock = process.argv[2];
try { unlinkSync(sock); } catch {}
let n = 0;
createServer({ allowHalfOpen: true }, (c) => {
  let text = '';
  c.on('data', (d) => { text += d; });
  c.on('end', async () => {
    let code = 0; const errs = [];
    const orig = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk) => { errs.push(String(chunk)); return true; };
    try { for (const h of hooks) { const r = await h(text); if (r === 2) { code = 2; break; } } } catch (e) { code = 1; errs.push(String(e)); }
    process.stderr.write = orig;
    n += 1;
    console.log(`request ${n}: ${text.length} bytes, code ${code}, stderr ${errs.join('').length} bytes`);
    c.end(`${code}\n${errs.join('')}`);
  });
}).listen(sock, () => console.log('daemon up', sock));
