#!/usr/bin/env python3
"""Manda un fichero markdown por correo, en texto y en HTML.

Sólo biblioteca estándar. `smtplib` y `email` vienen con Python desde siempre,
y meter una dependencia para mandar un correo sería añadir una cosa más que
puede romperse un martes por la mañana.

Se prueba en local sin mandar nada:

    RUTA=cerebro/50-estudios/2026-08-07.md ENSAYO=1 python3 .github/scripts/manda_estudio.py
"""

from __future__ import annotations

import html
import os
import re
import smtplib
import sys
from email.message import EmailMessage


def a_html(md: str) -> str:
    """Markdown a HTML, lo justo para que un correo se lea bien.

    No es un conversor de markdown y no pretende serlo: cubre encabezados,
    negrita, cursiva, código, listas y tablas, que es lo que el estudio usa.
    Todo lo demás pasa como párrafo. Se escapa ANTES de meter marcas, no
    después — al revés se escaparían las propias etiquetas.
    """
    # En markdown, un salto de línea suelto NO separa párrafos: lo que separa
    # es la línea en blanco. El estudio viene con las líneas cortadas a 78
    # caracteres, así que tratar cada línea como un párrafo metía un hueco a
    # media frase — que es lo que hacía la primera versión.
    fuera, en_lista, en_tabla, buffer = [], False, False, []

    def linea(t: str) -> str:
        t = html.escape(t)
        t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
        t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
        t = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', t)
        return t

    def vuelca():
        """Saca lo acumulado como un párrafo, o como el último punto de lista."""
        nonlocal buffer
        if not buffer:
            return
        texto = ' '.join(buffer)
        buffer = []
        if en_lista:
            fuera.append('<li>' + linea(texto) + '</li>')
        else:
            fuera.append('<p>' + linea(texto) + '</p>')

    def cierra():
        nonlocal en_lista, en_tabla
        vuelca()
        if en_lista:
            fuera.append('</ul>')
            en_lista = False
        if en_tabla:
            fuera.append('</table>')
            en_tabla = False

    for cruda in md.split('\n'):
        t = cruda.rstrip()
        if not t.strip():
            cierra()
            continue

        m = re.match(r'^(#{1,4})\s+(.*)$', t)
        if m:
            cierra()
            n = len(m.group(1))
            fuera.append(f'<h{n}>{linea(m.group(2))}</h{n}>')
            continue

        if re.match(r'^\s*[-*]\s+', t):
            vuelca()                       # cierra el punto anterior, si lo había
            if not en_lista:
                fuera.append('<ul>')
                en_lista = True
            buffer.append(re.sub(r'^\s*[-*]\s+', '', t))
            continue

        # Una línea normal dentro de una lista es la continuación del punto:
        # el estudio parte los puntos largos en varias líneas.
        if en_lista:
            buffer.append(t.strip())
            continue

        if t.lstrip().startswith('|'):
            # la fila de guiones separa cabecera de cuerpo; no se pinta
            if re.match(r'^\s*\|[\s:|-]+\|\s*$', t):
                continue
            celdas = [c.strip() for c in t.strip().strip('|').split('|')]
            if not en_tabla:
                cierra()
                fuera.append('<table cellspacing="0" cellpadding="6">')
                en_tabla = True
                fuera.append('<tr>' + ''.join(
                    f'<th align="left">{linea(c)}</th>' for c in celdas) + '</tr>')
            else:
                fuera.append('<tr>' + ''.join(
                    f'<td>{linea(c)}</td>' for c in celdas) + '</tr>')
            continue

        if re.match(r'^\s*(---+|===+)\s*$', t):
            cierra()
            fuera.append('<hr>')
            continue

        if re.match(r'^\s*>\s?', t):        # cita: el aviso de «estudio atrasado»
            cierra()
            fuera.append('<blockquote style="margin:0 0 16px;padding:8px 14px;'
                         'border-left:3px solid #eaeaea;color:#6b6b6b;">' +
                         linea(re.sub(r'^\s*>\s?', '', t)) + '</blockquote>')
            continue

        buffer.append(t.strip())            # se acumula; se vuelca al hueco

    cierra()
    cuerpo = '\n'.join(fuera)
    return f"""<!doctype html><html><body style="margin:0;padding:24px;
background:#fff;color:#111;font:15px/1.6 -apple-system,BlinkMacSystemFont,
'Segoe UI',Inter,sans-serif;">
<div style="max-width:640px;margin:0 auto;">
{cuerpo}
<hr style="border:0;border-top:1px solid #eaeaea;margin:32px 0 12px;">
<p style="font-size:12px;color:#6b6b6b;">Lo escriben Vera, Lex, Iris, Lira y
Atlas cada mañana. Vive en <code>cerebro/50-estudios/</code>, en el repo, para
que el de mañana pueda leer el de hoy.</p>
</div></body></html>"""


def main() -> int:
    ruta = os.environ.get('RUTA', '')
    if not ruta or not os.path.exists(ruta):
        print(f'no encuentro {ruta!r}', file=sys.stderr)
        return 1

    md = open(ruta, encoding='utf-8').read()
    # El frontmatter es para las herramientas, no para quien lee el correo.
    # Sin quitarlo salía una regla horizontal y dos párrafos sueltos («fecha:
    # 2026-08-07», «tipo: estudio») antes del título.
    md = re.sub(r'\A---\n.*?\n---\n+', '', md, flags=re.S)
    fecha = os.environ.get('FECHA') or os.path.basename(ruta)[:-3]
    atrasado = os.environ.get('ATRASADO') == 'si'

    asunto = f'Estudio PEPTIDEX · {fecha}'
    if atrasado:
        asunto += ' (el último disponible)'
        md = ('> Hoy no había estudio nuevo. Va el último que hay — si esto se\n'
              '> repite dos días, la Rutina de las 7 no está corriendo.\n\n') + md

    # El ensayo va ANTES de leer las credenciales: si no, probar el formato en
    # local exigía tener a mano la contraseña de aplicación, que es justo lo
    # que no debe hacer falta para mirar cómo queda un correo.
    if os.environ.get('ENSAYO'):
        print('Asunto:', asunto)
        print()
        print(md)
        with open('/tmp/estudio.html', 'w', encoding='utf-8') as f:
            f.write(a_html(md))
        print('\n[html en /tmp/estudio.html]')
        return 0

    msg = EmailMessage()
    msg['Subject'] = asunto
    msg['From'] = os.environ['SMTP_USUARIO']
    msg['To'] = os.environ['ESTUDIO_PARA']
    msg.set_content(md)
    msg.add_alternative(a_html(md), subtype='html')

    host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    puerto = int(os.environ.get('SMTP_PUERTO', '587'))
    with smtplib.SMTP(host, puerto, timeout=45) as s:
        s.starttls()
        s.login(os.environ['SMTP_USUARIO'], os.environ['SMTP_CLAVE'])
        s.send_message(msg)
    print(f'enviado a {msg["To"]} · {asunto}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
