# -*- coding: utf-8 -*-
"""
Figuras del manual de testeo, dibujadas como SVG inline.

No son capturas de pantalla de un equipo ni imágenes de banco: se calculan.
Un cromatograma es una suma de picos con cola exponencial, y un espectro ESI
es una envolvente de estados de carga sobre una masa dada.  Generarlos desde
la fórmula tiene dos ventajas sobre pegar una imagen: los números que se
anotan encima son exactamente los que produjeron la curva, y el dibujo escala
sin pixelarse en la impresión.
"""
import math


def _emg(x, tr, sigma, tau, h):
    """Pico gaussiano modificado exponencialmente — la forma real de un pico
    cromatográfico con cola.  Una gaussiana pura no tiene cola y por eso nunca
    se parece a un cromatograma de verdad."""
    if tau < 1e-6:
        return h * math.exp(-0.5 * ((x - tr) / sigma) ** 2)
    z = (sigma / tau - (x - tr) / sigma) / math.sqrt(2)
    arg = 0.5 * (sigma / tau) ** 2 - (x - tr) / tau
    if arg > 700:
        return 0.0
    # erfc estable para z grande
    t = 1.0 / (1.0 + 0.5 * abs(z))
    erfc = t * math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (
        0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (
            1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))))
    if z < 0:
        erfc = 2.0 - erfc
    return h * (sigma / tau) * math.sqrt(math.pi / 2) * math.exp(arg) * erfc


def chromatogram(w=980, h=300, pad=52):
    """Cromatograma RP-HPLC de un péptido del 98 %: el pico principal y cuatro
    impurezas típicas, con los tiempos de retención que se anotan en el texto."""
    peaks = [
        # tR    sigma  tau    altura  etiqueta
        (4.10,  0.055, 0.030,  3.2,  None),
        (6.85,  0.048, 0.026,  5.1,  None),
        (8.42,  0.052, 0.048,  9.4,  None),
        (9.60,  0.060, 0.055, 100.0, None),
        (11.35, 0.058, 0.040,  4.6,  None),
    ]
    t0, t1 = 2.0, 14.0
    n = 1400
    xs = [t0 + (t1 - t0) * i / (n - 1) for i in range(n)]
    ys = []
    for x in xs:
        v = sum(_emg(x, *p[:4]) for p in peaks)
        v += 0.55 + 0.32 * (x - t0) / (t1 - t0) * 3      # deriva de gradiente
        v += 0.10 * math.sin(x * 11.0) * math.cos(x * 3.3)  # ruido de base
        ys.append(v)

    ymax = max(ys) * 1.34
    PW, PH = w - pad * 2, h - pad - 34
    X = lambda t: pad + (t - t0) / (t1 - t0) * PW
    Y = lambda v: pad + PH - (v / ymax) * PH

    path = 'M ' + ' L '.join('%.1f %.1f' % (X(x), Y(y)) for x, y in zip(xs, ys))

    grid = []
    for tk in range(2, 15, 2):
        grid.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" class="gr"/>'
                    % (X(tk), pad, X(tk), pad + PH))
        grid.append('<text x="%.1f" y="%d" class="ax">%d</text>' % (X(tk), pad + PH + 16, tk))

    ann = []
    labels = [(4.10, 'imp. 1', '0.42 %'), (6.85, 'imp. 2', '0.61 %'),
              (8.42, 'imp. 3', '0.55 %'), (11.35, 'imp. 4', '0.38 %')]
    for tr, nm, pct in labels:
        yv = max(_emg(tr, tr, .055, .04, 1.0) * 0, 0)
        top = Y(sum(_emg(tr, *p[:4]) for p in peaks) + 1.6)
        ann.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="lead"/>'
                   % (X(tr), top - 8, X(tr), top - 36))
        ann.append('<text x="%.1f" y="%.1f" class="an">%s</text>' % (X(tr), top - 40, nm))
        ann.append('<text x="%.1f" y="%.1f" class="an2">%s</text>' % (X(tr), top - 29, pct))

    mtop = Y(sum(_emg(9.60, *p[:4]) for p in peaks))
    ann.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="lead"/>'
               % (X(9.60), mtop - 6, X(9.60), mtop - 30))
    ann.append('<text x="%.1f" y="%.1f" class="anb">PICO PRINCIPAL · 98.04 %%</text>'
               % (X(9.60), mtop - 45))
    ann.append('<text x="%.1f" y="%.1f" class="an2">t&#8341; 9.60 min &#183; Rs 4.1 &#183; T 1.12 &#183; N 14 800</text>'
               % (X(9.60), mtop - 34))

    return f'''<svg viewBox="0 0 {w} {h}" class="fig" role="img"
  aria-label="Cromatograma RP-HPLC ilustrativo">
  <style>
    .fig .gr{{stroke:#e9ebef;stroke-width:1}}
    .fig .ax{{fill:#8a9099;font-size:11px;font-family:ui-monospace,Menlo,monospace;text-anchor:middle}}
    .fig .tr{{stroke:#0b0d12;stroke-width:1.6;fill:none;stroke-linejoin:round}}
    .fig .fr{{stroke:#c8ccd2;stroke-width:1}}
    .fig .lead{{stroke:#b6bbc3;stroke-width:1}}
    .fig .an{{fill:#4d525c;font-size:10px;font-family:Inter,system-ui,sans-serif;text-anchor:middle;font-weight:600}}
    .fig .anb{{fill:#0b0d12;font-size:11px;font-family:Inter,system-ui,sans-serif;text-anchor:middle;font-weight:800;letter-spacing:.04em}}
    .fig .an2{{fill:#8a9099;font-size:9.5px;font-family:ui-monospace,Menlo,monospace;text-anchor:middle}}
    .fig .lbl{{fill:#8a9099;font-size:10px;font-family:Inter,system-ui,sans-serif;font-weight:700;letter-spacing:.14em}}
  </style>
  <rect x="{pad}" y="{pad}" width="{PW}" height="{PH}" fill="#fcfcfd" stroke="#e9ebef"/>
  {''.join(grid)}
  <path d="{path}" class="tr"/>
  {''.join(ann)}
  <text x="{pad}" y="{pad - 14}" class="lbl">RESPUESTA UV 214 nm</text>
  <text x="{w - pad}" y="{pad + PH + 30}" class="lbl" text-anchor="end">TIEMPO DE RETENCIÓN (min)</text>
</svg>'''


def esi(w=980, h=300, pad=52):
    """Envolvente ESI de una proteína de 22 124 Da (somatropina): la serie de
    estados de carga que hay que deconvolucionar para llegar a la masa."""
    M = 22124.0
    PROTON = 1.00728
    zs = list(range(11, 25))
    zc, sig = 17.5, 3.1
    ions = []
    for z in zs:
        mz = (M + z * PROTON) / z
        inten = 100.0 * math.exp(-0.5 * ((z - zc) / sig) ** 2)
        ions.append((mz, inten, z))

    lo = min(i[0] for i in ions) - 90
    hi = max(i[0] for i in ions) + 130
    PW, PH = w - pad * 2, h - pad - 34
    X = lambda m: pad + (m - lo) / (hi - lo) * PW
    Y = lambda v: pad + PH - (v / 112.0) * PH

    bars, labs = [], []
    for mz, inten, z in ions:
        if inten < 1.2:
            continue
        bars.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="st"/>'
                    % (X(mz), pad + PH, X(mz), Y(inten)))
        if inten > 24:
            labs.append('<text x="%.1f" y="%.1f" class="anb">%d+</text>'
                        % (X(mz), Y(inten) - 16, z))
            labs.append('<text x="%.1f" y="%.1f" class="an2">%.1f</text>'
                        % (X(mz), Y(inten) - 6, mz))

    ticks = []
    m = 900
    while m <= hi:
        if m >= lo:
            ticks.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" class="gr"/>'
                         % (X(m), pad, X(m), pad + PH))
            ticks.append('<text x="%.1f" y="%d" class="ax">%d</text>' % (X(m), pad + PH + 16, m))
        m += 200

    return f'''<svg viewBox="0 0 {w} {h}" class="fig" role="img"
  aria-label="Envolvente de estados de carga ESI">
  <style>
    .fig .st{{stroke:#0b0d12;stroke-width:2.1;stroke-linecap:round}}
  </style>
  <rect x="{pad}" y="{pad}" width="{PW}" height="{PH}" fill="#fcfcfd" stroke="#e9ebef"/>
  {''.join(ticks)}
  <line x1="{pad}" y1="{pad + PH}" x2="{w - pad}" y2="{pad + PH}" class="fr"/>
  {''.join(bars)}{''.join(labs)}
  <text x="{pad}" y="{pad - 14}" class="lbl">ABUNDANCIA RELATIVA (%)</text>
  <text x="{w - pad}" y="{pad + PH + 30}" class="lbl" text-anchor="end">m/z</text>
</svg>'''
