// The title decodes from hex into the kit's name, and the install line can be copied.
const FINAL = 'claude-packs';
const CHARS = '0123456789ABCDEF';
const STEP_MS = 55;
const CYCLES = 4;

function decode(el) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let done = 0;
  let cycle = 0;
  const timer = setInterval(() => {
    cycle += 1;
    if (cycle >= CYCLES) {
      cycle = 0;
      done += 1;
    }
    const noise = Array.from({ length: FINAL.length - done }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
    el.textContent = FINAL.slice(0, done) + noise;
    if (done < FINAL.length) return;
    clearInterval(timer);
    el.textContent = FINAL;
  }, STEP_MS);
}

function copyOnClick(button) {
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy'; }, 1500);
  });
}

decode(document.querySelector('[data-decode]'));
document.querySelectorAll('[data-copy]').forEach(copyOnClick);
