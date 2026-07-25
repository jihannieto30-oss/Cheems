# PEPTIDEX LABEL STUDIO — Architecture Specification
**Version 1.0 · Principal Engineering Review**

---

## 0. BLOCKING FINDING — Master artwork is not production artwork

Before any architecture is justified, the supplied "master artwork" must be characterised, because it invalidates several stated requirements.

**Forensic analysis of `ChatGPT_Image_25_jul_2026.pdf`:**

| Property | Measured value | Requirement | Verdict |
|---|---|---|---|
| Content | 1 × JPEG, 1535 × 1024 px | Vector | ✖ |
| Fonts embedded | **0** | Preserve typography | ✖ |
| Vector paths | **0** | "Never rasterize editable objects" | ✖ (already raster) |
| Compression | DCTDecode (JPEG, lossy) | Lossless for print | ✖ |
| Effective resolution @46×88 mm | **~255 PPI** | ≥ 300 PPI | ✖ |
| Foil / emboss | Baked into pixels | Separate plates | ✖ |
| Spot / Pantone channels | None | Foil + Spot UV separations | ✖ |

**Consequences that cannot be engineered around:**

1. **You cannot export PDF/X-4 with vector text from a JPEG.** Rasterised type at 255 PPI will show soft edges at the 6–8 pt sizes used for `RESEARCH USE ONLY`.
2. **Hot Foil (Silver / Gold / Rose Gold), Spot UV, Emboss and Deboss are physical processes driven by separate 100 %-K vector plates.** In this file the foil is a *photographic simulation* of foil. A press cannot use it. This is the single most expensive failure mode: a printer will either reject the file or produce a flat CMYK print that looks nothing like the render.
3. **JPEG artefacts around high-contrast type** become visible ghosting under lamination.

**This does not invalidate the project — it validates the specification.** The system requested includes: *"The application should prevent the user from exporting a production file if any critical validation fails."* A correctly built Preflight engine **must reject this exact file for production output**. The architecture below therefore treats master ingestion as a *validated, versioned, typed pipeline*, and this asset is classified `PROOF_ONLY`.

**Remediation path (one-time, external to the software):**

1. Commission a vector rebuild of the three labels in Illustrator (`.ai` + PDF/X-4), typography converted to outlines *or* fonts licensed and embedded.
2. Deliver each finish as its own **spot plate**: `PX_FOIL_SILVER`, `PX_FOIL_ROSEGOLD`, `PX_SPOT_UV`, `PX_EMBOSS`, `PX_WHITE`, each 100 % of a named spot colour, overprint on.
3. Deliver with 3 mm bleed, 2 mm safe area, and a die-cut path on a `DIE_CUT` layer.
4. Ingest those files as `PRODUCTION` masters. The software is already built to consume them (§5).

Until step 1–4 exist, Label Studio operates in **Proof Mode**: it produces correct, validated, on-brand *proofs and digital assets*, and refuses to emit a print-production package.

---

## 1. Product definition

Label Studio is **not** a general vector editor. Rebuilding Illustrator's editing surface would be an error: it would take years, and it would let operators destroy brand integrity — the opposite of the stated goal.

Label Studio is a **Variable-Data Production System with a protected design system.**

> The master artwork is immutable. Operators bind *data* to *named slots*. The renderer composites master + overlay. Preflight gates export.

This is how Esko, Loftware, and packaging pre-press platforms actually work, and it is the correct model for a brand that must ship hundreds of SKUs without a designer in the loop.

**Design principles**

| # | Principle | Enforcement |
|---|---|---|
| 1 | Master artwork is immutable | Stored content-addressed (SHA-256), opened read-only, never written |
| 2 | All edits are non-destructive | Edits are an **overlay document**; master + overlay composited at render |
| 3 | Brand rules are code, not convention | `BrandPolicy` module validates every mutation |
| 4 | Nothing ships unvalidated | `Preflight` returns `Report`; `Exporter` refuses on `severity: blocking` |
| 5 | Every module is replaceable | Modules communicate through interfaces + an event bus, never direct imports of internals |
| 6 | Determinism | Same document + same engine version ⇒ byte-identical export |

---

## 2. Technology stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript (strict)** | Data model correctness is the whole product |
| Runtime | Web (Chromium) + **Tauri** shell | Desktop-class, multi-window, filesystem, offline; Tauri over Electron for footprint and native FS |
| UI | **React 18** + Radix primitives | Dockable panels need composable, accessible primitives |
| State | **Zustand** slices + **Immer** | Structural sharing gives cheap snapshots ⇒ cheap undo |
| History | Custom **command stack** (see §6) | Undo must be semantic, not `JSON.parse(JSON.stringify())` |
| Canvas | **PixiJS (WebGL2)** for viewport, **SVG DOM** for overlay authoring | GPU pan/zoom to 6400 %; SVG keeps text as text |
| PDF read | **pdf.js** (+ operator-list walk for vector extraction) | Only reliable in-browser PDF parser |
| PDF write | **pdf-lib** + custom PDF/X-4 conformance writer | pdf-lib alone does not emit X-4 |
| Colour | **color.js** + ICC via `lcms-wasm` | CMYK/ΔE/ink-coverage must be real, not approximated |
| Raster export | `OffscreenCanvas` in a Worker | Keeps 1200 DPI export off the main thread |
| Persistence | **OPFS** + IndexedDB index | Origin-private FS gives real file handles, quota, and crash-safe writes |
| Sync (v2) | Supabase (Postgres + Storage + RLS) | Already in the PEPTIDEX stack |
| Tests | Vitest + Playwright + **pixel-diff golden masters** | Rendering regressions must fail CI |

---

## 3. Folder structure

```
peptidex-label-studio/
├─ apps/
│  ├─ desktop/                    # Tauri shell, menus, multi-window, updater
│  └─ web/                        # Same UI, browser build (read-only proofing)
├─ packages/
│  ├─ core-model/                 # ← zero dependencies. The heart.
│  │  ├─ src/document/            # Document, Artboard, Layer, Node, Slot
│  │  ├─ src/master/              # MasterAsset, MasterRegistry, hashing
│  │  ├─ src/overlay/             # Overlay ops, bindings, resolution
│  │  ├─ src/geometry/            # Rect, Matrix, Unit (mm|pt|px|in)
│  │  ├─ src/color/               # Color, Spot, Separation, InkCoverage
│  │  └─ src/schema/              # zod schemas + migrations (v1→vN)
│  ├─ core-commands/              # Command objects, invoker, transaction log
│  ├─ core-history/               # Undo/redo stack, coalescing, checkpoints
│  ├─ core-events/                # Typed event bus (module decoupling)
│  ├─ render-engine/
│  │  ├─ src/scene/               # Scene graph, dirty-rect tracking
│  │  ├─ src/raster/              # Pixi renderer, tile cache, LOD
│  │  ├─ src/vector/              # SVG renderer for authoring + export
│  │  ├─ src/effects/             # Foil, SpotUV, Emboss, Lamination simulation
│  │  └─ src/text/                # Shaping, metrics, fallback detection
│  ├─ io-pdf/                     # pdf.js ingest → IR;  PDF/X-4 writer
│  ├─ io-svg/                     # SVG ingest → IR;  SVG writer
│  ├─ io-image/                   # PNG/TIFF encode, ICC embedding
│  ├─ preflight/
│  │  ├─ src/rules/               # One file per rule (see §8)
│  │  └─ src/report/              # Report model, severities, export gate
│  ├─ brand-system/               # BrandPolicy, tokens, approved assets
│  ├─ asset-manager/              # CAS storage, dedup, linked assets, GC
│  ├─ project-store/              # OPFS persistence, autosave, versions, recovery
│  ├─ plugin-host/                # Module registry + sandbox (future modules)
│  ├─ ui-kit/                     # Design system: panels, docking, inputs
│  └─ telemetry/                  # Perf counters, render stats, diagnostics
├─ modules/                       # Pluggable feature modules (§11)
│  ├─ mod-label-studio/           # v1 — this product
│  ├─ mod-packaging-studio/       # v2 stub
│  ├─ mod-mockup-3d/              # v2 stub
│  └─ mod-sku-manager/            # v2 stub
├─ brand/                         # Versioned brand payload (not code)
│  ├─ masters/                    # Approved artwork, content-addressed
│  ├─ fonts/                      # Licensed fonts + license manifests
│  ├─ colors/                     # Spot definitions, ICC profiles
│  └─ templates/                  # Master templates + slot maps
└─ tools/                         # Codegen, golden-master runner, release
```

**Dependency rule (enforced by ESLint boundaries + CI):**

```
apps → modules → packages/*        packages/core-model → (nothing)
```
`core-model` importing a renderer, or a renderer importing React, fails the build.

---

## 4. Data model

### 4.1 Master (immutable)

```ts
interface MasterAsset {
  readonly id: MasterId;               // "sha256:ab12…" — content-addressed
  readonly kind: 'pdf' | 'svg' | 'raster';
  readonly bytes: Uint8Array;          // never mutated
  readonly trim: RectMM;               // trim box
  readonly bleed: number;              // mm
  readonly safe: number;               // mm
  readonly graded: MasterGrade;        // PRODUCTION | PROOF_ONLY | REJECTED
  readonly analysis: MasterAnalysis;   // computed once at ingest, cached
  readonly slots: readonly SlotDef[];  // authored slot map
  readonly separations: readonly Separation[];  // foil/UV/emboss plates
}

interface MasterAnalysis {
  hasVectorText: boolean;
  embeddedFonts: FontRef[];
  missingFonts: string[];
  effectivePPI: number | null;         // null ⇒ pure vector
  colorSpace: 'CMYK' | 'RGB' | 'Gray' | 'Mixed';
  maxInkCoverage: number;              // %
  hasTransparency: boolean;
  spotPlates: string[];
}
```

Grade is derived, never hand-set:

```ts
PRODUCTION  ⟸ vector text ∧ fonts resolved ∧ CMYK|spot ∧ separations present ∧ bleed ≥ 3mm
PROOF_ONLY  ⟸ raster ∨ PPI < 300 ∨ no separations       ← the supplied PDF lands here
REJECTED    ⟸ corrupt ∨ PPI < 150 ∨ ink > 320%
```

### 4.2 Slots — the contract between design and data

A slot is a **named, typed, constrained region** authored once per master.

```ts
interface SlotDef {
  readonly key: SlotKey;            // 'compound' | 'dosage' | 'batch' | …
  readonly type: 'text' | 'qr' | 'barcode' | 'image' | 'colorAccent';
  readonly frame: RectMM;           // position on the trim box
  readonly baseline?: number;
  readonly typography: TypographyLock;   // family/size/tracking/case — locked
  readonly fit: 'shrink-to-fit' | 'fixed' | 'auto-size';
  readonly maxChars?: number;
  readonly allowedValues?: readonly string[];   // e.g. product lines
  readonly required: boolean;
  readonly editableIn: Mode[];      // ['production','designer'] etc.
}
```

Slots are why the software cannot damage the brand: **an operator can change the value in a slot, never the slot itself.**

### 4.3 Document (the only mutable thing)

```ts
interface LabelDocument {
  id: DocumentId;
  schemaVersion: number;
  masterRef: MasterId;                 // reference, never a copy
  artboards: Artboard[];
  bindings: Record<SlotKey, SlotValue>;   // ← operator data
  overlay: OverlayNode[];                 // designer-mode additions only
  variables: Record<string, Primitive>;   // global variables
  finishes: FinishSpec[];                 // foil/UV/emboss intent
  meta: { sku?: string; createdBy: UserId; createdAt: ISO; … };
  history: CommandRecord[];               // full semantic audit trail
}
```

**Rendering is a pure function** — this is what makes editing non-destructive:

```ts
render(master: MasterAsset, doc: LabelDocument, opts: RenderOpts): Frame
```

Nothing in `render` can write to `master`. Undo is just replaying a shorter command list.

---

## 5. Rendering engine

Three renderers behind one interface — chosen by intent, not by convenience.

```ts
interface Renderer {
  render(scene: Scene, target: RenderTarget, opts: RenderOpts): Promise<Frame>;
}
```

| Renderer | Target | Used for |
|---|---|---|
| `PixiRenderer` (WebGL2) | Viewport | Interactive canvas, 6400 % zoom, effect simulation |
| `SvgRenderer` | DOM / string | Overlay authoring, SVG export, vector fidelity |
| `PdfRenderer` | PDF byte stream | PDF/X-4, preserves vectors + spot plates |

**Compositing pipeline (viewport)**

```
1  Master layer      → immutable texture (vector: tessellated per-zoom LOD)
2  Overlay layer     → SVG rendered to texture, invalidated by dirty rect only
3  Finish layer      → shader pass: foil (anisotropic), spot-UV (specular),
                       emboss (normal-map from plate), lamination (roughness)
4  Guides layer      → bleed / trim / safe / grid / smart guides   (never exported)
5  Proof layer       → CMYK soft-proof LUT, ink-coverage heat map, overprint
```

Key decisions:

- **Tile cache + dirty rectangles.** Editing one text slot re-renders one tile, not the artboard. This is what makes 6400 % zoom feel instant.
- **LOD for vector masters.** Tessellation is regenerated per zoom decade, cached by `(masterId, zoomBucket)`.
- **Effects are shaders, never baked.** A foil simulation must be toggleable and must *never* enter the export raster — export reads the *plate*, not the simulation.
- **Text is never rasterised in the vector path.** SVG and PDF exports carry real glyphs.

**Performance budget (enforced in CI):**

| Operation | Budget |
|---|---|
| Keystroke → pixel | < 16 ms |
| Zoom step | < 8 ms |
| Artboard switch | < 100 ms |
| 300 DPI export (1 label) | < 900 ms |
| 1200 DPI export (1 label) | < 6 s |
| Autosave | < 50 ms, off main thread |

---

## 6. State management & history

State is split into **document state** (undoable, persisted) and **session state** (not undoable: zoom, selection, panel layout).

Every mutation is a **Command**:

```ts
interface Command<P = unknown> {
  readonly type: string;             // 'slot.setValue'
  readonly payload: P;
  readonly scope: 'document' | 'session';
  apply(draft: Draft<LabelDocument>): void;      // Immer draft
  invert(before: LabelDocument): Command;        // exact inverse
  coalesceWith?(next: Command): Command | null;  // typing → one undo step
  validate?(state: LabelDocument, policy: BrandPolicy): Violation[];
}
```

Why command objects rather than state snapshots:

- **Semantic undo.** "Undo typing", not "undo 40 keystrokes".
- **Audit trail.** Regulated packaging requires knowing *who changed the lot number and when*. The command log **is** the audit log.
- **Cheap.** Immer structural sharing means a snapshot is pointer copies; 500 undo levels cost almost nothing.
- **Replayable.** Crash recovery = replay the log from the last checkpoint.
- **Collaboration-ready.** Commands are the natural unit for CRDT/OT in v3.

`BrandPolicy.validate` runs **before** apply. In Production Mode a command touching a locked node is rejected at the invoker — the UI never even has to know.

---

## 7. Component hierarchy

```
<App>
├─ <ModeProvider>                 production | designer | admin
├─ <CommandProvider>              invoker + history
├─ <DocumentProvider>             active document + master
└─ <Workspace>                    dockable, persisted, presets
   ├─ <MenuBar/> <Toolbar/> <ModeBadge/>
   ├─ <DockZone side="left">
   │   ├─ <ProjectExplorer/>      files, search, recents
   │   ├─ <BrandLibrary/>         masters, logos, colors, components
   │   └─ <AssetManager/>         linked assets, integrity
   ├─ <CanvasHost>                ← the only GPU surface
   │   ├─ <Rulers/> <Artboards/> <SmartGuides/> <SelectionOverlay/>
   │   └─ <ZoomHUD/> <RenderStats/>
   ├─ <DockZone side="right">
   │   ├─ <SlotInspector/>        ← primary Production Mode surface
   │   ├─ <TransformPanel/> <TypographyPanel/> <ColorPanel/>
   │   ├─ <LayersPanel/> <FinishesPanel/>
   │   ├─ <PreflightPanel/>       live validation
   │   └─ <HistoryPanel/>
   └─ <DockZone side="bottom">
       ├─ <VersionTimeline/> <DiffViewer/>   before/after, pixel-diff
       └─ <ExportQueue/> <Diagnostics/>
```

In **Production Mode** the right dock collapses to `SlotInspector` + `PreflightPanel`. An operator sees a form and a canvas — nothing they can break.

---

## 8. Preflight engine

Rules are independent, pure, and individually testable:

```ts
interface PreflightRule {
  id: string;                       // 'resolution.min-ppi'
  severity: 'blocking' | 'warning' | 'info';
  appliesTo: (ctx: PreflightContext) => boolean;
  run: (ctx: PreflightContext) => Violation[];
  autofix?: (ctx: PreflightContext) => Command[];
}
```

**v1 rule set**

| Rule | Severity |
|---|---|
| `master.grade` — master is `PRODUCTION` | blocking |
| `resolution.min-ppi` ≥ 300 (600 for foil plates) | blocking |
| `bleed.present` ≥ 3 mm | blocking |
| `safe-area.respected` — no live matter inside 2 mm | blocking |
| `text.min-size` ≥ 5 pt (≥ 6 pt reversed) | blocking |
| `fonts.resolved` — no fallback substitution | blocking |
| `color.space` — CMYK or spot for production | blocking |
| `ink.coverage` ≤ 300 % (320 % absolute) | blocking |
| `separations.present` for each declared finish | blocking |
| `qr.quiet-zone` ≥ 4 modules ∧ module ≥ 0.4 mm | blocking |
| `qr.decodes` — round-trip decode of the rendered QR | blocking |
| `slots.required` — all required slots bound | blocking |
| `brand.assets` — only approved logos/colours | blocking |
| `rich-black` — large blacks use rich black | warning |
| `overprint.small-text` | warning |
| `hairline.min-width` ≥ 0.25 pt | warning |
| `barcode.contrast` | warning |

`Exporter.export()` calls `Preflight.run()` first. Any `blocking` violation ⇒ **export is refused**, no file is written. Every emitted package embeds `validation-report.json` + a human-readable PDF report.

Applied to the supplied artwork, `master.grade`, `resolution.min-ppi` and `separations.present` all fail — correctly.

---

## 9. Export pipeline

```
Document ─▶ Preflight ─▶ [gate] ─▶ Scene ─▶ Renderer ─▶ Encoder ─▶ Package
                            │
                            └─ blocking ⇒ abort + report
```

| Target | Engine | Notes |
|---|---|---|
| SVG | `SvgRenderer` | Real `<text>`, embedded fonts optional |
| PDF (editable) | `PdfRenderer` | Layers preserved, slots as form-free text |
| **PDF/X-4** | `PdfRenderer` + conformance writer | Output intent, no transparency flattening, spot plates intact |
| PNG / PNG-α | Worker + `OffscreenCanvas` | 300 / 600 / 1200 DPI |
| TIFF | `io-image` | LZW, CMYK, ICC embedded |
| EPS-compatible | PDF with EPS preview | For legacy RIPs |
| **Print package** | `.zip` | artwork + separations + die line + fonts + `validation-report.json` + `manufacturing-spec.md` |
| Batch | Job queue in Worker pool | N SKUs × M finishes, deterministic naming |

---

## 10. Persistence, autosave, recovery

- **Content-addressed store.** Masters and assets keyed by SHA-256 ⇒ automatic dedup, integrity check on load, and *proof that the master never changed*.
- **Documents as append-only command log + periodic checkpoint.** Autosave writes the delta (< 50 ms). Crash recovery replays log → checkpoint + tail.
- **Versions** are named checkpoints; `DiffViewer` does structural diff *and* pixel diff between any two.
- **Portable project file** `.pxlabel` = zip of `document.json` + `masters/` + `assets/` + `manifest.json`.

---

## 11. Extensibility — future modules

Modules register against the host; the core never imports a module.

```ts
interface StudioModule {
  id: string; version: string;
  activate(host: StudioHost): Disposable;
  contributes?: {
    panels?: PanelContribution[];
    commands?: CommandContribution[];
    exporters?: ExporterContribution[];
    preflightRules?: PreflightRule[];
    documentKinds?: DocumentKind[];
  };
}
```

`Packaging Studio`, `3D Mockup`, `SKU Manager`, `Cost Estimator`, `ERP/CRM bridges`, `AI Assistant` all attach here. `DocumentKind` is the extension point that lets a carton or a bottle reuse the same canvas, history, preflight and export machinery without touching v1 code.

---

## 12. Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 · Foundations** (2 wk) | Monorepo, `core-model`, schemas, CI, golden-master harness | `render()` is pure; boundary lint passes |
| **1 · Proof Studio** ★ | Master ingest + analysis, slot binding, SVG/Pixi render, Production Mode, preflight, PNG/SVG export, autosave | Operator produces a validated **proof** for any SKU without touching design |
| **2 · Production** | Vector masters, PDF/X-4, separations, ink coverage, ICC soft-proof, print package | A commercial printer accepts the package unmodified |
| **3 · Studio** | Designer Mode, layers, transform, typography, components, multi-artboard, infinite canvas, docking | Designer edits a master and republishes it as a new immutable version |
| **4 · Scale** | Batch export, SKU manager, versions/diff, cloud sync, roles | 100 SKUs exported in one job, fully validated |
| **5 · Platform** | Plugin host, Packaging Studio, 3D mockups, ERP/CRM, analytics | Third module ships without core changes |

★ Phase 1 is what the accompanying reference implementation demonstrates.

---

## 13. Reference implementation shipped with this document

`PEPTIDEX_LabelStudio_Pro.html` is a **single-file, zero-build reference implementation of Phase 1**. It is deliberately internally modular — every module boundary maps 1:1 to a `packages/` directory above — so the code migrates into the monorepo without redesign.

| In-file module | Maps to | Depends on |
|---|---|---|
| `CORE` | `packages/core-model` | nothing |
| `MASTERS` | `packages/io-master` | core |
| `BRAND` | `packages/brand` | core |
| `ENGINE` | `packages/engine-render` | core, brand |
| `STATE` | `packages/state` | core, brand |
| `PREFLIGHT` | `packages/preflight` | core, brand, engine |
| `EXPORTER` | `packages/export` | core, engine, preflight |
| `PERSIST` | `packages/persist` | core, state |
| UI IIFE | `apps/studio` | everything |

### 13.1 How the master was prepared

The supplied PDF is a single 1535 × 1024 JPEG carrying three label panels. Variable-data production needs the *static* artwork separated from the *variable* fields, so each panel was cropped at native resolution and the two variable-data zones — the compound band interior and the dosage line — were reconstructed by coarse-to-fine diffusion **constrained to a strip that contains only band pixels**, then re-grained to match the surrounding artwork.

This is the standard pre-press step of building a **clean plate**. Nothing was redesigned, recoloured, redrawn or moved. The logo, the wordmark, the tagline, the line word, the rules, the band gradient and every piece of static copy are the original pixels, untouched. The outermost 3 px ring was replaced with the artwork just inside it so bleed-by-edge-extension pulls real artwork outward instead of the photo background.

### 13.2 Two artboards

| Artboard | Source | Grade | Carries |
|---|---|---|---|
| **FRONT** | the immutable master | `PROOF_ONLY` | compound, dosage |
| **BACK** | generated vector | `PRODUCTION` | compound, dosage, lot, MFG, EXP, verification QR, serial, legal copy |

The back panel exists because a compliant QR needs a 0.4 mm module — 176 px at this trim — and there is no room for that on the front without touching the artwork. The data panel is generated, so it is genuinely vector, genuinely ≥ 6 pt, and genuinely production-grade. Regulatory data now has a legal home that does not require modifying the master.

### 13.3 What is implemented and verified

Content-addressed immutable master registry with SHA-256 integrity verification · master ingest with measured analysis and derived grading · slot model, binding, shrink-to-fit, per-mode locking · pure `render()` emitting a resolution-independent display list · Canvas and SVG renderers driven from the same list · command stack with unlimited semantic undo/redo, coalescing and audit log · Production / Designer / Administrator modes with policy enforced at the invoker · **20-rule preflight engine** with an export gate that writes no bytes when blocked · QR generation **and independent round-trip decoding** (format BCH, unmask, zig-zag, Reed–Solomon syndromes, payload parse) · PNG 300/600/1200 DPI with synthetic bleed · SVG with real `<text>` and a vector QR path · print/proof package `.zip` with `validation-report.json`, `manufacturing-spec.md` and the master hash manifest · batch export across a whole product line · autosave, named versions, crash recovery, `.pxlabel` import/export · brand library and palette · canvas to 6400 % with rulers, bleed, safe area, grid and slot outlines · keyboard shortcuts · dark/light.

Verified in headless Chromium: all **118 SKUs** render and pass proof preflight with no shrink and no exceptions; the export gate refuses on an emptied required slot; Production Mode refuses a finish change; undo/redo round-trips; and the QR was decoded **back out of the exported 300 DPI PNG** by an independent decoder at 0.47 mm modules.

### 13.4 What is not implemented

PDF/X-4 writer with an output intent · ICC-accurate CMYK conversion and soft proofing · real separation plates · the Tauri desktop shell and multi-window workspace. These are Phase 2 and they are specified above. They are also blocked on the vector rebuild described in §0 — writing them today would produce a file that *claims* production compliance from artwork that cannot deliver it, which is precisely the failure mode this architecture exists to prevent.

---

*Document owner: Principal Engineering. Changes require review — this file governs every module boundary in the codebase.*
