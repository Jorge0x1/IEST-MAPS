import { SessionHeader } from "@/app/components/session-header";
import { requerirRol } from "@/utils/auth";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requerirRol("administrador");
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-5 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-2 pb-6">
          <p className="text-lg font-bold tracking-wide">IEST-MAPS</p>
          <p className="mt-1 text-xs text-slate-400">Panel de administración</p>
        </div>
        <AdminNav />
        <div className="mt-auto rounded-xl bg-white/5 p-4 text-xs leading-5 text-slate-400">Los cambios de rol se aplican inmediatamente en el siguiente acceso del usuario.</div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-slate-200 bg-slate-950 px-5 py-3 text-sm font-bold tracking-wide text-white lg:hidden">IEST-MAPS · Administración</div>
        <SessionHeader nombre={profile.nombre ?? profile.correo ?? "Administrador"} rol={profile.rol} />
        {children}
      </div>
    </div>
  );
}
