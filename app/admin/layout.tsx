export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* TODO: proteger este layout para rol=administrador cuando exista auth */}
      {children}
    </div>
  );
}
