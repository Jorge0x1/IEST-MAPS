import Link from "next/link";
import { TrazarForm } from "./trazar-form";
import type { ConexionExistente, NodoExistente } from "../../components/path-drawer";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export default async function TrazarPasilloPage() {
  await requerirRol("administrador");
  const supabase = await createClient();
  // Los nodos y conexiones ya registrados se dibujan de referencia en el mapa,
  // para retomar el trazado donde se quedó. Cota explícita como en /admin/grafo.
  const MAX_FILAS = 5000;
  const [edificiosRes, nodosRes, conexionesRes] = await Promise.all([
    supabase.from("edificios").select("id, nombre").order("nombre"),
    supabase.from("nodos").select("id, nombre, tipo, piso, lat, lng").not("lat", "is", null).range(0, MAX_FILAS - 1),
    supabase.from("conexiones").select("nodo_origen_id, nodo_destino_id").range(0, MAX_FILAS - 1),
  ]);
  const error = edificiosRes.error;
  const edificios = (edificiosRes.data ?? []) as { id: string; nombre: string }[];
  const nodosExistentes = (nodosRes.data ?? []) as NodoExistente[];
  const conexionesExistentes = (conexionesRes.data ?? []) as ConexionExistente[];

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8">
        <Link href="/admin/destinos" className="text-sm font-semibold text-sky-700 hover:underline">← Destinos y nodos</Link>
        <p className="mt-3 text-sm font-semibold text-sky-700">Grafo del campus</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Trazar un pasillo</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          En vez de crear cada nodo y cada conexión por separado, marca los puntos del recorrido sobre el mapa en
          orden: al guardar se crean todos los nodos y las conexiones entre puntos consecutivos de una sola vez, con
          el costo calculado a partir de la distancia real entre coordenadas.
        </p>
      </div>

      {error || edificios.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {error ? "No se pudo cargar la lista de edificios." : "Registra al menos un edificio desde "}
          {!error ? <Link href="/admin/edificios" className="font-semibold underline">Edificios</Link> : null}
          {!error ? " antes de trazar un pasillo." : null}
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <TrazarForm edificios={edificios} nodosExistentes={nodosExistentes} conexionesExistentes={conexionesExistentes} />
        </section>
      )}
    </main>
  );
}
