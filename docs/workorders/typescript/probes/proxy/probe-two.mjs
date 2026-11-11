// Two events 10 ms apart on one socket: who gets whose stderr.
import { connect } from 'node:net';
const send = (ev) => new Promise((res) => { const c = connect(process.argv[2]); let out = ''; c.on('data', (d) => { out += d; }); c.on('end', () => res(out.trim())); c.end(JSON.stringify(ev)); });
const a = send({ id: 'A', wait: 50 });
await new Promise((r) => setTimeout(r, 10));
const b = send({ id: 'B', wait: 200 });
console.log(await a); console.log(await b);
