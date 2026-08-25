export default function VisitanteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* TODO: proteger este layout para rol=visitante (anonymous sign-in) cuando exista auth */}
      {children}
    </div>
  );
}
