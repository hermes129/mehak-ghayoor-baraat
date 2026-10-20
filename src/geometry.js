/**
 * Compass and rule.
 *
 * Islamic geometric ornament is not drawn freehand: a craftsman sets out a
 * circle, steps its divisions round with the compass, joins them with the
 * rule, and only then picks out the star that the guide lines imply. Every
 * ornament here is generated the same way and returned in two layers:
 *
 *   .g-guide  the construction: circles, radii, springing lines, centres
 *   .g-line   the gold that the construction produces
 *
 * Every stroke carries pathLength="1", so construct.js can draw any of them
 * on with one dash rule and no measuring. Each element also carries its own
 * --d (delay) and --t (duration), so the order of construction lives here,
 * next to the geometry that dictates it.
 *
 * All coordinates are real pixels: callers pass the size the SVG renders at,
 * so stroke widths are true pixels without non-scaling-stroke, which does not
 * mix reliably with pathLength dashes.
 */

const TAU = Math.PI * 2;
const r2 = (n) => Math.round(n * 100) / 100;
const P = (x, y) => `${r2(x)} ${r2(y)}`;

const attrs = (cls, d, t) => `class="${cls} g-draw" pathLength="1" style="--d:${r2(d)}s;--t:${r2(t)}s"`;

const circle = (cx, cy, r, cls, d, t) =>
  `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" ${attrs(cls, d, t)}/>`;
const line = (x1, y1, x2, y2, cls, d, t) =>
  `<path d="M${P(x1, y1)}L${P(x2, y2)}" ${attrs(cls, d, t)}/>`;
const poly = (pts, cls, d, t, closed = true) =>
  `<path d="M${pts.map(([x, y]) => P(x, y)).join('L')}${closed ? 'Z' : ''}" ${attrs(cls, d, t)}/>`;
const dot = (cx, cy, r = 1.6) => `<circle class="g-prick" cx="${r2(cx)}" cy="${r2(cy)}" r="${r}"/>`;

/** Points of a regular n-gon on radius r, first point at angle a0. */
const ring = (n, r, cx, cy, a0 = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (TAU * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

/** Star polygon {n/k} as one or more closed loops (gcd(n, k) loops). */
function starLoops(n, k, r, cx, cy, a0) {
  const pts = ring(n, r, cx, cy, a0);
  const loops = [];
  const seen = new Set();
  for (let s = 0; s < n; s += 1) {
    if (seen.has(s)) continue;
    const loop = [];
    let i = s;
    do {
      seen.add(i);
      loop.push(pts[i]);
      i = (i + k) % n;
    } while (i !== s);
    loops.push(loop);
  }
  return loops;
}

/** Radius at which the edges of {n/k} cross: the star's inner vertices. */
const innerRadius = (n, k, r) => (r * Math.cos((Math.PI * k) / n)) / Math.cos((Math.PI * (k - 1)) / n);

/* ── Rosette ──────────────────────────────────────────────────────────────
   Set out exactly as on paper: the circle, then the diameters that divide
   it, then the pricked points. The gold star {n/k} is the line that joins
   every k-th point; its edges cross on a smaller circle, and the inner star
   is struck from those crossings. */
export function rosette({ size = 120, n = 8, k = 3, inner = 2, ring: withRing = true, pricks = true, speed = 1 } = {}) {
  const c = size / 2;
  const R = c - 2;
  const a0 = -Math.PI / 2;
  const rin = innerRadius(n, k, R);
  const s = speed;
  const out = [];

  // Construction: compass first, then the rule.
  out.push(circle(c, c, R, 'g-guide', 0, 0.42 * s));
  const half = n % 2 === 0 ? n / 2 : n;
  for (let i = 0; i < half; i += 1) {
    const a = a0 + (TAU * i) / n;
    const [x1, y1] = [c + R * Math.cos(a), c + R * Math.sin(a)];
    const [x2, y2] = n % 2 === 0 ? [c - R * Math.cos(a), c - R * Math.sin(a)] : [c, c];
    out.push(line(x1, y1, x2, y2, 'g-guide', 0.12 * s + (i * 0.05 * s), 0.26 * s));
  }
  out.push(circle(c, c, rin, 'g-guide', 0.3 * s, 0.3 * s));

  // Gold: the star joining every k-th point, then the star inside it.
  starLoops(n, k, R, c, c, a0).forEach((loop, i) => out.push(poly(loop, 'g-line', 0.42 * s + i * 0.08 * s, 0.62 * s)));
  if (inner) {
    const ia = a0 + Math.PI / n;
    starLoops(n, inner, rin, c, c, ia).forEach((loop, i) => out.push(poly(loop, 'g-line g-line--fine', 0.7 * s + i * 0.08 * s, 0.5 * s)));
  }
  if (withRing) out.push(circle(c, c, R, 'g-line g-line--fine', 0.85 * s, 0.5 * s));

  const marks = pricks ? ring(n, R, c, c, a0).map(([x, y]) => dot(x, y)).join('') + dot(c, c, 1.8) : '';

  return `<svg class="geo" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <g class="g-guides">${out.filter((s) => s.includes('g-guide')).join('')}${marks}</g>
    <g class="g-lines">${out.filter((s) => s.includes('g-line')).join('')}</g>
  </svg>`;
}

/* ── Four-centred arch ────────────────────────────────────────────────────
   The Mughal iwan arch: each haunch is a small arc struck from a centre on
   the springing line, handing over at a tangent to a long arc struck from a
   centre below it on the far side, so the two long arcs meet in a point.
   Four compass centres, which is what the construction layer shows. */
function archHalf(s, r1, phi, r2_) {
  // Left half, origin at the left springing point, y up.
  const C1 = [r1, 0];
  const T = [C1[0] - r1 * Math.cos(phi), r1 * Math.sin(phi)];
  const C2 = [T[0] + r2_ * Math.cos(phi), T[1] - r2_ * Math.sin(phi)];
  const apexY = C2[1] + Math.sqrt(r2_ * r2_ - (s - C2[0]) ** 2);
  return { C1, C2, T, apexY };
}

/**
 * Arch geometry for a box w × h, in SVG space (y down). Returns the springing
 * line, the four compass centres and their radii, and path builders for the
 * outline at any inset: the same centres with each radius reduced by the
 * inset is an exact parallel curve, because tangent arcs stay tangent.
 */
export function archGeometry(w, h, { haunch = 0.36, phi = 0.75, pointed = 1.9, top = 2 } = {}) {
  const s = w / 2;
  const r1 = haunch * s;
  const R2 = pointed * s;
  const { C1, C2 } = archHalf(s, r1, phi, R2);
  const rise = C2[1] + Math.sqrt(R2 * R2 - (s - C2[0]) ** 2);
  const spring = top + rise;
  const toSvg = ([x, y]) => [x, spring - y];

  const at = (o) => {
    const a = r1 - o;
    const b = R2 - o;
    const T = [C1[0] - a * Math.cos(phi), a * Math.sin(phi)];
    const ay = C2[1] + Math.sqrt(b * b - (s - C2[0]) ** 2);
    return {
      a, b,
      L0: toSvg([o, 0]),
      Lt: toSvg(T),
      A: toSvg([s, ay]),
      Rt: toSvg([w - T[0], T[1]]),
      R0: toSvg([w - o, 0]),
    };
  };

  /** The curve alone, left springing point to right. */
  const curve = (o = 0) => {
    const q = at(o);
    return `A${r2(q.a)} ${r2(q.a)} 0 0 1 ${P(...q.Lt)}A${r2(q.b)} ${r2(q.b)} 0 0 1 ${P(...q.A)}`
      + `A${r2(q.b)} ${r2(q.b)} 0 0 1 ${P(...q.Rt)}A${r2(q.a)} ${r2(q.a)} 0 0 1 ${P(...q.R0)}`;
  };
  /** Jamb, curve, jamb: the open outline down to the foot of the box. */
  const outline = (o = 0) => {
    const q = at(o);
    const foot = h - o;
    return `M${P(q.L0[0], foot)}L${P(...q.L0)}${curve(o)}L${P(q.R0[0], foot)}`;
  };
  /** The two spandrels: the box above the springing line, minus the arch. */
  const spandrel = () => `M${P(0, spring)}${curve(0)}L${P(w, 0)}L0 0Z`;

  return {
    w, h, spring, rise,
    outline, spandrel,
    apex: at(0).A,
    tangents: [at(0).Lt, at(0).Rt],
    centres: [toSvg(C1), toSvg([w - C1[0], 0]), toSvg(C2), toSvg([w - C2[0], C2[1]])],
    radii: [r1, r1, R2, R2],
  };
}

/** An arc guide on centre c, radius r, from point p to point q (clockwise),
    lengthened at both ends so it reads as a compass sweep, not a trace. */
function sweep(c, r, p, q, over, cls, d, t) {
  const a1 = Math.atan2(p[1] - c[1], p[0] - c[0]) - over;
  const a2 = Math.atan2(q[1] - c[1], q[0] - c[0]) + over;
  const from = [c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1)];
  const to = [c[0] + r * Math.cos(a2), c[1] + r * Math.sin(a2)];
  const large = ((a2 - a1 + TAU) % TAU) > Math.PI ? 1 : 0;
  return `<path d="M${P(...from)}A${r2(r)} ${r2(r)} 0 ${large} 1 ${P(...to)}" ${attrs(cls, d, t)}/>`;
}

export function arch({ w, h, inset = 9, speed = 1, id = 'arch', spandrel = null, ...opts }) {
  const g = archGeometry(w, h, opts);
  // Spandrels carry the star field, as the tiled spandrels of an iwan do.
  let fill = '';
  let fillDefs = '';
  if (spandrel) {
    const t = starTile(spandrel);
    const p = r2(t.period);
    fillDefs = `<pattern id="${id}-field" width="${p}" height="${p}" patternUnits="userSpaceOnUse"><path class="field__lines" d="${t.lines}"/></pattern>`;
    fill = `<g class="spandrel" clip-path="url(#${id}-spandrel)"><rect width="${r2(w)}" height="${r2(g.spring)}" fill="url(#${id}-field)"/></g>`;
  }
  const s = speed;
  const [c1l, c1r, c2l, c2r] = g.centres;
  const [tl, tr] = g.tangents;
  const springL = [0, g.spring];
  const springR = [w, g.spring];
  const guides = [
    // The springing line only where the haunch centres sit on it, and the
    // centre line only through the apex: enough to show how the arch was set
    // out, and never long enough to strike through what sits inside it.
    line(-8, g.spring, c1l[0] + g.radii[0] * 0.55, g.spring, 'g-guide', 0, 0.24 * s),
    line(c1r[0] - g.radii[1] * 0.55, g.spring, w + 8, g.spring, 'g-guide', 0.02 * s, 0.24 * s),
    line(w / 2, g.apex[1] - 12, w / 2, g.apex[1] + Math.min(g.rise * 0.28, 60), 'g-guide', 0.04 * s, 0.24 * s),
    sweep(c1l, g.radii[0], springL, tl, 0.5, 'g-guide', 0.1 * s, 0.32 * s),
    sweep(c1r, g.radii[1], tr, springR, 0.5, 'g-guide', 0.14 * s, 0.32 * s),
    sweep(c2l, g.radii[2], tl, g.apex, 0.14, 'g-guide', 0.18 * s, 0.36 * s),
    sweep(c2r, g.radii[3], g.apex, tr, 0.14, 'g-guide', 0.22 * s, 0.36 * s),
  ];
  const inside = ([x, y]) => x > -2 && x < w + 2 && y > -2 && y < h + 2;
  // Only the centres on the springing line, and the apex: the two long-arc
  // centres fall inside the opening, where they read as stray dots by text.
  const pricks = [c1l, c1r, g.apex].filter(inside).map(([x, y]) => dot(x, y, 2)).join('');
  const lines = [
    `<path d="${g.outline(0)}" ${attrs('g-line', 0.36 * s, 0.8 * s)}/>`,
    `<path d="${g.outline(inset)}" ${attrs('g-line g-line--fine', 0.48 * s, 0.8 * s)}/>`,
  ];
  return {
    geometry: g,
    svg: `<svg class="geo geo--arch" viewBox="0 0 ${r2(w)} ${r2(h)}" width="${r2(w)}" height="${r2(h)}" aria-hidden="true" focusable="false">
      <defs><clipPath id="${id}-spandrel"><path d="${g.spandrel()}"/></clipPath>${fillDefs}</defs>
      ${fill}
      <g class="g-guides">${guides.join('')}${pricks}</g>
      <g class="g-lines">${lines.join('')}</g>
    </svg>`,
  };
}

/* ── Eight-fold star field ────────────────────────────────────────────────
   Hankin's method on the octagon–square tiling: from the midpoint of every
   edge two rays leave at the contact angle, one each way, and run until they
   meet the ray from the neighbouring edge. Octagons become eight-pointed
   stars, the square gaps become four-pointed crosses, and the rays cross
   at every shared midpoint the way the rope of a real girih does. Returned as
   one repeating tile for an SVG <pattern>, so a field costs one tile. */
function hankin(vertices, theta) {
  const n = vertices.length;
  const segs = [];
  const mids = [];
  for (let i = 0; i < n; i += 1) {
    const [ax, ay] = vertices[i];
    const [bx, by] = vertices[(i + 1) % n];
    const len = Math.hypot(bx - ax, by - ay);
    const ex = (bx - ax) / len;
    const ey = (by - ay) / len;
    // Vertices run anticlockwise in screen space (y down), so the inward
    // normal is the edge direction turned a quarter the other way.
    const nx = ey;
    const ny = -ex;
    mids.push({
      m: [(ax + bx) / 2, (ay + by) / 2],
      fwd: [Math.cos(theta) * ex + Math.sin(theta) * nx, Math.cos(theta) * ey + Math.sin(theta) * ny],
      back: [-Math.cos(theta) * ex + Math.sin(theta) * nx, -Math.cos(theta) * ey + Math.sin(theta) * ny],
    });
  }
  for (let i = 0; i < n; i += 1) {
    const a = mids[i];
    const b = mids[(i + 1) % n];
    // Solve a.m + t·a.fwd = b.m + u·b.back
    const det = a.fwd[0] * -b.back[1] - a.fwd[1] * -b.back[0];
    if (Math.abs(det) < 1e-9) continue;
    const dx = b.m[0] - a.m[0];
    const dy = b.m[1] - a.m[1];
    const t = (dx * -b.back[1] - dy * -b.back[0]) / det;
    const p = [a.m[0] + t * a.fwd[0], a.m[1] + t * a.fwd[1]];
    segs.push([a.m, p], [b.m, p]);
  }
  return segs;
}

const octagon = (cx, cy, side) => {
  const R = side / (2 * Math.sin(Math.PI / 8));
  // Flat edges facing the axes: vertices at 22.5° + k·45°, listed so that
  // they run anticlockwise on screen.
  return Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 - (i * Math.PI) / 4;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });
};
const diamond = (cx, cy, side) => {
  const R = side / Math.SQRT2;
  return [[cx + R, cy], [cx, cy - R], [cx - R, cy], [cx, cy + R]];
};

export function starTile({ side = 20, theta = (67.5 * Math.PI) / 180 } = {}) {
  const p = side * (1 + Math.SQRT2);
  const lines = [];
  const grid = [];
  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 1) {
      const ox = i * p + p / 2;
      const oy = j * p + p / 2;
      const oct = octagon(ox, oy, side);
      const dia = diamond(ox + p / 2, oy + p / 2, side);
      grid.push(oct, dia);
      lines.push(...hankin(oct, theta), ...hankin(dia, theta));
    }
  }
  const segPath = lines.map(([a, b]) => `M${P(...a)}L${P(...b)}`).join('');
  const gridPath = grid.map((pts) => `M${pts.map((q) => P(...q)).join('L')}Z`).join('');
  return { period: p, lines: segPath, grid: gridPath };
}

/** A <pattern> definition plus a rect that fills with it. */
export function starField({ id, side = 20, theta, width = '100%', height = '100%', guides = false } = {}) {
  const t = starTile({ side, theta });
  const p = r2(t.period);
  return `<svg class="field" width="${width}" height="${height}" aria-hidden="true" focusable="false">
    <defs><pattern id="${id}" width="${p}" height="${p}" patternUnits="userSpaceOnUse">
      ${guides ? `<path class="field__grid" d="${t.grid}"/>` : ''}
      <path class="field__lines" d="${t.lines}"/>
    </pattern></defs>
    <rect width="100%" height="100%" fill="url(#${id})"/>
  </svg>`;
}

/* ── The seal ─────────────────────────────────────────────────────────────
   The cover's button: a gold disc carrying the octagram and, inside its
   central octagon, the couple's initials. */
export function seal({ size = 168 } = {}) {
  const c = size / 2;
  const R = c - 3;
  const star = c * 0.8;
  const rin = innerRadius(8, 3, star);
  const a0 = -Math.PI / 2 + Math.PI / 8;
  const loops = starLoops(8, 3, star, c, c, a0).map((l) => `M${l.map((q) => P(...q)).join('L')}Z`).join('');
  // A second octagon just inside the octagram's own central one, where the
  // initials sit. (Two squares struck on the crossings would lie exactly on
  // the octagram's edges and vanish into them.)
  const hub = ring(8, rin * 0.84, c, c, a0 + Math.PI / 8).map((q) => P(...q)).join('L');
  return `<svg class="seal__art" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="seal-gold" cx="0.36" cy="0.3" r="0.85">
        <stop offset="0" stop-color="#f0dcae"/>
        <stop offset="0.42" stop-color="#cfa95f"/>
        <stop offset="0.8" stop-color="#a27c36"/>
        <stop offset="1" stop-color="#8a6626"/>
      </radialGradient>
    </defs>
    <circle class="seal__disc" cx="${c}" cy="${c}" r="${R}" fill="url(#seal-gold)"/>
    <circle class="seal__rim" cx="${c}" cy="${c}" r="${R - 6}"/>
    <circle class="seal__rim seal__rim--thin" cx="${c}" cy="${c}" r="${star + 4}"/>
    <g class="seal__star">
      <path ${attrs('g-line', 0.1, 0.7)} d="${loops}"/>
      <path ${attrs('g-line g-line--fine', 0.45, 0.45)} d="M${hub}Z"/>
    </g>
  </svg>`;
}

/* ── Octagon frame ───────────────────────────────────────────────────────
   For the countdown: a double octagon struck from one circle, so each unit
   of time sits in a cell of the same star field the cover is made of. */
export function octagonFrame({ size = 132, speed = 1 } = {}) {
  const c = size / 2;
  const R = c - 2;
  const a0 = -Math.PI / 2 + Math.PI / 8;
  const s = speed;
  const pts = ring(8, R, c, c, a0);
  return `<svg class="geo geo--octagon" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <g class="g-guides">${circle(c, c, R, 'g-guide', 0, 0.4 * s)}${pts.map(([x, y]) => dot(x, y, 1.4)).join('')}</g>
    <g class="g-lines">${poly(pts, 'g-line', 0.22 * s, 0.6 * s)}${poly(ring(8, R - 7, c, c, a0), 'g-line g-line--fine', 0.36 * s, 0.6 * s)}</g>
  </svg>`;
}
