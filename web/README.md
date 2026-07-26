# PEPTIDEX — web build

## What ships today

`build_restore.py` produces the shipped file:

```
python3 build_restore.py     # PEPTIDEX.base.html + supplied vial artwork → PEPTIDEX.html
```

It applies exactly two things to the base file:

1. **The supplied vial artwork** — the three line vials, built by `mk_vials.py`.
2. **The motion governor** — `src/30_motion.css` + `src/31_motion.js`, a purely
   subtractive patch. It adds no colour, layout, typography, spacing or markup.

### What the governor removes

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

`mk_vials.py` builds those images. It projects each supplied panel onto the
production vial photograph by inverse cylindrical sampling of the original
pixels: nothing is redrawn, re-typeset, recoloured or stretched, and the seat
height is derived from each panel's own aspect ratio so the scale is uniform.

## The platform layer — parked, not deleted

`src/` and `build_web.py` hold the experience layer (navigation, membership
card, assistant, command palette, dashboard, motion). It is **not** in the
shipped build.

It kept breaking the live site in ways the local harness could not reproduce:
the CDN is unreachable here, so GSAP, Lenis and Three.js are replaced by stubs
and every motion change is effectively untested. Two separate regressions
reached the user that way.

If any part of it is wanted again, re-apply **one piece at a time** and confirm
each one in a real browser before adding the next.
