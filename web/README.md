# PEPTIDEX — web build

## What ships today

`build_restore.py` produces the shipped file:

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

## The platform layer — parked, not deleted

`src/00_tokens.css`, `05_nav.css`, `06_card.css`, `07_stability.css`,
`10_ui.css`, `20_platform.js` and `build_web.py` hold the experience layer
(navigation, membership card, assistant, command palette, dashboard). It is
**not** in the shipped build.

If any part of it is wanted again, re-apply **one piece at a time** and confirm
each one in a real browser before adding the next.
