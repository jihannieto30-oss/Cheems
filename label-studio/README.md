# PEPTIDEX Label Studio Pro

A **variable-data production system with a protected design system** for PEPTIDEX vial labels — not a vector editor.

> The master artwork is immutable. Operators bind *data* to typed *slots*. The renderer composites master + overlay. Preflight gates export.

## Run it

Open `PEPTIDEX_LabelStudio_Pro.html` in any modern browser. No server, no build, no network — the three masters are embedded.

## Read this first

`ARCHITECTURE.md` opens with a blocking finding about the supplied master artwork. Section 0 explains why the studio grades it `PROOF_ONLY` and refuses to emit a print-production package, and gives the four-step remediation path.

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
