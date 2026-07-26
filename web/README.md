# PEPTIDEX — platform layer

A design, motion and personalisation layer that sits **on top of** the existing site.

> It changes no content, no copy, no branding, no logos, no products and no labels.
> It only adds experience: interface, motion, personalisation and interaction.

## Build

```
python3 build_web.py        # PEPTIDEX.base.html + src/ → PEPTIDEX.html (+ index.html)
python3 mk_testbuild.py     # _test.html — CDN libraries swapped for local stubs (testing only)
```

`PEPTIDEX.base.html` is the untouched site and is never edited by hand. The layer is
appended at build time: the CSS after the existing sheet, the JS inside the existing
module so it shares scope with the application.

## What the layer adds

| Source | Contents |
|---|---|
| `src/00_tokens.css` | motion curves, elevation scale, radii, spacing, surfaces, dark theme, density, accessibility, refinement pass over existing components |
| `src/10_ui.css` | precision cursor, command palette, toasts, assistant, member dashboard, avatar studio, settings, notification centre, responsive rules |
| `src/20_platform.js` | preferences store, profile & membership, avatar engine, cursor & magnetics, scroll progress, depth planes, command palette, notification centre, PX Assistant, dashboard and the new account sections, PDF generator, wiring |

## Integration points

The layer wraps five existing functions rather than editing them:
`render`, `syncAccountUI`, `accountHTML`, `acctSectionHTML`, `setAcctSection`,
plus `openProduct`, `toggleFav`, `addToList` and `afterLogin` for activity tracking.

Everything the layer stores lives in `localStorage` under `px-prefs`, `px-ai-log`
and the existing `px-account` record. Nothing is transmitted.

## Debug surface

`window.PXP` exposes `prefs()`, `setPref()`, `toast()`, `openCmd()`, `openAI()`,
`avatarDataURL()`, `buildDoc()`, `tierOf()`, `completion()`, `notify()`, `logActivity()`.
