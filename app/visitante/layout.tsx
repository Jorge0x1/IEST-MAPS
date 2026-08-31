import { SessionHeader } from "@/app/components/session-header";
import { requerirRol } from "@/utils/auth";

export default async function VisitanteLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requerirRol("visitante");
  return (
    <div className="min-h-screen bg-slate-50">
      <SessionHeader nombre={profile.nombre ?? "Visitante"} rol={profile.rol} />
      {children}
    </div>
  );
}
