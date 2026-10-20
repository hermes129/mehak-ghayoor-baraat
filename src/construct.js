/**
 * Construction: guide lines first, then the gold they imply, then the guides
 * settle back to a faint ghost, the way a set-out survives under finished
 * work. Text in the same host rises in alongside, never after it.
 *
 * The hidden state lives only on .is-armed, which script adds and strips:
 * no script, reduced motion, or a host that never scrolls into view all
 * leave the finished drawing on the page.
 *
 * Timings come from the SVG itself. geometry.js writes --d and --t on every
 * stroke, so a host's total is the latest d + t among its strokes, plus the
 * lead the CSS gives gold lines over guides.
 */

const GOLD_LEAD = 0.0; // gold strokes carry their own later --d already
const RISE_STEP = 0.07;
const RISE_START = 0.08;
const RISE_TIME = 0.5; // must match [data-rise] transition in styles.css

const secs = (v) => parseFloat(v) || 0;

function measure(host) {
  let end = 0;
  host.querySelectorAll('.g-draw').forEach((el) => {
    const d = secs(el.style.getPropertyValue('--d'));
    const t = secs(el.style.getPropertyValue('--t'));
    const lead = el.classList.contains('g-line') ? GOLD_LEAD : 0;
    end = Math.max(end, d + t + lead);
  });
  const rises = host.querySelectorAll('[data-rise]');
  rises.forEach((el, i) => el.style.setProperty('--rise-d', `${(RISE_START + i * RISE_STEP).toFixed(2)}s`));
  if (rises.length) end = Math.max(end, RISE_START + (rises.length - 1) * RISE_STEP + RISE_TIME);
  return end;
}

export function initConstruct(reduced) {
  const hosts = [...document.querySelectorAll('[data-construct]')];
  const noop = { start() {}, build() {}, arm() {} };
  if (reduced || !hosts.length) return noop;

  const arm = (host) => {
    if (host.classList.contains('is-built')) return;
    host.classList.add('is-armed');
  };
  hosts.forEach(arm);

  const build = (host) => {
    if (!host || host.classList.contains('is-built')) return;
    const total = measure(host);
    // Force the armed state to paint before the transition starts, or a host
    // that was armed in this same frame would jump straight to finished.
    void host.getBoundingClientRect();
    host.classList.add('is-built');
    window.setTimeout(() => {
      host.classList.remove('is-armed');
      host.classList.add('is-settled');
    }, (total + 0.15) * 1000);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      build(entry.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });

  let started = false;
  return {
    arm,
    build,
    /** Scroll-built hosts wait for the cover to go; nothing builds unseen. */
    start() {
      if (started) return;
      started = true;
      hosts.filter((h) => h.dataset.construct !== 'manual').forEach((h) => observer.observe(h));
    },
  };
}
