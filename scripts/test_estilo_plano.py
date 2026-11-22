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


if __name__ == "__main__":
    unittest.main()
