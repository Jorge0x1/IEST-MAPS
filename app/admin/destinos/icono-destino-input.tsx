"use client";

// Selector de la categoría del icono en el mapa, con vista previa del marcador.

import { useState } from "react";
import { CATEGORIAS_ICONO, ETIQUETA_ICONO, htmlMarcador, type CategoriaIcono } from "@/lib/marcadores";
import styles from "./destinos.module.css";

export function IconoDestinoInput({ valorInicial }: { valorInicial: string | null }) {
  const [icono, setIcono] = useState(valorInicial ?? "");

  return (
    <label className={styles.field}>
      <span>Icono en el mapa</span>
      <div className="flex items-center gap-3">
        <select name="icono" value={icono} onChange={(e) => setIcono(e.target.value)} className={styles.control}>
          <option value="">Ninguno</option>
          {CATEGORIAS_ICONO.map((c) => (
            <option key={c} value={c}>{ETIQUETA_ICONO[c]}</option>
          ))}
        </select>
        {icono ? (
          <span
            aria-hidden="true"
            // HTML armado solo con constantes de lib/marcadores (el nombre va vacío).
            dangerouslySetInnerHTML={{
              __html: htmlMarcador(
                { id: "", nombre: "", clase: icono as CategoriaIcono, piso: 0, lat: 0, lng: 0, buscable: false, logoUrl: null },
              ),
            }}
          />
        ) : null}
      </div>
      <span className={styles.fieldHelp}>
        Para lugares que conviene ubicar de un vistazo (comida, las A, tiendas). Escaleras, elevadores y baños ya tienen icono.
      </span>
    </label>
  );
}
