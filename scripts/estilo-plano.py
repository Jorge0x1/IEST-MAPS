"""Estilo visual de los planos ya procesados (public/mapas/*.svg).

1. Cambia la paleta vieja por la cálida (combina con el blanco/naranja de la app).
2. En la planta baja dibuja la cancha de fútbol: franjas de pasto, líneas y porterías.
3. En la planta baja dibuja árboles y jardineras de scripts/decoracion.json
   (coordenadas lat/lng, sacadas del selector de ubicación del admin).

Se puede correr varias veces: la paleta nueva no contiene colores viejos y la cancha
se reemplaza en vez de duplicarse. Solo usa la biblioteca estándar.

    python3 scripts/estilo-plano.py public/mapas/*.svg
"""
import json
import math
import os
import re
import sys

# Paleta vieja (salida de preparar-plano.py antes de nov. 2026) -> paleta cálida.
PALETA = {
    "#efebe2": "#fbf7f2",  # suelo / plazas y andadores
    "#dccbb3": "#ffe9d9",  # edificios
    "#d3dfbb": "#6cc45a",  # áreas verdes
    "#d9dee4": "#e2e5ec",  # estacionamiento
    "#e8eef3": "#9dd8f2",  # vidrio / agua
    "#5a554c": "#c9a58a",  # contornos y muros
}

# Esquinas del campo de fútbol en coordenadas internas del plano (las del
# <g transform> raíz, con la y hacia arriba): noroeste, noreste, sureste, suroeste.
# Salen de los vértices del relleno verde de la planta baja.
CAMPO = [(398, 10291), (3304, 10472), (3426, 6335), (534, 6106)]
# Margen entre el borde del campo y la cancha (fracción del ancho y del largo).
MARGEN_ANCHO, MARGEN_LARGO = 0.09, 0.06

# Medidas reglamentarias en metros (la cancha va a lo largo, de norte a sur).
ANCHO, LARGO = 68.0, 105.0
FRANJAS = 12
VERDE_CLARO, VERDE_OSCURO = "#6cc45a", "#5fb84e"
LINEA = "#ffffff"
GROSOR = 18  # unidades internas (~0.5 m)

INICIO, FIN = "<!--cancha-->", "<!--/cancha-->"

# Límites del plano en el mapa: [[sur, oeste], [norte, este]]. Copia de
# PLANTA_BAJA.limites (app/components/mapa-base.ts): si se recalibra, cambiar ambos.
LIMITES = [[22.3232386, -97.8810681], [22.3255536, -97.8785584]]
DECO_INICIO, DECO_FIN = "<!--decoracion-->", "<!--/decoracion-->"
DECORACION_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "decoracion.json")
RADIO_TIERRA = 6378137.0


def recolorear(svg: str) -> str:
    for viejo, nuevo in PALETA.items():
        svg = svg.replace(f'"{viejo}"', f'"{nuevo}"')
    return svg


def _tiene_campo(svg: str) -> bool:
    x, y = CAMPO[0]
    return re.search(rf'fill="(#d3dfbb|#6cc45a)"[^>]* d="[^"]*\b{x} {y}\b', svg) is not None


def _cuadrilatero():
    """Esquinas de la cancha: el campo encogido hacia adentro."""
    no, ne, se, so = CAMPO

    def mezcla(a, b, t):
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

    def punto(u, v):  # u: oeste->este, v: norte->sur, en el campo completo
        return mezcla(mezcla(no, ne, u), mezcla(so, se, u), v)

    mu, mv = MARGEN_ANCHO, MARGEN_LARGO
    return punto(mu, mv), punto(1 - mu, mv), punto(1 - mu, 1 - mv), punto(mu, 1 - mv)


def _proyector():
    no, ne, se, so = _cuadrilatero()

    def p(x_m, y_m):
        """Metros dentro de la cancha (x: 0..ANCHO oeste->este, y: 0..LARGO norte->sur)."""
        u, v = x_m / ANCHO, y_m / LARGO
        a = (no[0] + (ne[0] - no[0]) * u, no[1] + (ne[1] - no[1]) * u)
        b = (so[0] + (se[0] - so[0]) * u, so[1] + (se[1] - so[1]) * u)
        return (round(a[0] + (b[0] - a[0]) * v), round(a[1] + (b[1] - a[1]) * v))

    return p


def agregar_cancha(svg: str) -> str:
    svg = re.sub(re.escape(INICIO) + ".*?" + re.escape(FIN) + r"\n?", "", svg, flags=re.S)
    if not _tiene_campo(svg):
        return svg
    p = _proyector()

    def ruta(puntos, cerrar=False):
        d = "M " + " L ".join(f"{x} {y}" for x, y in puntos)
        return d + (" Z" if cerrar else "")

    def rect(x0, y0, x1, y1):
        return ruta([p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1)], cerrar=True)

    def circulo(cx, cy, r, a0=0.0, a1=360.0, pasos=48):
        return [p(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
                for a in (a0 + (a1 - a0) * i / pasos for i in range(pasos + 1))]

    partes = []
    franja = LARGO / FRANJAS
    oscuras = " ".join(rect(0, i * franja, ANCHO, (i + 1) * franja) for i in range(1, FRANJAS, 2))
    partes.append(f'<path fill="{VERDE_CLARO}" d="{rect(0, 0, ANCHO, LARGO)}"/>')
    partes.append(f'<path fill="{VERDE_OSCURO}" d="{oscuras}"/>')

    lineas = [rect(0, 0, ANCHO, LARGO), ruta([p(0, LARGO / 2), p(ANCHO, LARGO / 2)]),
              ruta(circulo(ANCHO / 2, LARGO / 2, 9.15), cerrar=True)]
    for y, s in ((0.0, 1), (LARGO, -1)):  # área norte (s=1) y sur (s=-1)
        lineas.append(rect(ANCHO / 2 - 20.16, y, ANCHO / 2 + 20.16, y + s * 16.5))
        lineas.append(rect(ANCHO / 2 - 9.16, y, ANCHO / 2 + 9.16, y + s * 5.5))
        # Media luna fuera del área grande (arco del círculo de 9.15 m alrededor del penal).
        a = math.degrees(math.acos(5.5 / 9.15))
        centro = 90 if s == 1 else -90
        lineas.append(ruta(circulo(ANCHO / 2, y + s * 11, 9.15, centro - a, centro + a, 16)))
    partes.append(f'<path fill="none" stroke="{LINEA}" stroke-width="{GROSOR}" '
                  f'stroke-linejoin="round" d="{" ".join(lineas)}"/>')

    puntos = [(ANCHO / 2, LARGO / 2), (ANCHO / 2, 11), (ANCHO / 2, LARGO - 11)]
    discos = " ".join(ruta(circulo(x, y, 0.5, pasos=8), cerrar=True) for x, y in puntos)
    partes.append(f'<path fill="{LINEA}" d="{discos}"/>')

    porterias = " ".join(rect(ANCHO / 2 - 3.66, y, ANCHO / 2 + 3.66, y - s * 2.2)
                         for y, s in ((0.0, 1), (LARGO, -1)))
    partes.append(f'<path fill="#ffffff" fill-opacity=".55" stroke="{LINEA}" '
                  f'stroke-width="{GROSOR * 1.5:g}" stroke-linejoin="round" d="{porterias}"/>')

    bloque = INICIO + '<g id="cancha">' + "".join(partes) + "</g>" + FIN + "\n"
    # Al final del <g> raíz: queda sobre el relleno del campo (una malla de triángulos).
    i = svg.rfind("</g>")
    return svg[:i] + bloque + svg[i:]


def _mercator(lat, lng):
    return (RADIO_TIERRA * math.radians(lng),
            RADIO_TIERRA * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))


def _marco(svg: str):
    """viewBox (x0, y0, ancho, alto) y la matriz del <g> raíz (a, d, e, f)."""
    vb = list(map(float, re.search(r'viewBox="([^"]+)"', svg).group(1).split()))
    a, _, _, d, e, f = map(float, re.search(r'<g transform="matrix\(([^)]+)\)"', svg).group(1).split(","))
    return vb, (a, d, e, f)


def latlng_a_plano(svg: str, lat: float, lng: float):
    """Lat/lng -> coordenadas internas del <g> raíz, igual que Leaflet coloca el
    plano: el viewBox completo ocupa el rectángulo LIMITES (en Mercator)."""
    (x0, y0, ancho, alto), (a, d, e, f) = _marco(svg)
    (sur, oeste), (norte, este) = LIMITES
    mo, mn = _mercator(norte, oeste)
    me, ms = _mercator(sur, este)
    mx, my = _mercator(lat, lng)
    vx = x0 + ancho * (mx - mo) / (me - mo)
    vy = y0 + alto * (mn - my) / (mn - ms)
    return (vx - e) / a, (vy - f) / d


def _unidades_por_metro(svg: str) -> float:
    (_, _, ancho, _), (a, _, _, _) = _marco(svg)
    (sur, oeste), (norte, este) = LIMITES
    metros = RADIO_TIERRA * math.radians(este - oeste) * math.cos(math.radians((sur + norte) / 2))
    return (ancho / abs(a)) / metros


def _punto(dato):
    if isinstance(dato, dict):
        return float(dato["lat"]), float(dato["lng"]), dato
    return float(dato[0]), float(dato[1]), {}


def agregar_decoracion(svg: str, deco) -> str:
    svg = re.sub(re.escape(DECO_INICIO) + ".*?" + re.escape(DECO_FIN) + r"\n?", "", svg, flags=re.S)
    deco = deco or {}
    arboles, jardineras = deco.get("arboles", []), deco.get("jardineras", [])
    if not _tiene_campo(svg) or not (arboles or jardineras):
        return svg
    upm = _unidades_por_metro(svg)
    partes = []
    for dato in jardineras:
        lat, lng, extra = _punto(dato)
        x, y = latlng_a_plano(svg, lat, lng)
        w, h = float(extra.get("largo_m", 6)) * upm, float(extra.get("ancho_m", 3)) * upm
        borde = 0.25 * upm
        r_arbusto = (h - 2 * borde) * 0.42
        # angulo: grados en el sentido del reloj, como se ve en el mapa. El <g> raíz
        # invierte la y, así que en coordenadas internas el giro va al revés.
        angulo = -float(extra.get("angulo", 0))
        arbustos = "".join(
            f'<circle cx="{round(cx)}" cy="0" r="{round(r_arbusto)}" fill="#2e8b3a"/>'
            for cx in (-w / 4, w / 4)
        )
        partes.append(
            f'<g class="jardinera" transform="translate({round(x)} {round(y)}) rotate({angulo:g})">'
            f'<rect x="{round(-w / 2)}" y="{round(-h / 2)}" width="{round(w)}" height="{round(h)}" '
            f'rx="{round(borde)}" fill="#ffffff" stroke="#c9a58a" stroke-width="{round(borde / 3)}"/>'
            f'<rect x="{round(-w / 2 + borde)}" y="{round(-h / 2 + borde)}" width="{round(w - 2 * borde)}" '
            f'height="{round(h - 2 * borde)}" rx="{round(borde / 2)}" fill="#4caf50"/>{arbustos}</g>'
        )
    for dato in arboles:
        lat, lng, extra = _punto(dato)
        x, y = latlng_a_plano(svg, lat, lng)
        r = float(extra.get("radio_m", 3)) * upm
        # La sombra cae al sureste: en coordenadas internas, x+ y y-.
        partes.append(
            f'<g class="arbol">'
            f'<circle cx="{round(x + r * .22)}" cy="{round(y - r * .26)}" r="{round(r)}" fill="#2f7d32" opacity=".25"/>'
            f'<circle cx="{round(x)}" cy="{round(y)}" r="{round(r)}" fill="#3f9e3a" stroke="#2f7d32" stroke-width="{round(r * .12)}"/>'
            f'<circle cx="{round(x - r * .3)}" cy="{round(y + r * .3)}" r="{round(r * .45)}" fill="#5bbb4c"/></g>'
        )
    bloque = DECO_INICIO + '<g id="decoracion">' + "".join(partes) + "</g>" + DECO_FIN + "\n"
    i = svg.rfind("</g>")
    return svg[:i] + bloque + svg[i:]


def leer_decoracion(ruta: str = DECORACION_JSON):
    if not os.path.exists(ruta):
        return {}
    return json.load(open(ruta, encoding="utf-8"))


def estilizar(svg: str, deco=None) -> str:
    return agregar_cancha(agregar_decoracion(recolorear(svg), deco))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    deco = leer_decoracion()
    for archivo in sys.argv[1:]:
        antes = open(archivo, encoding="utf-8").read()
        despues = estilizar(antes, deco)
        open(archivo, "w", encoding="utf-8").write(despues)
        extras = [n for n, marca in (("cancha", 'id="cancha"'), ("decoración", DECO_INICIO)) if marca in despues]
        detalle = "con " + " y ".join(extras) if extras else "sin extras"
        print(f"{archivo}: {len(antes) / 1024:.0f} KB -> {len(despues) / 1024:.0f} KB ({detalle})")
