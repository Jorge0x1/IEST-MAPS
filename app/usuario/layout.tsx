export default function UsuarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* TODO: proteger este layout para rol=alumno/staff cuando exista auth */}
      {children}
    </div>
  );
}
