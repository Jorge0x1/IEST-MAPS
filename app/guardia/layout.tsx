import { SessionHeader } from "@/app/components/session-header";
import { requerirRol } from "@/utils/auth";

export default async function GuardiaLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requerirRol("guardia");
  return (
    <div className="min-h-screen bg-slate-50">
      <SessionHeader nombre={profile.nombre ?? profile.correo ?? "Guardia"} rol={profile.rol} />
      {children}
    </div>
  );
}
