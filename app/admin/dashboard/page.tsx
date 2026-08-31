import { RoleSelector } from "./role-selector";
import { requerirRol, type RolUsuario } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type Profile = {
  id: string;
  nombre: string | null;
  correo: string | null;
  rol: RolUsuario;
  created_at: string;
};

const etiquetasRol: Record<RolUsuario, string> = {
  administrador: "Administradores",
  guardia: "Guardias",
  alumno: "Alumnos",
  visitante: "Visitantes",
};

const estilosRol: Record<RolUsuario, string> = {
  administrador: "bg-violet-50 text-violet-700 ring-violet-200",
  guardia: "bg-amber-50 text-amber-800 ring-amber-200",
  alumno: "bg-sky-50 text-sky-700 ring-sky-200",
  visitante: "bg-slate-100 text-slate-700 ring-slate-200",
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ buscar?: string }>;
}) {
  const { profile: administrador } = await requerirRol("administrador");
  const { buscar = "" } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, correo, rol, created_at")
    .order("created_at", { ascending: false });

  const perfiles = (data ?? []) as Profile[];
  const termino = normalizar(buscar.trim());
  const perfilesFiltrados = termino
    ? perfiles.filter((perfil) =>
        normalizar(`${perfil.nombre ?? ""} ${perfil.correo ?? ""} ${perfil.rol}`).includes(termino),
      )
    : perfiles;

  const conteo = perfiles.reduce<Record<RolUsuario, number>>(
    (acumulado, perfil) => {
      acumulado[perfil.rol] += 1;
      return acumulado;
    },
    { administrador: 0, guardia: 0, alumno: 0, visitante: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">Administración</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Usuarios y accesos</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Consulta las cuentas registradas y asigna los permisos correspondientes a cada persona.</p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">Sistema conectado</span>
      </div>

      <section aria-label="Resumen de usuarios" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(etiquetasRol) as RolUsuario[]).map((rol) => (
          <article key={rol} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{etiquetasRol[rol]}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{conteo[rol]}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div><h2 className="font-semibold text-slate-950">Directorio de usuarios</h2><p className="mt-1 text-sm text-slate-500">{perfilesFiltrados.length} de {perfiles.length} cuentas</p></div>
          <form className="flex w-full max-w-sm gap-2" action="/admin/dashboard">
            <label htmlFor="buscar" className="sr-only">Buscar usuario</label>
            <input id="buscar" name="buscar" type="search" defaultValue={buscar} placeholder="Nombre, correo o rol" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Buscar</button>
          </form>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No fue posible cargar los perfiles. Verifica la conexión y las políticas RLS.</div>
        ) : perfilesFiltrados.length === 0 ? (
          <div className="px-6 py-16 text-center"><p className="font-medium text-slate-800">No encontramos usuarios</p><p className="mt-1 text-sm text-slate-500">Prueba con otro término de búsqueda.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3 font-semibold">Usuario</th><th className="px-6 py-3 font-semibold">Rol actual</th><th className="px-6 py-3 font-semibold">Registro</th><th className="px-6 py-3 text-right font-semibold">Cambiar permisos</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {perfilesFiltrados.map((perfil) => (
                  <tr key={perfil.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4"><div className="font-medium text-slate-950">{perfil.nombre || "Nombre no disponible"}</div><div className="mt-0.5 text-sm text-slate-500">{perfil.correo || "Sin correo"}</div></td>
                    <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${estilosRol[perfil.rol]}`}>{perfil.rol}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(perfil.created_at))}</td>
                    <td className="px-6 py-4"><RoleSelector profileId={perfil.id} rolActual={perfil.rol} deshabilitado={perfil.id === administrador.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
