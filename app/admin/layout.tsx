import { SessionHeader } from "@/app/components/session-header";
import { requerirRol } from "@/utils/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requerirRol("administrador");
  return (
    <div className="min-h-screen bg-slate-50">
      <SessionHeader nombre={profile.nombre ?? profile.correo ?? "Administrador"} rol={profile.rol} />
      {children}
    </div>
  );
}
