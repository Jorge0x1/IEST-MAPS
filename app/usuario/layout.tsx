import { SessionHeader } from "@/app/components/session-header";
import { requerirRol } from "@/utils/auth";

export default async function UsuarioLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requerirRol("alumno");
  return (
    <div className="min-h-screen bg-slate-50">
      <SessionHeader nombre={profile.nombre ?? profile.correo ?? "Usuario"} rol={profile.rol} />
      {children}
    </div>
  );
}
