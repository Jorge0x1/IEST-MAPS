export default function GuardiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* TODO: proteger este layout para rol=guardia cuando exista auth */}
      {children}
    </div>
  );
}
