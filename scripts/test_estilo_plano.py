"""Pruebas de scripts/estilo-plano.py. Correr: python3 scripts/test_estilo_plano.py"""
import importlib.util
import os
import re
import sys

sys.dont_write_bytecode = True  # no dejar scripts/__pycache__
import unittest
import xml.etree.ElementTree as ET

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("estilo", os.path.join(AQUI, "estilo-plano.py"))
estilo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(estilo)

MAPAS = os.path.join(AQUI, "..", "public", "mapas")


def leer(nombre):
    return open(os.path.join(MAPAS, nombre), encoding="utf-8").read()


class EstiloPlano(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pb = leer("planta-baja.svg")
        cls.p4 = leer("piso-4.svg")
        cls.pb_estilo = estilo.estilizar(cls.pb)

    def test_recolorea(self):
        r = estilo.recolorear(self.pb)
        for viejo, nuevo in estilo.PALETA.items():
            self.assertNotIn(f'"{viejo}"', r)
        self.assertIn('"#6cc45a"', r)
        self.assertIn('"#ffe9d9"', r)

    def test_idempotente(self):
        self.assertEqual(estilo.estilizar(self.pb_estilo), self.pb_estilo)

    def test_una_sola_cancha(self):
        self.assertEqual(self.pb_estilo.count('id="cancha"'), 1)

    def test_sin_campo_no_agrega_cancha(self):
        self.assertNotIn('id="cancha"', estilo.estilizar(self.p4))

    def test_xml_valido(self):
        ET.fromstring(self.pb_estilo)
        ET.fromstring(estilo.estilizar(self.p4))

    def test_viewbox_intacto(self):
        etiqueta = lambda s: re.search(r"<svg[^>]*>", s).group(0)
        self.assertEqual(etiqueta(self.pb_estilo), etiqueta(self.pb))
        self.assertIn('<g transform="matrix(0.06, 0, 0, -0.06, 14, 794)">', self.pb_estilo)

    def test_tamano_razonable(self):
        self.assertLess(len(self.pb_estilo) - len(self.pb), 20 * 1024)


DECO = {
    "arboles": [[22.3245, -97.8800], {"lat": 22.3246, "lng": -97.8801, "radio_m": 4}],
    "jardineras": [{"lat": 22.3240, "lng": -97.8798, "ancho_m": 3, "largo_m": 6, "angulo": 10}],
}


class Decoracion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pb = leer("planta-baja.svg")
        cls.p4 = leer("piso-4.svg")

    def test_esquina_noroeste(self):
        (sur, oeste), (norte, este) = estilo.LIMITES
        x, y = estilo.latlng_a_plano(self.pb, norte, oeste)
        # Esquina superior izquierda del viewBox (14, 137.84) en coordenadas internas.
        self.assertAlmostEqual(x, (14 - 14) / 0.06, delta=1)
        self.assertAlmostEqual(y, (794 - 137.839844) / 0.06, delta=1)

    def test_un_bloque_de_decoracion(self):
        r = estilo.estilizar(self.pb, DECO)
        self.assertEqual(r.count("<!--decoracion-->"), 1)
        self.assertEqual(r.count('class="arbol"'), 2)
        self.assertEqual(r.count('class="jardinera"'), 1)
        ET.fromstring(r)

    def test_decoracion_antes_de_la_cancha(self):
        r = estilo.estilizar(self.pb, DECO)
        self.assertLess(r.index("<!--decoracion-->"), r.index('id="cancha"'))

    def test_idempotente_con_decoracion(self):
        una = estilo.estilizar(self.pb, DECO)
        self.assertEqual(estilo.estilizar(una, DECO), una)

    def test_quitar_decoracion(self):
        una = estilo.estilizar(self.pb, DECO)
        self.assertNotIn("<!--decoracion-->", estilo.estilizar(una, {"arboles": [], "jardineras": []}))

    def test_piso_sin_campo_no_recibe_decoracion(self):
        self.assertNotIn("<!--decoracion-->", estilo.estilizar(self.p4, DECO))


if __name__ == "__main__":
    unittest.main()
