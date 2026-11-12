// resident/shutdown: the daemon's closing steps, each bounded (W10b finding 9). A step that rejects is logged and the next runs; one
// that does not end in `stepMs` is given up on, so a stop never waits for ever on a worker that will not terminate.
export const STEP_MS = 3000;
/** Runs `steps` in order; each ends in `stepMs` whatever it does. Never rejects. */
export async function closeInOrder(steps, log, stepMs = STEP_MS) {
    for (const [name, step] of steps) {
        let timer;
        const limit = new Promise((done) => { timer = setTimeout(() => done('late'), stepMs); });
        try {
            const result = await Promise.race([Promise.resolve().then(step).then(() => 'done'), limit]);
            if (result === 'late')
                log(`stopping: ${name} did not finish in ${stepMs} ms, left behind`);
        }
        catch (e) {
            log(`stopping: ${name} failed: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
        }
        clearTimeout(timer);
    }
}
