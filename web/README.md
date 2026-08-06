# PEPTIDEX — web build

## Two products, two builders

The store and the app are separate documents. They were one until the app
outgrew it: PepX inside `PEPTIDEX.html` meant 5.5 MB of catalogue, pens, vials
and a Three.js stage downloading before anyone could look at when their next
dose is, a specificity firewall written only so the app's classes would not
collide with the store's, and no way to wrap the app in Capacitor without
shipping the shop inside the App Store bundle.

| | source | builder | output | size |
|---|---|---|---|---|
| store | `src/` | `build_restore.py` | `index.html` | 5.3 MB |
| app | `app/` | `build_app.py` | `pepx/index.html` | ~197 KB |

The store links to the app and holds nothing of it (`src/82_door.js`). That
file is also the migration: it bounces old `#/app` bookmarks to `pepx/`, and
retires the root-scope service worker that used to serve the whole site — left
alone it would answer the app's offline requests with the store's index.

The app is the installable one. `pepx/` carries its own manifest, service
worker (scope `pepx/`, so the two never overlap) and icons; see
`pepx/LEEME.txt` for what to upload and what a store submission still needs.

```
python3 build_app.py        # app/ + assets/library.json → pepx/
```

## The store

```
python3 mk_labelkit.py      # supplied panels      → assets/labelkit.json
python3 mk_labtest.py       # the renderer alone   → _labtest.html
node     mk_linevials.mjs   # that renderer, baked → assets/line_*.webp
python3 build_restore.py    # base + label + motion → index.html
```

It applies three things to the base file:

1. **The label system** — `src/40_label.js`, one renderer for every label on
   the site.
2. **The open product** — `src/41_label.css`, so the vial is centred and
   visible when a compound is opened.
3. **The motion governor** — `src/30_motion.css` + `src/31_motion.js`, a purely
   subtractive patch. It adds no colour, layout, typography or markup.

## The label

One renderer draws the landscape band for the three line vials and for every
compound. They cannot drift apart because there is only one of them.

The brand artwork is never drawn. `mk_labelkit.py` cuts three things out of the
supplied panels — the Px lockup, the foil line wordmark, and a band of the bare
plate — and the renderer places them as images. Only the variable data (the
compound, the dose, the standing copy) is typeset, because it has to be.

Cutting the type out needs a background to cut it against, and how the foil
sits in the material differs per panel, so the estimate does too:

| line | finish | the plate is |
|---|---|---|
| fitness | bright foil on black | the local minimum |
| beauty | rose gold on white | the local maximum |
| longevity | silver debossed into silver | a wide blur — a deboss throws a highlight on one side of each stroke and a shadow on the other, so neither extreme is the plate |

`foil` is each line's ink colour, measured from its own wordmark rather than
chosen. Where the measured foil has too little contrast against its own plate
to carry small type — silver on silver — `INK[kind].accent` overrides it.

A line's vial carries the line and nothing else: no compound, no dose.

The band is then projected onto the vial photograph by sampling, and lit with
the photograph's own light: a lambert falloff across the curve, the studio's
two speculars where the photograph puts them, an edge bow, and a hairline of
shade where the vinyl meets the glass.

The glass's highlights go back over the vinyl so the label reads as being under
it — but only the highlights. Screening the whole photograph over the top greys
the black plate out, and thresholding on brightness does not find them either,
because the vial is clear glass shot on white and most of the body is already
near 255. A specular is what is brighter than the glass *beside* it, so each
pixel is measured against a wide horizontal average of its own row.

The three line vials are baked at build time by running that same renderer
headlessly, so the first paint is already right and no second implementation
exists to drift.

### The open product

`#pv` was centred with `transform:translate(-50%,-50%)`, and the governor
anchors it with `transform:none !important` so nothing can move it. That anchor
also cancelled the centring, so the vial hung from the middle of the screen
downwards and ran off the bottom. It is re-centred without a transform, and now
spans the area the right-hand panel leaves free instead of sitting at a third
of the viewport.

## What the governor removes

The instability was never the parallax. Three infinite CSS keyframe loops were
running on the brand assets:

| selector | animation | effect |
|---|---|---|
| `#home-hero .logowrap img` | `breath 7s` | `scale(1) ⇄ scale(1.018)` — the logo pulsed |
| `.vwrap img` | `vfloat 6.5s` | `translateY(-16px) rotate(.8deg)` — the line vial floated |
| `#pv .inner` | `vfloat 6.5s` | same — every compound's vial floated |

Those are gone, and the brand assets carry `transform:none !important`, which
outranks any inline transform an engine may write. On top of that:

- tilt, scale, rotation and shear are stripped from every element
- parallax survives only on `.halo`, `.gword` and `.ghost`, damped to **10 %**
- GSAP calls that target a brand asset are filtered to opacity only, which also
  removes the `back.out(1.35)` overshoot that made each product vial bounce open
- the parallax engine no longer reads layout per frame: each node is measured
  once at rest, output lands on a whole pixel, unchanged values are not written,
  and a pointer move alone triggers no work at all

**Anything anchored with `transform:none !important` must not rely on a
transform for its position.** `#pv` did, and broke. Check the base stylesheet
before adding a selector to that list.

## Testing without the CDN

The sandbox cannot reach the CDN, so GSAP, Lenis and Three.js are unavailable.

- `mk_labtest.py` builds a page that exercises the label renderer alone,
  standing in for only the parts of the site it touches. No stubs, nothing
  faked — what it draws is what ships.
- `mk_testbuild.py` swaps the CDN libraries for stubs so the whole page boots.
  Motion behaviour under stubs is **not** evidence about the real thing; two
  regressions reached the user that way.

## The app

`app/shell.html` + `app/app.css` + `app/app.js` + `assets/library.json`, built
into one file. Two supplied PDFs are the reference and they are not
interchangeable: the mobile one drives the bottom-nav composition, the web one
the sidebar. `app.js` routes; each view decides its own layout, so the phone is
not the desktop shrunk.

Three CSS traps this layout walked into, all of them invisible when reading the
file top to bottom:

- **Media queries add no specificity.** `@media (min-width:1024px){.tabbar
  {display:none}}` followed by `.tabbar{display:flex}` loses on source order,
  and the five-tab bar floated over the desktop sidebar. Anything that toggles
  by breakpoint is declared **off** and switched on inside its block —
  `.tabbar`, `.w-only`, `.m-only`.
- **`overflow` does not apply to non-replaced inline boxes.** `.bd` and its
  `.nm`/`.mt` were spans, so `overflow:hidden` clipped nothing, `nowrap` pushed
  rows 75 px past their slot, and `margin-top` did nothing — «Alex MorganMi
  Perfil» on one line. One `.bd{display:flex;flex-direction:column}` rule now
  covers every appearance; it broke twice because it was written twice.
- **Flex and grid children do not shrink below their content.** `min-width:0`
  on anything that shares a row with text.

Theme is applied **synchronously in `<head>`**, before the first pixel. Left to
the script at the end of the body, the page is born light and jumps to dark on
boot — the white flash that gives away applications that did not think about
it. Light is the factory default; `light | dark | system` persist in
`localStorage`, and `system` follows `prefers-color-scheme` live.

## The platform layer — parked, not deleted

`src/00_tokens.css`, `05_nav.css`, `06_card.css`, `07_stability.css`,
`10_ui.css`, `20_platform.js` and `build_web.py` hold the experience layer
(navigation, membership card, assistant, command palette, dashboard). It is
**not** in the shipped build.

If any part of it is wanted again, re-apply **one piece at a time** and confirm
each one in a real browser before adding the next.
