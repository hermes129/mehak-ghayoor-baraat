# Mehak & Ghayoor — the Baraat

A client invitation: the baraat of Mehak, daughter of Syed Hassam Uddin and
Tahseen Hassam, with Ghayoor Raza, son of Raza Hussain Kazmi and Rashida
Kazmi. Friday 8 January 2027, arrival 9 pm, Royal Sapphire, Plot # B-54, 13B,
Block 1, Gulistan-e-Johar, Karachi. No dress code, at the client's request.

## The idea: compass and rule

Islamic geometric ornament is set out with a compass and a straight edge
before a single gold line is drawn. Every ornament on this page is generated
that way in `src/geometry.js` and returned in two layers: the construction
(circles, radii, springing lines, pricked centres) and the gold it implies.
`src/construct.js` draws the guides, then the gold, then lets the guides
settle to a faint ghost, the way a set-out survives under finished work.

- **Rosettes** are star polygons {n/k} struck on a pricked circle, with the
  inner star taken from where the edges cross.
- **Arches** are Mughal four-centred arches: a small haunch arc on the
  springing line hands over at a tangent to a long arc from a centre below,
  so the long arcs meet in a point. Offsets use the same centres, so the
  inner line is an exact parallel.
- **The star field** is Hankin's method on the octagon–square tiling at a
  67.5° contact angle: eight-pointed stars in the octagons, crosses between.
  It is one SVG pattern tile, so a full-screen field costs one tile.

The cover's gold seal draws itself on load. Pressing it turns the star and a
compass circle struck from where it sat opens the card outwards, with the
hero arch already being set out behind it.

No photographs and no generated imagery: everything is drawn in code.

## Type and colour

Marcellus for display, EB Garamond for text, Amiri Quran for the Bismillah
and the verse. Ivory `#f5eedf`, gold `#b08c47` for lines only, `#7b5b21` for
gold text (5.41:1 on ivory), night `#142338` with `#d9bd80` (8.70:1).

The Arabic is the Uthmani text from api.alquran.cloud, inserted by script,
never retyped: the Bismillah and Qur'an 51:49, "And all things We have
created by pairs", in Pickthall's 1930 translation, public domain.

## Worth knowing

- Strokes are selected by the `.g-draw` class, **never** `[pathLength]`.
  Chrome matches that attribute selector but does not restyle SVG children
  when an ancestor's class changes, so every disarmed line stayed hidden.
- Nothing is hidden unless script has armed it, and section hosts only start
  building after the cover has gone.
- Arches and countdown octagons are drawn at their rendered pixel size and
  refitted on width changes, so stroke widths stay true without
  `non-scaling-stroke`, which does not mix reliably with `pathLength` dashes.
- RSVP is by call or WhatsApp to the family contacts; there is no form, so
  nothing is collected or sent anywhere. Syed Ghayas Uddin Danish is listed
  by name only, as no number was given.

## Music

Oud by Andy R. Jordan, CC BY-SA 3.0, from Wikimedia Commons, credited in the
footer. 63 seconds, looped, MP3 at 48 kHz. `preload="none"`, started by the
seal press. Older public-domain candidates (a 1931 bashraf, Ravi Shankar's
1937 Raga Tilanga) were turned down: US recordings from those years are
still protected.

## Build

    npm install
    npm run dev
    npm run build   # vite build --base=./
