"use client";

import { useState } from "react";
import PeriodFilter from "@/components/PeriodFilter";
import { PeriodoTipo, calcularPeriodo, formatoYMDBarraHora } from "@/lib/period";

export default function TabulacoesClient() {
  const [telefone, setTelefone] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoTipo>("mes");
  const [resultado, setResultado] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    if (!telefone.trim()) {
      setError("Informe um telefone (DDD + número) para buscar.");
      return;
    }
    setLoading(true);
    setError(null);
    setResultado(null);

    const { inicio, fim } = calcularPeriodo(periodo);
    const dataInicio = formatoYMDBarraHora(inicio, false);
    const dataFim = formatoYMDBarraHora(fim, true);

    try {
      const res = await fetch(
        `/api/relatorios/tabulacoes?telefone=${encodeURIComponent(
          telefone.trim()
        )}&dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResultado(json.dados);
    } catch (err: any) {
      setError(err?.message || "Erro ao buscar tabulações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl mb-1">Tabulações por telefone</h2>
        <p className="text-sm text-muted max-w-2xl">
          Esta instalação da Nexus exige um telefone específico (DDD + número)
          para consultar tabulações — não é possível listar tudo de uma vez.
          Informe o número e o período para ver o histórico desse contato.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-2">
            Telefone (DDD + número)
          </label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="4133221336"
            className="bg-panel border border-panel-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-amber w-48"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-2">
            Período
          </label>
          <PeriodFilter value={periodo} onChange={setPeriodo} />
        </div>
        <button
          onClick={buscar}
          disabled={loading}
          className="bg-amber text-ink font-semibold rounded-md px-5 py-2.5 text-sm hover:brightness-110 transition disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      {resultado && (
        <div className="bg-panel border border-panel-border rounded-lg overflow-x-auto">
          {resultado.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted">
              Nenhuma tabulação encontrada para esse número neste período.
            </div>
          ) : (
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
