import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles.css';
import { initDateScratch } from './date-scratch.js';
import { initMotifs, initDraw } from './utils/draw.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Illustration layer, injected before anything measures the DOM.
initMotifs();
initDraw(reduceMotion);

const opener = $('#opener');
const openButton = $('#open-invitation');
const hero = $('.hero');
const mainContent = $('#main-content');
const music = $('#site-music');
const musicToggle = $('#music-toggle');
const musicLabel = $('.music-toggle__label', musicToggle);

if (music) music.volume = 0.26;

function syncMusicControl() {
  if (!music || !musicToggle) return;
  const isPlaying = !music.paused;
  musicToggle.setAttribute('aria-pressed', String(isPlaying));
  musicToggle.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
  if (musicLabel) musicLabel.textContent = isPlaying ? 'Pause music' : 'Play music';
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
    // The control remains available if a browser declines audio playback.
  }
  syncMusicControl();
}

document.body.classList.add('is-covered');
initDateScratch();

function revealInvitation() {
  if (!opener || opener.dataset.opened === 'true') return;
  opener.dataset.opened = 'true';
  openButton.disabled = true;
  if (musicToggle) musicToggle.hidden = false;
  setMusicPlaying(true);

  if (reduceMotion) {
    opener.hidden = true;
    document.body.classList.remove('is-covered');
    mainContent?.focus({ preventScroll: true });
    return;
  }

  const finish = () => {
    opener.hidden = true;
    document.body.classList.remove('is-covered');
    mainContent?.focus({ preventScroll: true });
    ScrollTrigger.refresh();
  };

  if (playOpeningFilm(finish)) return;

  const timeline = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    onComplete: finish,
  });

  timeline
    .to('.opener__content', { autoAlpha: 0, y: -36, duration: 0.55 })
    .to('.opener__hint', { autoAlpha: 0, y: 14, duration: 0.3 }, '<')
    // .opener__ground is a direct child of .opener, so it does not travel
    // with the parting panels — without this it hangs over the revealed
    // hero until the timeline ends and the opener is hidden.
    .to('.opener__ground', { autoAlpha: 0, duration: 0.5 }, '<')
    .to(
      '.opener__corner',
      {
        autoAlpha: 0,
        scale: 0.75,
        duration: 0.45,
        stagger: 0.06,
      },
      '<',
    )
    .to('.opener__panel--left', { xPercent: -102, duration: 1.35 }, '-=.08')
    .to('.opener__panel--right', { xPercent: 102, duration: 1.35 }, '<')
    .fromTo(
      '.hero__image',
      { scale: 1.08 },
      { scale: 1, duration: 1.7, ease: 'power2.out' },
      '-=1.15',
    )
    .fromTo(
      ['.hero__copy > *', '.hero__meta', '.scroll-cue'],
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.09, ease: 'power2.out' },
      '-=.75',
    );
}

/* ── The opening film ──────────────────────────────────────────────────
   Portrait viewports only. The source is 9:16; cover-cropping it onto a
   wide screen would push the doors out of frame and upscale a 716px-wide
   picture past 1400px, so landscape keeps the parting-panel gate.

   The handoff is the whole point. The clip ends on flat white, so the
   veil is snapped to full white slightly BEFORE the last frame — while
   the picture is already white — and only then is the opener torn down.
   Nothing can flash between the two, and the reveal is a white-to-hero
   fade rather than the bright-to-dark cut the panels would give.

   Returns true if it took over the reveal, false to fall back. */
function playOpeningFilm(finish) {
  const film = $('#opener-film');
  const veil = $('#gate-veil');
  if (!film || !veil) return false;

  // Landscape and near-square viewports keep the panels.
  if (window.innerHeight / window.innerWidth < 1.2) return false;
  // Nothing buffered yet — don't stall the tap on a cold cache.
  if (film.readyState < 2) return false;
  if (!film.canPlayType('video/mp4; codecs="avc1.42E01E"') && !film.canPlayType('video/webm')) {
    return false;
  }

  let handedOff = false;
  const handOff = () => {
    if (handedOff) return;
    handedOff = true;
    // Both are pure white, so this is invisible even though it is instant.
    gsap.set(veil, { display: 'block', opacity: 1 });
    finish();
    gsap.to(veil, {
      opacity: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => gsap.set(veil, { display: 'none' }),
    });
    gsap.fromTo('.hero__image', { scale: 1.08 }, { scale: 1, duration: 1.8, ease: 'power2.out' });
    gsap.fromTo(
      ['.hero__copy > *', '.hero__meta', '.scroll-cue'],
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.09, ease: 'power2.out', delay: 0.45 },
    );
  };

  // Snap the veil on while the picture is still white, not after it is gone.
  film.addEventListener('timeupdate', () => {
    if (film.duration && film.currentTime >= film.duration - 0.3) handOff();
  });
  film.addEventListener('ended', handOff);
  film.addEventListener('error', handOff);
  // A stalled decode must not leave the gate hanging.
  const guard = window.setTimeout(handOff, 9000);
  film.addEventListener('ended', () => window.clearTimeout(guard));

  const played = film.play();
  if (played?.catch) played.catch(handOff);

  gsap.to('.opener__content', { autoAlpha: 0, y: -28, duration: 0.5, ease: 'power2.in' });
  gsap.to('.opener__hint', { autoAlpha: 0, y: 14, duration: 0.35, ease: 'power2.in' });
  gsap.to('.opener__ground', { autoAlpha: 0, duration: 0.5, ease: 'power2.in' });
  // Frame 0 is the same painting the panels carry, so a short crossfade is
  // enough to absorb any codec-level difference at the cut-in.
  gsap.to(film, { opacity: 1, duration: 0.3, ease: 'none' });

  return true;
}

openButton?.addEventListener('click', revealInvitation);
musicToggle?.addEventListener('click', () => setMusicPlaying(music?.paused ?? true));
music?.addEventListener('play', syncMusicControl);
music?.addEventListener('pause', syncMusicControl);

$$('[data-scroll-to]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.scrollTo);
    target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

if (!reduceMotion) {
  gsap.set('.reveal', { autoAlpha: 0, y: 44 });

  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    once: true,
    onEnter: (elements) => {
      gsap.to(elements, {
        autoAlpha: 1,
        y: 0,
        duration: 0.85,
        stagger: 0.11,
        ease: 'power3.out',
        overwrite: true,
      });
    },
  });

  $$('.image-parallax').forEach((element) => {
    gsap.fromTo(
      element,
      { backgroundPosition: 'right 38%' },
      {
        backgroundPosition: 'right 62%',
        ease: 'none',
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      },
    );
  });

  gsap.to('.invitation__art', {
    rotate: 8,
    yPercent: 8,
    ease: 'none',
    scrollTrigger: {
      trigger: '.invitation',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
    },
  });
}

// 9 pm in Karachi (UTC+5). The client gave an arrival time only, so the
// calendar entry is held to midnight.
const eventDetails = {
  title: 'The Baraat of Mehak & Ghayoor',
  start: '20270108T160000Z',
  end: '20270108T190000Z',
  location: 'Royal Sapphire, Plot # B-54, 13B, Block 1, Gulistan-e-Johar, Karachi, Pakistan',
  description: 'Baraat arrival 9:00 pm. Syed Hassam Uddin and Tahseen Hassam invite you to the baraat of their daughter Mehak with Ghayoor Raza.',
};

$('#add-calendar')?.addEventListener('click', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mehak and Ghayoor//Baraat Invitation//EN',
    'UID:mehak-ghayoor-baraat-20270108@karachi',
    'DTSTAMP:20261028T000000Z',
    'BEGIN:VEVENT',
    `DTSTART:${eventDetails.start}`,
    `DTEND:${eventDetails.end}`,
    `SUMMARY:${eventDetails.title}`,
    `DESCRIPTION:${eventDetails.description}`,
    `LOCATION:${eventDetails.location.replace(/,/g, '\\,')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  link.download = 'mehak-ghayoor-baraat.ics';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  announce('Calendar invitation downloaded.');
});

$('#copy-address')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(eventDetails.location);
    announce('Venue address copied.');
  } catch {
    announce(`Please copy: ${eventDetails.location}`);
  }
});

function announce(message) {
  const status = $('#action-status');
  if (!status) return;
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) status.textContent = '';
  }, 4000);
}

const weddingDate = new Date('2027-01-08T21:00:00+05:00').getTime();

function updateCountdown() {
  const remaining = Math.max(0, weddingDate - Date.now());
  const units = {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };

  Object.entries(units).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value).padStart(2, '0');
  });
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

/* Replies go to the family by call or WhatsApp, so there is no form and
   nothing is collected here. WhatsApp opens with the message ready. */
const replyText = 'Assalam o Alaikum. I would like to confirm my attendance at the baraat of Mehak and Ghayoor on Friday, 8 January 2027.';
document.querySelectorAll('[data-whatsapp]').forEach((link) => {
  link.href = `https://wa.me/${link.dataset.whatsapp}?text=${encodeURIComponent(replyText)}`;
});
