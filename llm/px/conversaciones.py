"""Turnos de conversación construidos a partir de hechos reales del repo.

Con 29.000 tokens de prosa no sale un modelo que converse. Sale, como mucho,
uno que escribe como PEPTIDEX. Para que además aprenda la *forma* de un
diálogo hace falta enseñársela, y aquí es donde hay que tener cuidado:

**Las preguntas se plantillan; las respuestas no se inventan.** Cada respuesta
sale de `library.json` o del cerebro. Si un dato no está, no se rellena — se
omite el turno. Un corpus con hechos inventados enseña al modelo a inventar
con seguridad, que es exactamente el fallo que no se puede permitir un negocio
que vende compuestos.

El formato es el que luego usa Jarvis:

    <|usuario|> what is BPC 157<|jarvis|> BPC 157 …<|fin|>

Las marcas son tokens especiales, así que el modelo no puede confundirlas con
texto ni partirlas por la mitad.
"""

from __future__ import annotations

import json
import os
import random
import re

U, J, F = '<|usuario|>', '<|jarvis|>', '<|fin|>'


# Cómo pregunta la gente por lo mismo. Sólo varía la pregunta.
COMO_PREGUNTAN = {
    'que_es':   ['what is {n}', 'tell me about {n}', '{n}', 'what do you know about {n}',
                 'explain {n}', "what's {n}", 'brief me on {n}', 'talk to me about {n}'],
    'conserva': ['how do I store {n}', 'storage for {n}', 'what temperature for {n}',
                 'how should {n} be kept', 'cold chain for {n}'],
    'solvente': ['what solvent for {n}', 'how do I reconstitute {n}',
                 'what do I mix {n} with', 'diluent for {n}'],
    'clase':    ['what class is {n}', 'what family does {n} belong to',
                 'how is {n} classified', 'what category is {n}'],
    'presenta': ['how does {n} come', 'what presentation for {n}',
                 'what sizes does {n} come in', 'vial format for {n}'],
}

# Y cómo contesta Jarvis. Varias formas para que no salga un loro.
COMO_CONTESTA = {
    'conserva': ['{n} is kept at {v}.', 'Store {n} at {v}.',
                 '{v}, for {n}.', '{n} — {v}. Cold chain, not a shelf.'],
    'solvente': ['{n} reconstitutes with {v}.', 'Use {v} for {n}.',
                 '{v}. That is the solvent on the sheet for {n}.'],
    'clase':    ['{n} sits under {v}.', '{v}. That is where {n} is filed.',
                 'Classified as {v}.'],
    'presenta': ['{n} comes as {v}.', 'Presentation: {v}.',
                 '{v} — those are the two formats.'],
}


def _turno(pregunta: str, respuesta: str) -> str:
    return f'{U} {pregunta}{J} {respuesta}{F}'


def de_compuestos(ruta_lib: str, semilla: int = 7) -> list[str]:
    if not os.path.exists(ruta_lib):
        return []
    rnd = random.Random(semilla)
    fichas = json.load(open(ruta_lib, encoding='utf-8'))
    fuera: list[str] = []

    campos = [('conserva', 'alm'), ('solvente', 'sol'),
              ('clase', 'cat'), ('presenta', 'esp')]

    for e in fichas:
        n = e['n']

        # «qué es» — la respuesta se arma con lo que la ficha tenga, en orden.
        trozos = []
        if e.get('mec'):
            trozos.append(e['mec'].strip().rstrip('.') + '.')
        if e.get('cat'):
            trozos.append(f"Filed under {e['cat'].lower()}.")
        if e.get('esp'):
            trozos.append(f"Comes as {e['esp']}.")
        if e.get('alm'):
            trozos.append(f"Kept at {e['alm']}.")
        if trozos:
            cuerpo = ' '.join(trozos)
            for p in rnd.sample(COMO_PREGUNTAN['que_es'],
                                k=min(3, len(COMO_PREGUNTAN['que_es']))):
                fuera.append(_turno(p.format(n=n), f'{n}. {cuerpo}'))

        for clave, campo in campos:
            v = e.get(campo)
            if not v:
                continue          # sin dato no hay turno. No se rellena.
            for p in rnd.sample(COMO_PREGUNTAN[clave], k=min(2, len(COMO_PREGUNTAN[clave]))):
                r = rnd.choice(COMO_CONTESTA[clave])
                fuera.append(_turno(p.format(n=n), r.format(n=n, v=v)))

        # Las cifras de referencia se citan SIEMPRE con su aviso pegado. Es la
        # única forma de que el modelo no aprenda a soltarlas a secas.
        r = e.get('ref') or {}
        if r.get('ini') or r.get('mant'):
            cif = ' · '.join(x for x in [r.get('ini'), r.get('mant'), r.get('frec')] if x)
            for p in [f'what dose for {n}', f'how much {n}', f'{n} dosage']:
                fuera.append(_turno(
                    p,
                    f'The operations register lists {cif} for {n}. I am quoting a '
                    f'record, not recommending a dose — these are research '
                    f'compounds and that line is not mine to cross.'))

    return fuera


def de_identidad() -> list[str]:
    """Quién es Jarvis. Lo único que no sale de un fichero: sale de la decisión."""
    pares = [
        ('who are you',
         'Jarvis. I run PEPTIDEX — the catalogue, the brain, the five agents, '
         'and the invoicing. I used to live inside the invoicer. I do not anymore.'),
        ('what can you do',
         'I read the catalogue, I know what the brain has decided and why, I know '
         'what each agent has looked at, and I can move things in the invoicer.'),
        ('what is peptidex',
         'PEPTIDEX sells research peptides. Research use only — that constraint '
         'shapes everything, including what I am allowed to say about dosing.'),
        ('who is jihan', 'Jihan runs PEPTIDEX. You, sir.'),
        ('can you recommend a dose',
         'No. I can read you what the operations register has on file, and I will '
         'say plainly that it is a quoted record and not a recommendation.'),
        ('are you an llm',
         'When a model is wired up, yes — I reason. Without it I answer from '
         'rules, which means I only say what is actually in the files.'),
        ('how many compounds do we have',
         'Sixty in the operations register. Ten of them have no milligrams on '
         'file, which is why they do not preload the calculator.'),
        ('who are the agents',
         'Five specialists. Each one watches a different part of the company, and '
         'they only get better when someone adds a rule to them.'),
    ]
    return [_turno(p, r) for p, r in pares]


def de_cerebro(raiz: str, limite: int = 40) -> list[str]:
    """Cada nota del cerebro, como una pregunta por su título."""
    ce = os.path.join(raiz, 'cerebro')
    if not os.path.isdir(ce):
        return []
    fuera = []
    for dirp, dirs, files in os.walk(ce):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'sinapsis']
        for f in sorted(files):
            if not f.endswith('.md') or f.startswith('_'):
                continue
            t = open(os.path.join(dirp, f), encoding='utf-8').read()
            cuerpo = re.sub(r'^---\n.*?\n---\n', '', t, flags=re.S)
            h1 = re.search(r'^#[ \t]+(.+)$', cuerpo, re.M)
            if not h1:
                continue
            titulo = h1.group(1).strip()
            parrafo = ''
            for par in re.split(r'\n\s*\n', cuerpo):
                par = par.strip()
                if par and not par.startswith(('#', '---', '|', '```', '>', '-', '*')):
                    parrafo = re.sub(r'\s+', ' ', par)[:400]
                    break
            if len(parrafo) < 60:
                continue
            ruta = os.path.relpath(os.path.join(dirp, f), raiz)
            fuera.append(_turno(f'what does the brain say about {titulo.lower()}',
                                f'{parrafo} It is in {ruta}.'))
            if len(fuera) >= limite:
                return fuera
    return fuera


def construye(raiz: str, verboso: bool = True) -> str:
    lib = os.path.join(raiz, 'web', 'assets', 'library.json')
    turnos = de_compuestos(lib) + de_identidad() + de_cerebro(raiz)
    rnd = random.Random(11)
    rnd.shuffle(turnos)               # que el orden no sea una señal más
    if verboso:
        print(f'  diálogo: {len(turnos)} turnos · '
              f'{sum(len(t) for t in turnos):,} caracteres')
    return '\n'.join(turnos)
