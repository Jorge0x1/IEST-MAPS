#!/usr/bin/env python3
"""Prepara un plano del campus (exportado de AutoCAD a PDF) para usarlo como
capa de Leaflet y calcula sus límites georreferenciados.

Uso:
    pdftocairo -svg plano.pdf plano.svg          # poppler-utils
    python scripts/preparar-plano.py plano.svg public/mapas/planta-baja.svg

Qué hace con el SVG de pdftocairo:
  - quita el marco de recorte (el borde del área de impresión),
  - junta la transformación que repite cada trazo en un solo <g>,
  - redondea coordenadas y quita atributos por defecto (de ~1.4 MB a ~0.5 MB),
  - engruesa el contorno de los rellenos para tapar las costuras entre los
    triángulos con que AutoCAD exporta los rellenos,
  - recorta el viewBox al área del plano.

Luego ajusta una transformación afín (en Mercator, la proyección de Leaflet) con
los puntos de control de PUNTOS_DE_CONTROL, imprime el error de cada punto y los
límites [[sur, oeste], [norte, este]] que hay que pegar en PLANTA_BAJA.limites
(app/components/mapa-base.ts).

Requiere numpy. Los puntos de control se miden en las unidades del SVG de
pdftocairo (puntos del PDF; y hacia abajo) y se ubican en el mapa real (lat/lng).
"""
import math
import os
import re
import sys

import numpy as np

# (x, y en el plano)  ->  (lat, lng reales). Esquinas del plano de la planta baja.
PUNTOS_DE_CONTROL = [
    ((36.98, 175.16), (22.3253992, -97.8809671)),   # A: arriba a la izquierda
    ((53.9, 695.9), (22.3232741, -97.8808893)),     # B: abajo a la izquierda
    ((550.1, 143.24), (22.3255307, -97.8786953)),   # C: arriba a la derecha
    ((557.72, 654.02), (22.323449, -97.8786618)),   # D: abajo a la derecha
]

# Paleta del mapa: el plano de AutoCAD usa colores oscuros pensados para imprimir;
# en pantalla, con la ruta y los marcadores encima, se ven mejor tonos claros.
# Se cambia cada color (relleno y contorno, que son iguales para tapar costuras).
# Vacío ({}) deja los colores originales de AutoCAD.
PALETA = {
    "#b1ab9b": "#efebe2",  # suelo / plazas y andadores
    "#e0d3c3": "#dccbb3",  # edificios (un poco más marcados que el suelo)
    "#5b612f": "#d3dfbb",  # áreas verdes
    "#283239": "#d9dee4",  # estacionamiento
    "#dbe0e0": "#e8eef3",  # vidrio / agua
    "#000000": "#5a554c",  # contornos y muros (sin negro puro)
}

RADIO = 6378137.0


def mercator(lat, lng):
    return RADIO * math.radians(lng), RADIO * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def mercator_inverso(x, y):
    return math.degrees(2 * math.atan(math.exp(y / RADIO)) - math.pi / 2), math.degrees(x / RADIO)


def preparar_svg(entrada: str, salida: str):
    s = open(entrada, encoding="utf-8").read()

    # Área del plano: el rectángulo del clipPath de pdftocairo.
    m = re.search(r'<clipPath[^>]*>\s*<path[^>]*d="M ([\d.]+) ([\d.]+) L ([\d.]+) [\d.]+ L [\d.]+ ([\d.]+)', s)
    if not m:
        sys.exit("No encontré el rectángulo de recorte en el SVG.")
    x0, y0, x1, y1 = float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4))

    transformaciones = set(re.findall(r'transform="([^"]+)"', s))
    if len(transformaciones) != 1:
        sys.exit(f"Esperaba una sola transformación y hay {len(transformaciones)}.")
    t = transformaciones.pop()

    s = re.sub(r"<defs>.*?</defs>\s*", "", s, flags=re.S)
    s = re.sub(r'<g clip-path="url\(#clip-0\)">.*?</g>\s*', "", s, flags=re.S)
    s = s.replace(f' transform="{t}"', "")
    s = re.sub(r'(<path[^>]*? fill="rgb\([^"]+\)"[^>]*?) stroke-width="2"', r'\1 stroke-width="12"', s)
    for atributo in ['fill-rule="nonzero"', 'fill-opacity="1"', 'stroke-opacity="1"',
                     'stroke-miterlimit="10"', 'stroke-linecap="butt"', 'stroke-linejoin="miter"']:
        s = s.replace(" " + atributo, "")

    def a_hex(c):
        r, g, b = (round(float(v) * 2.55) for v in c.groups())
        return f"#{r:02x}{g:02x}{b:02x}"

    s = re.sub(r"rgb\(([\d.]+)%, ([\d.]+)%, ([\d.]+)%\)", a_hex, s)
    for original, nuevo in PALETA.items():
        s = s.replace(f'"{original}"', f'"{nuevo}"')
    s = re.sub(r'd="([^"]+)"',
               lambda d: 'd="' + re.sub(r"-?\d+\.\d+", lambda n: str(round(float(n.group(0)))), d.group(1)) + '"', s)

    ancho, alto = x1 - x0, y1 - y0
    cuerpo = re.search(r"<svg[^>]*>(.*)</svg>", s, flags=re.S).group(1).strip()
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{ancho:.2f}" height="{alto:.2f}" '
           f'viewBox="{x0} {y0:.6f} {ancho:.6f} {alto:.6f}">\n<g transform="{t}">\n{cuerpo}\n</g>\n</svg>\n')
    os.makedirs(os.path.dirname(os.path.abspath(salida)), exist_ok=True)
    open(salida, "w", encoding="utf-8").write(svg)
    print(f"SVG escrito: {salida} ({len(svg) / 1024:.0f} KB)")
    return x0, y0, x1, y1


def georreferenciar(x0, y0, x1, y1):
    origen = np.array([[x, y, 1] for (x, y), _ in PUNTOS_DE_CONTROL])
    destino = np.array([mercator(*ll) for _, ll in PUNTOS_DE_CONTROL])
    m = np.linalg.lstsq(origen, destino, rcond=None)[0]

    def a_latlng(x, y):
        return mercator_inverso(*(np.array([x, y, 1]) @ m))

    esquinas = [a_latlng(x0, y0), a_latlng(x1, y0), a_latlng(x0, y1), a_latlng(x1, y1)]
    sur, norte = min(e[0] for e in esquinas), max(e[0] for e in esquinas)
    oeste, este = min(e[1] for e in esquinas), max(e[1] for e in esquinas)

    # Comprobación con SOLO los límites, que es lo que usa L.imageOverlay.
    (mx0, my0), (mx1, my1) = mercator(sur, oeste), mercator(norte, este)
    ancho, alto = x1 - x0, y1 - y0
    print("Error en terreno de cada punto de control:")
    for (x, y), (lat, lng) in PUNTOS_DE_CONTROL:
        la, ln = mercator_inverso(mx0 + (x - x0) / ancho * (mx1 - mx0), my1 - (y - y0) / alto * (my1 - my0))
        d_norte = (la - lat) * 111320
        d_este = (ln - lng) * 111320 * math.cos(math.radians(lat))
        print(f"  ({x}, {y}): {math.hypot(d_norte, d_este):.2f} m")

    print("\nPega en app/components/mapa-base.ts (PLANTA_BAJA.limites):")
    print(f"  [{sur:.7f}, {oeste:.7f}],\n  [{norte:.7f}, {este:.7f}],")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    georreferenciar(*preparar_svg(sys.argv[1], sys.argv[2]))
