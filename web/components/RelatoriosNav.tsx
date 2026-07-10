"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/relatorios/chamadas", label: "Chamadas" },
  { href: "/relatorios/pausas", label: "Pausas" },
  { href: "/relatorios/login-logoff", label: "Login / Logoff" },
  { href: "/relatorios/campanhas", label: "Campanhas" },
  { href: "/relatorios/tabulacoes", label: "Tabulações" },
];

export default function RelatoriosNav() {
  const pathname = usePathname();

  return (
    <nav className="flex md:flex-col gap-2 md:w-48 shrink-0 overflow-x-auto pb-2 md:pb-0">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-panel text-amber"
                : "text-muted hover:text-paper hover:bg-panel"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
