"use client";

// Campo "Destino" del registro de visitas: se escribe y se elige de la lista (hay
// cientos de destinos, un <select> no sirve). Usa la misma búsqueda que el alumno
// (lib/busqueda.ts: nombre y alias, sin acentos). El id elegido viaja en un input
// oculto `destino_nodo_id`; el servidor lo vuelve a validar.

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { buscarDestinos } from "@/lib/busqueda";
import styles from "../guardia.module.css";

export type DestinoGuardia = {
  id: string;
  nombre: string;
  alias: string[];
  piso: number;
  edificio: string | null;
};

const MAX_RESULTADOS = 8;

function detalle(d: DestinoGuardia) {
  return [d.edificio, `Piso ${d.piso}`].filter(Boolean).join(" · ");
}

export function BuscadorDestino({ destinos }: { destinos: DestinoGuardia[] }) {
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState<DestinoGuardia | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const inputId = `${id}-input`;
  const listaId = `${id}-lista`;

  const resultados = useMemo(() => buscarDestinos(destinos, consulta, MAX_RESULTADOS), [destinos, consulta]);
  const mostrarLista = abierto && consulta.trim() !== "";

  // Al limpiar el formulario después de registrar una visita, se limpia también el destino.
  useEffect(() => {
    const form = contenedorRef.current?.closest("form");
    if (!form) return;
    const limpiar = () => {
      setElegido(null);
      setConsulta("");
      setAbierto(false);
    };
    form.addEventListener("reset", limpiar);
    return () => form.removeEventListener("reset", limpiar);
  }, []);

  // Sin destino elegido el navegador no deja enviar el formulario.
  useEffect(() => {
    inputRef.current?.setCustomValidity(elegido ? "" : "Elige un destino de la lista.");
  }, [elegido]);

  function elegir(d: DestinoGuardia) {
    setElegido(d);
    setConsulta("");
    setAbierto(false);
  }

  function cambiar() {
    setElegido(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      setAbierto(true);
      if (resultados.length === 0) return;
      const paso = evento.key === "ArrowDown" ? 1 : -1;
      setActivo((actual) => (actual + paso + resultados.length) % resultados.length);
    } else if (evento.key === "Enter" && mostrarLista && resultados[activo]) {
      evento.preventDefault();
      elegir(resultados[activo]);
    } else if (evento.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div ref={contenedorRef} className={styles.field}>
      <label htmlFor={inputId}>Destino</label>
      {elegido ? (
        <div className={styles.selected}>
          <div className={styles.selectedText}>
            <p className={styles.comboName}>{elegido.nombre}</p>
            <p className={styles.comboDetail}>{detalle(elegido)}</p>
          </div>
          <button type="button" onClick={cambiar} className={styles.secondaryButton}>
            Cambiar
          </button>
        </div>
      ) : (
        <div className={styles.combo}>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={mostrarLista}
            aria-controls={listaId}
            aria-autocomplete="list"
            aria-activedescendant={mostrarLista && resultados[activo] ? `${listaId}-${activo}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Escribe un salón, oficina o servicio"
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setAbierto(true);
              setActivo(0);
            }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setAbierto(false)}
            onKeyDown={alTeclear}
            className={styles.control}
          />
          {mostrarLista ? (
            <ul id={listaId} role="listbox" aria-label="Destinos encontrados" className={styles.comboList}>
              {resultados.length === 0 ? (
                <li className={styles.comboEmpty}>No encontramos “{consulta.trim()}”.</li>
              ) : (
                resultados.map((d, i) => (
                  <li
                    key={d.id}
                    id={`${listaId}-${i}`}
                    role="option"
                    aria-selected={i === activo}
                    // mousedown antes que el blur del input: si no, la lista se cierra antes del clic.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => elegir(d)}
                    onMouseEnter={() => setActivo(i)}
                    className={`${styles.comboOption} ${i === activo ? styles.comboOptionActive : ""}`}
                  >
                    <span className={styles.comboName}>{d.nombre}</span>
                    <span className={styles.comboDetail}>{detalle(d)}</span>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}
      <input type="hidden" name="destino_nodo_id" value={elegido?.id ?? ""} />
      {elegido ? null : <span className={styles.hint}>Busca por nombre, número o alias (por ejemplo “204” o “biblioteca”).</span>}
    </div>
  );
}
