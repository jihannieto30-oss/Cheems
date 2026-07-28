# PEPTIDEX Label Studio Pro

A **variable-data production system with a protected design system** for PEPTIDEX vial labels — not a vector editor.

> The master artwork is immutable. Operators bind *data* to typed *slots*. The renderer composites master + overlay. Preflight gates export.

## Run it

Open `PEPTIDEX_LabelStudio_Pro.html` in any modern browser. No server, no build, no network — the three masters are embedded.

## Read this first

`ARCHITECTURE.md` opens with a blocking finding about the supplied master artwork. Section 0 explains why the studio grades it `PROOF_ONLY` and refuses to emit a print-production package, and gives the four-step remediation path.

## Two label families

| Family | What it is | Output |
|---|---|---|
| **Portrait master** | The original 46 × 87 mm masters. Immutable raster artwork, variable-data slots. | Proofs (see §0) |
| **Premium Horizontal** | A parametric **vector** template. Every mark is live geometry with its own typography, colour, finish and layer. | SVG · PDF/X-4 · PDF/X-1a · AI · EPS · PNG 600/1200 · TIFF · PSD · separations |

The horizontal family is switched on from **Label family** at the top of the left dock. Choosing it swaps what the stage shows and nothing else — the portrait document stays in memory with its history intact.

### The master is the artwork

`PEPTIDEX_UV_Labels.pdf` is the approved art. `src/mk_hzmaster.py` cuts the three labels out of it, measures the pixel box of every editable element, measures the ink out of each one, and builds a **clean plate** — the same master with the six text regions carried over from their surroundings.

An untouched document draws the master **and nothing else**: no re-typesetting, no re-alignment, no layout pass. Retyping a string patches that element's own measured box from the clean plate and re-sets the string at the master's cap height and baseline; everything outside the box is still the master's own pixels. Verified: an untouched document differs from the approved file by ΔE 0.23–0.59 across the three labels, all inside the 1.0 tolerance.

**Master Layout Lock** is on by default — text and colour are editable, geometry is not. Turned off, an element can be nudged, and validation reports `MASTER LABEL MODIFIED — REVERT REQUIRED` until it is reset. Scaling the trim scales the whole composition uniformly; the aspect is the master's and never moves.

### Superseded: why the first horizontal build was wrong

`PEPTIDEX_UV_Labels.pdf` was analysed the same way every master is: one RGB raster, 1935 × 813 px at **72 PPI**, no embedded font, no vector path, no separation. Registering it would grade `PROOF_ONLY` on ingest, and every capability the brief asks for is impossible against a flat photograph — you cannot make the compound name editable, pull a foil plate out of pixels that only simulate foil, or write PDF/X-4 with live text from a JPEG.

So it is treated as the reference composition it is, and the label is rebuilt as vector geometry with its proportions **measured** off that file (zone divisions at 30.5 % and 65.4 % of trim, and the eight element bands). The one thing not redrawn is the PEPTIDEX lockup: the four supplied files are placed as delivered, and preflight reports the effective PPI wherever one lands.

### UV PRINT READY

Thirteen rules measure the scene about to be written — CMYK separation and total ink, placed-artwork resolution, minimum type size (with separate floors for reversed and foil), type that was reduced to fit, hairlines, bleed, objects outside trim and safe area, ink contrast, live transparency, empty plates, missing die line, and font embedding. `blocking` stops an export at the stated intent.

## Modes

| Mode | Can change | Admin PIN |
|---|---|---|
| **Production** | slot values only | — |
| **Designer** | + finishes, optional slots | — |
| **Administrator** | + master registry, preflight thresholds | required |

## Build from source

```
python3 src/mk_plates.py       # regenerate the clean plates from the master PDF export
python3 src/build_studio.py    # assemble the single file
```

`src/` mirrors the monorepo package boundaries described in `ARCHITECTURE.md` §3 and §13:
`20_core` → core-model, `30_master` → io-master, `40_brand` → brand, `50_render` → engine-render,
`60_state` → state, `70_preflight` → preflight, `80_export` → export, `85_persist` → persist, `90_ui` → apps/studio.

`src/qr_decode_png.py` decodes a QR back out of an exported PNG — an end-to-end scan check that does not
share code with the generator.
