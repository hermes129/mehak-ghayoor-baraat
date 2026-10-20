import '@fontsource/marcellus/latin-400.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@fontsource/amiri-quran/arabic-400.css';
import './styles.css';
import gsap from 'gsap';
import { rosette, arch, starField, seal, octagonFrame } from './geometry.js';
import { initConstruct } from './construct.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// The contact angle for every star field on the page. 67.5° is the angle
// that gives the octagons clean eight-pointed stars and the square gaps
// clean crosses; 60° opens them into kites and 72° pinches them shut.
const THETA = (67.5 * Math.PI) / 180;

/* ── Ornament ─────────────────────────────────────────────────────────── */
document.querySelectorAll('[data-rosette]').forEach((host) => {
  const [n, k, inner] = host.dataset.rosette.split(',').map(Number);
  const size = Number(host.dataset.size);
  const plain = 'plain' in host.dataset;
  host.style.setProperty('--size', `${size}px`);
  host.innerHTML = rosette({ size, n, k, inner, ring: !plain, pricks: !plain });
});

$('[data-seal]').innerHTML = seal({ size: 168 });

// Four-point sparkles for the pair: concave diamonds, the star field's own cross.
document.querySelectorAll('.sparkle').forEach((s) => {
  s.innerHTML = '<svg viewBox="0 0 20 20"><path d="M10 0Q11 9 20 10Q11 11 10 20Q9 11 0 10Q9 9 10 0Z"/></svg>';
});

const FIELDS = { cover: 20, band: 14, night: 26 };
document.querySelectorAll('[data-field]').forEach((host, i) => {
  host.innerHTML = starField({ id: `field-${host.dataset.field}-${i}`, side: FIELDS[host.dataset.field], theta: THETA });
});

/* Arches and octagons are drawn at the size they render, so they are
   refitted whenever their box changes width (height changes from a phone's
   address bar are ignored unless they are real). */
const ARCHES = {
  hero: { spandrel: { side: 13, theta: THETA } },
  window: { spandrel: { side: 11, theta: THETA }, inset: 8 },
};

function fitArch(host) {
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (!w || !h) return;
  const { geometry, svg } = arch({ w, h, id: `arch-${host.dataset.arch}`, ...ARCHES[host.dataset.arch] });
  host.innerHTML = svg;
  host.parentElement.style.setProperty('--rise', `${Math.round(geometry.rise)}px`);
}

function fitOctagon(host) {
  const size = Math.round(host.clientWidth);
  if (size) host.innerHTML = octagonFrame({ size });
}

const fitted = [
  ...[...document.querySelectorAll('[data-arch]')].map((el) => [el, fitArch]),
  ...[...document.querySelectorAll('[data-octagon]')].map((el) => [el, fitOctagon]),
];
const lastSize = new WeakMap();
const refit = new ResizeObserver((entries) => {
  entries.forEach((entry) => {
    const el = entry.target;
    const { width, height } = entry.contentRect;
    const prev = lastSize.get(el);
    if (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 40) return;
    lastSize.set(el, { w: width, h: height });
    fitted.find(([host]) => host === el)?.[1](el);
  });
});
fitted.forEach(([el, fit]) => {
  fit(el);
  refit.observe(el);
});

const construct = initConstruct(reduceMotion);

/* ── The cover ────────────────────────────────────────────────────────────
   The seal sets itself out as the page loads. Pressing it turns the star a
   quarter-step and lets it go, and a compass circle struck from where it sat
   opens the card from the centre outwards. */
const cover = $('#cover');
const openButton = $('#open-invitation');
const coverRing = $('.cover__ring');
const heroFrame = $('.hero__frame');
const main = $('#main');
let opened = false;

document.body.classList.add('is-locked');
construct.build(openButton);

const finishOpening = () => {
  cover.hidden = true;
  document.body.classList.remove('is-locked');
  main.focus({ preventScroll: true });
  // Sections only begin construction once nothing is covering them.
  construct.start();
};

const openInvitation = () => {
  if (opened) return;
  opened = true;

  // The press is the gesture the browser needs before any sound.
  if (musicToggle) musicToggle.hidden = false;
  setMusicPlaying(true);

  if (reduceMotion) {
    gsap.to(cover, { opacity: 0, duration: 0.3, ease: 'power1.out', onComplete: finishOpening });
    return;
  }

  const box = openButton.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const far = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) + 24;
  const hole = { r: box.width * 0.42 };

  cover.style.setProperty('--cx', `${cx}px`);
  cover.style.setProperty('--cy', `${cy}px`);
  cover.style.setProperty('--hole', `${hole.r}px`);
  gsap.set(coverRing, { left: cx, top: cy, width: hole.r * 2 + 6, height: hole.r * 2 + 6 });

  gsap.timeline({ onComplete: finishOpening })
    .to('.seal__art', { rotation: 45, scale: 0.92, transformOrigin: '50% 50%', duration: 0.42, ease: 'power2.inOut' })
    .to('.seal__initials', { opacity: 0, duration: 0.25 }, '<')
    .to(['.cover__eyebrow', '.cover__names', '.cover__hint', '.cover__foot'], { opacity: 0, y: -8, duration: 0.35, ease: 'power1.in' }, '<0.05')
    // The arch starts setting itself out the moment the circle opens, so the
    // first thing seen through it is construction, not blank paper.
    .add(() => {
      cover.classList.add('is-opening');
      gsap.set(coverRing, { opacity: 1 });
      construct.build(heroFrame);
    }, '-=0.12')
    .to('.seal', { opacity: 0, duration: 0.2 }, '<')
    .to(hole, {
      r: far,
      duration: 0.95,
      ease: 'power1.in',
      onUpdate() {
        cover.style.setProperty('--hole', `${hole.r.toFixed(1)}px`);
        const d = hole.r * 2 + 6;
        coverRing.style.width = `${d}px`;
        coverRing.style.height = `${d}px`;
      },
    }, '<');
};

openButton.addEventListener('click', openInvitation);

/* ── Music ────────────────────────────────────────────────────────────── */
const music = $('#site-music');
const musicToggle = $('#music-toggle');
const musicLabel = musicToggle?.querySelector('.music-toggle__label');
if (music) music.volume = 0.35;

function syncMusicControl() {
  if (!music || !musicToggle) return;
  const playing = !music.paused;
  musicToggle.setAttribute('aria-pressed', String(playing));
  musicToggle.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
  if (musicLabel) musicLabel.textContent = playing ? 'Pause music' : 'Play music';
}

async function setMusicPlaying(shouldPlay) {
  if (!music) return;
  if (!shouldPlay) {
    music.pause();
    syncMusicControl();
    return;
  }
  try {
    await music.play();
  } catch {
    // Autoplay declined. The control stays visible and honest.
  }
  syncMusicControl();
}

musicToggle?.addEventListener('click', () => setMusicPlaying(music?.paused ?? true));
music?.addEventListener('play', syncMusicControl);
music?.addEventListener('pause', syncMusicControl);

/* ── Countdown ────────────────────────────────────────────────────────── */
const arrival = new Date('2027-01-08T21:00:00+05:00').getTime();
const fields = Object.fromEntries(['days', 'hours', 'minutes', 'seconds'].map((k) => [k, $(`[data-countdown="${k}"]`)]));
const pad = (n) => String(n).padStart(2, '0');
const tick = () => {
  const left = Math.max(0, arrival - Date.now());
  fields.days.textContent = pad(Math.floor(left / 86_400_000));
  fields.hours.textContent = pad(Math.floor((left / 3_600_000) % 24));
  fields.minutes.textContent = pad(Math.floor((left / 60_000) % 60));
  fields.seconds.textContent = pad(Math.floor((left / 1000) % 60));
};
tick();
window.setInterval(tick, 1000);

/* ── Calendar ─────────────────────────────────────────────────────────── */
const ADDRESS = 'Royal Sapphire, Plot # B-54, 13B, Block 1, Gulistan-e-Johar, Karachi';
const venueStatus = $('#venue-status');

$('#add-calendar').addEventListener('click', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mehak and Ghayoor//Baraat//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:mehak-ghayoor-baraat-20270108@karachi',
    'DTSTAMP:20261020T000000Z',
    // 9 pm in Karachi (UTC+5), held to midnight.
    'DTSTART:20270108T160000Z',
    'DTEND:20270108T190000Z',
    'SUMMARY:Baraat of Mehak and Ghayoor',
    `LOCATION:${ADDRESS.replace(/,/g, '\\,')}`,
    'DESCRIPTION:Baraat arrival 9:00 pm.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'mehak-ghayoor-baraat.ics';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

/* ── Address ──────────────────────────────────────────────────────────── */
$('#copy-address').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ADDRESS);
    venueStatus.textContent = 'Address copied.';
  } catch {
    venueStatus.textContent = ADDRESS;
  }
});

/* ── Replies ──────────────────────────────────────────────────────────── */
const replyText = 'Assalam o Alaikum. I would like to confirm my attendance at the baraat of Mehak and Ghayoor on Friday, 8 January 2027.';
document.querySelectorAll('[data-whatsapp]').forEach((link) => {
  link.href = `https://wa.me/${link.dataset.whatsapp}?text=${encodeURIComponent(replyText)}`;
});
