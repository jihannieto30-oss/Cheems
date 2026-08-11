# OWS — Online Welding Supply

The welding knowledge engine. Search materials, processes, standards and defect
diagnosis in one index.

Served at **`/unibraze/`** as a second Vite entry point alongside the Cheems app at
`/`. Separate HTML, separate root, separate CSS; neither app imports the other.

## Design system

Taken from the brand sheets, not invented here.

| Token      | Value                          | Use                                     |
| ---------- | ------------------------------ | --------------------------------------- |
| Surfaces   | `#000` `#0A0A0A` `#111` `#1A1A1A` | page, panels, rows                   |
| Ink        | `#FFF` `#9A9A9A` `#5A5A5A`     | title, body, meta                       |
| Accent     | `#E10600`                      | direction and state only — never a fill  |
| Type       | Space Grotesk 300–700          | self-hosted, `public/unibraze/fonts`, SIL OFL |

The OWS mark stays white in every placement, per the identity sheet. Red marks
arrows, active tabs, rail position, the section tick and defect bullets. It is
never used as a background or a large field.

## Routes

Real URLs, one view each — nothing is a scroll position on the home page.

```
/                    home      welcome · search · nomenclature
/catalog             catalogue 10 sections, 171 designations
/search?q=…          results   tabbed, counted, URL-driven
/record/:id          record    technical sheet
/browse/:facet       index     materials · processes · standards · documents · guides
/about               about
```

History mode when served over HTTP; **hash mode when opened from `file://`**,
which is what makes the single-file build navigable.

`vite.config.js` carries an `ows-spa-fallback` plugin, because Vite's own SPA
fallback serves the **root** `index.html` for unmatched paths — which silently
hands `/unibraze/search` to the Cheems app. The plugin rewrites extension-less
`/unibraze/*` requests to the OWS shell for dev and preview, and emits
`dist/unibraze/404.html`. Deploying elsewhere needs the equivalent rule:

```
Netlify   /unibraze/*  /unibraze/index.html  200
nginx     location /unibraze/ { try_files $uri $uri/ /unibraze/index.html; }
```

## Two traps worth knowing about

Both cost real debugging time and both fail **silently in a production build**:

1. **Pages must have a single root element.** `OwsApp` wraps `<RouterView>` in a
   `<Transition>`, and a multi-root page renders as nothing. The dev-only
   warning is stripped from the production bundle.
2. **No `mode="out-in"` on the route transition.** It holds the incoming page
   until the outgoing one signals its leave transition finished; when that
   signal never arrives the view is left empty on every navigation. The
   transition is enter-only, and there is deliberately no `.page-leave-active`
   rule in `styles/base.css`.

Routes are imported eagerly for the same reason — lazy routes deadlock against
the same transition, and the whole app is ~35 kB gzipped.

## Layout

```
ows/index.html                 entry (declared in vite.config.js)
src/unibraze/
  main.js · OwsApp.vue · router/
  pages/       Home · Search · Record · Browse · About · NotFound
  components/
    ArcScene         canvas particle field — the welding arc
    SearchField      type-ahead, navigates to /search or straight to a record
    ResultRow · PopularSearches · RecordVisual
    SiteNav · MenuOverlay · SiteFooter · OwsMark · ParallaxImage
  composables/  useSearch · useParallax · useReducedMotion
  directives/   reveal
  services/     searchProvider
  data/         index (merge layer) · knowledge · details · solutions · taxonomy
```

## Data

`data/index.js` is the only entry point pages read from. It merges the flat
search corpus (`knowledge.js`) with the technical sheet (`details.js`) and the
defect chains (`solutions.js`), and derives the browse facets by predicate — a
new record surfaces in its section with no list to update.

## Connecting a backend

Everything above `services/searchProvider.js` depends only on this contract:

```js
provider.query(text, { limit, signal })
  → { results: [{ record, score }], total, took }
```

`resolveProvider()` returns the local in-memory provider unless
`VITE_OWS_SEARCH_ENDPOINT` is set. Record `id` is the route segment.

## Typography

Space Grotesk in both roles, latin + latin-ext, ~41 kB, nothing fetched at
runtime. Its wide-tracked caps give the headings their engineered look and its
near-monospaced figures keep the composition and property tables aligned.

Display and text stay separate tokens (`--ows-display` / `--ows-display-weight`
and `--ows-sans`) even though they resolve to the same family, so either role
can be swapped without touching a single component. A serif display pairing was
tried and reverted — it read editorial rather than technical.

## The hero

Laid out like a search engine's front door: the OWS mark is the headline, the
field sits directly under it, and the only other thing on screen is the
nomenclature the field accepts. Behind it, `StandardsCascade` drops AWS, EN ISO, DIN, JIS, CN, W.Nr, AISI, CWB,
ASME SFA and ASTM in three parallax planes. Alphas are deliberately low: it is
texture a welder recognises in passing, not something to be read.

Layer order in the hero is load-bearing. `ArcScene` paints on an **opaque**
canvas — it needs one for the frame-fade that draws the spark trails — so it
must render first or it blacks out anything beneath it. The cascade's canvas is
transparent and clears each frame, so it goes second.

## Results

`/search` is not a flat ranked list. A query like `316L` legitimately returns a
consumable, a base metal, a HAZ article and a defect, and those answer different
questions — so results are bucketed by `groupResults()` in `data/index.js` into
consumables, processes, selection, diagnosis, inspection and standards, in that
order: what you can buy, then how to run it, then what goes wrong.

The strongest hit is lifted out as a TOP RESULT card carrying the product visual
and the specification strip, so an exact designation match is answered without a
second click. It only appears on the unfiltered tab — under a tab filter the
"top" result is an artefact of the filter, not of the query.

## Catalogue

`data/catalog.js` holds the 171 designations grouped into the ten sections
Unibraze México sections its range by, and the three product forms — varilla,
rollo, electrodo.

Scope is explicit on the page: every designation is a real published
classification, but per-product chemistry and mechanical data come off a
manufacturer's certificate and are not invented here. Records carrying a full
sheet are flagged `sheet: true`; the rest render as catalogued with
specification pending.

The catalogue merges into the search corpus in `data/index.js`, so typing a
designation finds it whether or not a sheet exists. Hand-written records in
`knowledge.js` win over a catalogue row with the same designation.

## The arc, and the cut

`components/ArcScene.vue` runs in two modes.

`arc` — a stick or MIG arc: spatter thrown in every direction from a point.

`cut` — plasma or oxy-fuel cutting, which the hero uses. A jet driven through
the plate, a glowing kerf trailing behind the torch, and a continuous curtain of
molten material falling and skipping off the floor. Cut particles get their own
colour ramp: they are given a slow decay so they survive the fall, and on the
arc ramp that would leave them reading white for most of their travel — the
opposite of a real cut, where the stream turns orange within a few centimetres
of the plate.

Both are motion-blurred by fading the previous frame rather than clearing it.

It is a **stand-in for photography**, chosen because it weighs nothing, animates,
and reacts to scroll. To move to a real shoot, put the image behind the canvas
and drop `density`. It suspends when scrolled out of view or the tab is hidden,
and paints exactly one still frame under `prefers-reduced-motion`.

Still artwork (`public/unibraze/*.svg`) is generated by `scripts/unibraze-art.mjs`
(`npm run art`) — deterministic and a few kB gzipped each.

Product art (`rod`, `spool`, `electrode`) is the one exception to the
monochrome rule: copper is what the consumable actually is, and the brand's own
product photography shows it. `ParallaxImage` desaturates by default so any
photography dropped in later cannot break the palette — product art passes
`:mono="false"` to opt out.

## Motion

`prefers-reduced-motion` is honoured twice: `tokens.css` zeroes
`--ows-parallax`, collapsing every CSS transform that multiplies by it, and the
JS observers in `useParallax`, `reveal` and `ArcScene` skip their loops entirely
rather than animating to zero.
