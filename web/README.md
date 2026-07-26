# PEPTIDEX — web build

## What ships today

`build_restore.py` produces the shipped file:

```
python3 build_restore.py     # PEPTIDEX.base.html + supplied vial artwork → PEPTIDEX.html
```

That is the **original site**, unchanged, with exactly one difference: the three
line vials now wear the supplied production label artwork. Normalise the base64
images out of both files and they are byte-identical — no CSS rule and no line
of script is added, so nothing new can move, shake or re-layout.

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
