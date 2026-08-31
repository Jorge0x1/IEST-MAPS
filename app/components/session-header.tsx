import { cerrarSesion } from "@/app/login/actions";

export function SessionHeader({ nombre, rol }: { nombre: string; rol: string }) {
  return <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4"><div><p className="font-semibold text-slate-950">{nombre}</p><p className="text-sm capitalize text-slate-500">{rol}</p></div><form action={cerrarSesion}><button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cerrar sesión</button></form></header>;
}
