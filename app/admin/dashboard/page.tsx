import { AccessButton } from "./access-button";
import { CreateUserForm } from "./create-user-form";
import { eliminarAltaPendiente } from "./actions";
import { RoleSelector } from "./role-selector";
import { requerirRol, type RolUsuario } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type Profile = {
  id: string;
  nombre: string | null;
  correo: string | null;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
};

type AltaPendiente = {
  id: string;
  nombre: string | null;
  correo: string;
  rol: RolUsuario;
  created_at: string;
};

const estilosRol: Record<string, string> = {
  administrador: "bg-violet-50 text-violet-700 ring-violet-200",
  guardia: "bg-amber-50 text-amber-800 ring-amber-200",
  alumno: "bg-sky-50 text-sky-700 ring-sky-200",
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function fecha(fechaIso: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(fechaIso));
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ buscar?: string }> }) {
  const { profile: administrador } = await requerirRol("administrador");
  const { buscar = "" } = await searchParams;
  const supabase = await createClient();
  const [profilesResult, pendientesResult] = await Promise.all([
    supabase.from("profiles").select("id, nombre, correo, rol, activo, created_at").neq("rol", "visitante").order("created_at", { ascending: false }),
    supabase.from("usuarios_autorizados").select("id, nombre, correo, rol, created_at").eq("estado", "pendiente").order("created_at", { ascending: false }),
  ]);

  const perfiles = (profilesResult.data ?? []) as Profile[];
  const pendientes = (pendientesResult.data ?? []) as AltaPendiente[];
  const termino = normalizar(buscar.trim());
  const perfilesFiltrados = termino
    ? perfiles.filter((perfil) => normalizar(`${perfil.nombre ?? ""} ${perfil.correo ?? ""} ${perfil.rol}`).includes(termino))
    : perfiles;
  const resumen = {
    activos: perfiles.filter((p) => p.activo).length,
    pendientes: pendientes.length,
    desactivados: perfiles.filter((p) => !p.activo).length,
    privilegiados: perfiles.filter((p) => p.activo && ["administrador", "guardia"].includes(p.rol)).length,
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-sky-700">Administración</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Usuarios y accesos</h1><p className="mt-2 max-w-2xl text-slate-600">Autoriza correos institucionales, prepara sus roles y controla quién puede entrar al sistema.</p></div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">Google Auth conectado</span>
      </div>

      <section aria-label="Resumen de usuarios" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries({ "Usuarios activos": resumen.activos, "Pendientes de acceso": resumen.pendientes, "Accesos desactivados": resumen.desactivados, "Roles privilegiados": resumen.privilegiados }).map(([etiqueta, valor]) => (
          <article key={etiqueta} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{etiqueta}</p><p className="mt-2 text-3xl font-bold text-slate-950">{valor}</p></article>
        ))}
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="font-semibold text-slate-950">Dar de alta un correo</h2><p className="mt-1 text-sm text-slate-500">La cuenta de Google se enlazará automáticamente cuando la persona ingrese por primera vez.</p></div>
        <CreateUserForm />
      </section>

      {pendientes.length > 0 ? (
        <section className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 bg-amber-50/70 p-5"><h2 className="font-semibold text-slate-950">Pendientes de primer acceso</h2><p className="mt-1 text-sm text-slate-600">Estos correos ya tienen un rol reservado, pero aún no han iniciado sesión con Google.</p></div>
          <div className="divide-y divide-slate-100">
            {pendientes.map((alta) => (
              <div key={alta.id} className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center">
                <div><p className="font-medium text-slate-950">{alta.nombre || "Nombre pendiente"}</p><p className="text-sm text-slate-500">{alta.correo} · Alta {fecha(alta.created_at)}</p></div>
                <div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${estilosRol[alta.rol]}`}>{alta.rol}</span><form action={eliminarAltaPendiente.bind(null, alta.id)}><button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Cancelar alta</button></form></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div><h2 className="font-semibold text-slate-950">Directorio de usuarios</h2><p className="mt-1 text-sm text-slate-500">{perfilesFiltrados.length} de {perfiles.length} cuentas institucionales</p></div>
          <form className="flex w-full max-w-sm gap-2" action="/admin/dashboard"><label htmlFor="buscar" className="sr-only">Buscar usuario</label><input id="buscar" name="buscar" type="search" defaultValue={buscar} placeholder="Nombre, correo o rol" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /><button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Buscar</button></form>
        </div>

        {profilesResult.error || pendientesResult.error ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No fue posible cargar el directorio. Ejecuta primero la migración 0002 en Supabase.</div>
        ) : perfilesFiltrados.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-600">No encontramos usuarios con ese criterio.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3 font-semibold">Usuario</th><th className="px-6 py-3 font-semibold">Estado</th><th className="px-6 py-3 font-semibold">Registro</th><th className="px-6 py-3 text-right font-semibold">Rol</th><th className="px-6 py-3 text-right font-semibold">Acceso</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {perfilesFiltrados.map((perfil) => (
                  <tr key={perfil.id} className={perfil.activo ? "hover:bg-slate-50/70" : "bg-slate-50/60 text-slate-500"}>
                    <td className="px-6 py-4"><div className="font-medium text-slate-950">{perfil.nombre || "Nombre no disponible"}</div><div className="mt-0.5 text-sm text-slate-500">{perfil.correo || "Sin correo"}</div></td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${perfil.activo ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}`}>{perfil.activo ? "Activo" : "Desactivado"}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-600">{fecha(perfil.created_at)}</td>
                    <td className="px-6 py-4"><RoleSelector profileId={perfil.id} rolActual={perfil.rol} deshabilitado={perfil.id === administrador.id || !perfil.activo} /></td>
                    <td className="px-6 py-4 text-right">{perfil.id === administrador.id ? <span className="text-xs text-slate-500">Tu cuenta</span> : <AccessButton profileId={perfil.id} activo={perfil.activo} />}</td>
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
