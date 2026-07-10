import Link from "next/link";
import RelatoriosNav from "@/components/RelatoriosNav";

export default function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="text-xs font-mono uppercase tracking-wider text-muted hover:text-amber transition-colors"
        >
          ← Painel em tempo real
        </Link>
        <h1 className="font-display text-3xl md:text-4xl mt-2">Relatórios</h1>
        <p className="text-muted text-sm mt-1">
          Histórico por período — dia, semana, mês ou ano
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <RelatoriosNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </main>
  );
}
