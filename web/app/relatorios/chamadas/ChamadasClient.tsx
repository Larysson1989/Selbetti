"use client";

import { useState } from "react";
import PeriodFilter from "@/components/PeriodFilter";
import CampanhaSelect from "@/components/CampanhaSelect";
import { PeriodoTipo, calcularPeriodo, formatoYMD } from "@/lib/period";

interface ParsedCsv {
  headers: string[];
  rows: string[][];
  total: number;
}

const LIMITE_EXIBICAO = 500;

function paraCsvDownload(headers: string[], rows: string[][]): string {
  return [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
}

export default function ChamadasClient() {
  const [periodo, setPeriodo] = useState<PeriodoTipo>("dia");
  const [idExterno, setIdExterno] = useState<number | null>(null);
  const [nomeCampanha, setNomeCampanha] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ParsedCsv | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    if (!idExterno) return;
    setLoading(true);
    setError(null);
    setResultado(null);

    const { inicio, fim } = calcularPeriodo(periodo);
    const dataIni = formatoYMD(inicio);
    const dataFim = formatoYMD(fim);

    try {
      const res = await fetch(
        `/api/relatorios/discador?idExterno=${idExterno}&dataIni=${dataIni}&dataFim=${dataFim}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResultado(json.parsed);
    } catch (err: any) {
      setError(err?.message || "Erro ao buscar relatório.");
    } finally {
      setLoading(false);
    }
  }

  function baixarCsv() {
    if (!resultado) return;
    const conteudo = paraCsvDownload(resultado.headers, resultado.rows);
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chamadas_${nomeCampanha ?? idExterno}_${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const linhasExibidas = resultado?.rows.slice(0, LIMITE_EXIBICAO) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl mb-1">Chamadas por período</h2>
        <p className="text-sm text-muted max-w-2xl">
          Relatório de discagem (dados brutos) por campanha e período. Períodos
          longos (Mês/Ano) podem demorar mais ou retornar muitos registros.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-2">
            Campanha
          </label>
          <CampanhaSelect
            value={idExterno}
            onChange={(id, nome) => {
              setIdExterno(id);
              setNomeCampanha(nome);
            }}
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
          disabled={!idExterno || loading}
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
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted font-mono">
              {resultado.total} registro(s)
              {resultado.total > LIMITE_EXIBICAO &&
                ` — mostrando os primeiros ${LIMITE_EXIBICAO}`}
            </p>
            {resultado.total > 0 && (
              <button
                onClick={baixarCsv}
                className="text-xs font-mono uppercase tracking-wider border border-panel-border rounded-md px-3 py-1.5 hover:border-amber hover:text-amber transition-colors"
              >
                Baixar CSV completo
              </button>
            )}
          </div>

          <div className="bg-panel border border-panel-border rounded-lg overflow-x-auto">
            {resultado.rows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted">
                Nenhum registro encontrado para {nomeCampanha} neste período.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-panel-border">
                    {resultado.headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 font-normal whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {linhasExibidas.map((row, i) => (
                    <tr key={i} className="border-b border-panel-border last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
