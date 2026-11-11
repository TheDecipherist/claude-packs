// Probe: payload size, and stderr capture by reassignment under two concurrent events.
import { createServer } from 'node:net';
import { unlinkSync } from 'node:fs';
const sock = process.argv[2];
try { unlinkSync(sock); } catch {}
const hook = async (text) => { const ev = JSON.parse(text); await new Promise((r) => setTimeout(r, ev.wait)); process.stderr.write(`refusal for ${ev.id}\n`); return 2; };
const srv = createServer({ allowHalfOpen: true }, (c) => {
  const chunks = [];
  c.on('data', (d) => chunks.push(d));
  c.on('end', async () => {
    const text = Buffer.concat(chunks).toString();
    const ev = JSON.parse(text);
    if (ev.quit) { c.end('0\n'); srv.close(); try { unlinkSync(sock); } catch {} return; }
    const errs = [];
    const orig = process.stderr.write;
    process.stderr.write = (chunk) => { errs.push(String(chunk)); return true; };
    const code = await hook(text);
    process.stderr.write = orig;
    c.end(`${code}\nid=${ev.id} bytes=${text.length} said=[${errs.join('').trim()}]\n`);
  });
}).listen(sock);
