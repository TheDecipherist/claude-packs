// section-particles.js — 2D canvas backgrounds for content sections

// ── Config ────────────────────────────────────────────────────────────────────
const COUNT_DESKTOP    = 500;
const COUNT_MOBILE     = 40;

const DOT_SIZE_MIN     = 1.2;    // px
const DOT_SIZE_MAX     = 4.5;    // px
const DOT_OPACITY      = 0.18;   // 0–1

const LINE_OPACITY     = 0.10;   // max alpha for connection lines (fades with distance)
const LINE_COLOR       = '#236cab';
const CONNECT_DESKTOP  = 150;    // px — max connection distance
const CONNECT_MOBILE   = 100;

const COLOR_PRIMARY    = '#18be2b';  // ~55% of dots
const COLOR_SECONDARY  = '#236cab';  // ~45% of dots

const SPEED            = 1.22;   // max drift speed (±this value per axis)
const WOBBLE           = 0.08;   // sine-wave amplitude added on top of drift
// ─────────────────────────────────────────────────────────────────────────────

const isMobile    = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
const COUNT       = isMobile ? COUNT_MOBILE   : COUNT_DESKTOP;
const CONNECT_DIST = isMobile ? CONNECT_MOBILE : CONNECT_DESKTOP;
const rnd         = (a, b) => a + Math.random() * (b - a);

function initCanvas(canvas) {
  const section = canvas.parentElement;
  const ctx     = canvas.getContext('2d');
  let W = 0, H = 0;

  function resize() {
    W = canvas.width  = section.offsetWidth;
    H = canvas.height = section.offsetHeight;
  }

  // Defer sizing until the section has rendered content-height
  requestAnimationFrame(() => {
    resize();
    scatter();
  });

  const particles = [];

  function scatter() {
    particles.length = 0;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x:     rnd(0, W  || section.offsetWidth),
        y:     rnd(0, H  || section.offsetHeight),
        vx:    rnd(-SPEED, SPEED),
        vy:    rnd(-SPEED, SPEED),
        r:     rnd(DOT_SIZE_MIN, DOT_SIZE_MAX),
        teal:  Math.random() > 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let raf;
  let running = false;
  let t = 0;

  function frame() {
    if (!running) return;
    t += 0.008;

    // Re-check size each frame in case section reflowed
    if (section.offsetWidth !== W || section.offsetHeight !== H) resize();

    ctx.clearRect(0, 0, W, H);

    // Connection lines
    for (let a = 0; a < particles.length; a++) {
      const ax = particles[a].x, ay = particles[a].y;
      for (let b = a + 1; b < particles.length; b++) {
        const dx = ax - particles[b].x;
        const dy = ay - particles[b].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT_DIST) {
          ctx.globalAlpha = (1 - d / CONNECT_DIST) * LINE_OPACITY;
          ctx.strokeStyle = LINE_COLOR;
          ctx.lineWidth   = 1.0;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }

    // Dots + movement
    for (const p of particles) {
      p.x += p.vx + Math.sin(t + p.phase) * WOBBLE;
      p.y += p.vy + Math.cos(t + p.phase * 1.3) * (WOBBLE * 0.75);
      if (p.x < 0)  p.x = W;
      if (p.x > W)  p.x = 0;
      if (p.y < 0)  p.y = H;
      if (p.y > H)  p.y = 0;

      ctx.globalAlpha = DOT_OPACITY;
      ctx.fillStyle   = p.teal ? COLOR_PRIMARY : COLOR_SECONDARY;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Occasional amber streak
    if (!isMobile && Math.random() < 0.004) {
      const sx    = rnd(0, W);
      const sy    = rnd(0, H * 0.6);
      const len   = rnd(40, 110);
      const angle = rnd(0.1, 0.5);
      const grad  = ctx.createLinearGradient(sx, sy, sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
      grad.addColorStop(0,   'rgba(255,210,127,0)');
      grad.addColorStop(0.4, 'rgba(255,210,127,0.45)');
      grad.addColorStop(1,   'rgba(255,210,127,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  // Start/stop with visibility
  const io = new IntersectionObserver((entries) => {
    const wasRunning = running;
    running = entries[0].isIntersecting;
    if (running && !wasRunning) frame();
    if (!running) cancelAnimationFrame(raf);
  }, { threshold: 0.01 });

  io.observe(section);

  // Refit on resize
  const ro = new ResizeObserver(() => {
    resize();
    scatter();
  });
  ro.observe(section);
}

// Wait for layout to settle before initialising
window.addEventListener('load', () => {
  document.querySelectorAll('canvas.section-canvas').forEach(initCanvas);
});
