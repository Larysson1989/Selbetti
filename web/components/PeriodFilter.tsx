"use client";

import { PeriodoTipo, PERIODO_LABELS } from "@/lib/period";

const OPCOES: PeriodoTipo[] = ["dia", "semana", "mes", "ano"];

export default function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodoTipo;
  onChange: (tipo: PeriodoTipo) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-panel-border overflow-hidden">
      {OPCOES.map((tipo) => (
        <button
          key={tipo}
          type="button"
          onClick={() => onChange(tipo)}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            value === tipo
              ? "bg-amber text-ink"
              : "text-muted hover:text-paper"
          }`}
        >
          {PERIODO_LABELS[tipo]}
        </button>
      ))}
    </div>
  );
}
