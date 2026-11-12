// resident/selftest-status: the cases of the daemon's selftest about the status line's ask (W8.4, review-2-go 7.1): the daemon answers
// it with its own state, it is no event (the events count stays), and a bar asking every few seconds never keeps an idle daemon
// alive: the daemon ends by its idle clock while the asks go on.
import { parseJson } from '../lib/json.mjs';
import { askDaemon } from '../lib/proxy-client.mjs';
import { PLANTS } from './selftest-plants.mjs';
import { client, dropRig, eventText, filesOf, makeRig, request, start, stopAll, waitFor, alive } from './selftest-rig.mjs';
import { readState } from './state.mjs';
const nap = (ms) => new Promise((done) => setTimeout(done, ms));
export async function statusCases(cases) {
    const rig = makeRig(PLANTS, {}, 'resident-status-');
    try {
        // 0.04 minutes of idle (2.4 s): one event, then only status asks, every 250 ms
        const up = await start(rig, ['--pool', '2', '--idle-minutes', '0.04', '--state-ms', '20']);
        const pid = up.kind === 'ready' ? up.pid : 0;
        await client(rig, eventText(rig, 'Race'));
        await nap(60);
        const first = await askDaemon(filesOf(rig).socket, request(rig, { status: true }), '', 1000);
        const said = first.kind === 'reply' ? parseJson(first.reply.stdout) : null;
        cases.push(['a status ask is answered with the daemon\'s own state (its pid) and exit 0', first.kind === 'reply' && first.reply.code === 0 && said?.pid === pid, true]);
        for (let i = 0; i < 6; i += 1) {
            await askDaemon(filesOf(rig).socket, request(rig, { status: true }), '', 500);
            await nap(30);
        }
        await client(rig, eventText(rig, 'Race')); // its save (the state file is written after an event, at most every --state-ms) shows the count
        await waitFor(() => (readState(filesOf(rig).pid)?.events ?? 0) >= 2, 2000);
        cases.push(['status asks are no events: the daemon has served two events after seven asks and two events', readState(filesOf(rig).pid)?.events ?? -1, 2]);
        // the bar keeps asking: a daemon whose idle clock the asks reset would still be alive after the 2.4 s
        for (let i = 0; i < 24 && alive(pid); i += 1) {
            await askDaemon(filesOf(rig).socket, request(rig, { status: true }), '', 200);
            await nap(250);
        }
        cases.push(['status asks never reset the idle clock: the daemon ended by its idle time while the asks went on', alive(pid), false]);
    }
    finally {
        await stopAll(rig);
        dropRig(rig);
    }
}
