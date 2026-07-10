"use client";

import { useState } from "react";
import PeriodFilter from "@/components/PeriodFilter";
import CampanhaSelect from "@/components/CampanhaSelect";
import { PeriodoTipo, calcularPeriodo, formatoYMD } from "@/lib/period";

interface LoginLogoffRow {
  data: string;
  ramal: string;
  login: string;
  logout: string;
}

export default function LoginLogoffClient() {
  const [periodo, setPeriodo] = useState<PeriodoTipo>("dia");
  const [idExterno, setIdExterno] = useState<number | null>(null);
  const [nomeCampanha, setNomeCampanha] = useState<string | null>(null);
  const [todosOsRegistros, setTodosOsRegistros] = useState(false);
  const [resultado, setResultado] = useState<LoginLogoffRow[] | null>(null);
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
        `/api/relatorios/login-logoff?idExterno=${idExterno}&dataIni=${dataIni}&dataFim=${dataFim}&todosOsRegistros=${
          todosOsRegistros ? 1 : 0
        }`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResultado(json.dados);
    } catch (err: any) {
      setError(err?.message || "Erro ao buscar relatório.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl mb-1">Login / Logoff por período</h2>
        <p className="text-sm text-muted">
          Histórico de entrada e saída dos agentes, por campanha.
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
        <label className="flex items-center gap-2 text-sm text-muted pb-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={todosOsRegistros}
            onChange={(e) => setTodosOsRegistros(e.target.checked)}
            className="accent-amber"
          />
          Detalhado (todos os registros)
        </label>
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
        <div className="bg-panel border border-panel-border rounded-lg overflow-x-auto">
          {resultado.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted">
              Nenhum registro encontrado para {nomeCampanha} neste período.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-panel-border">
                  <th className="px-4 py-3 font-normal">Data</th>
                  <th className="px-4 py-3 font-normal">Ramal</th>
                  <th className="px-4 py-3 font-normal">Login</th>
                  <th className="px-4 py-3 font-normal">Logout</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {resultado.map((r, i) => (
                  <tr key={i} className="border-b border-panel-border last:border-0">
                    <td className="px-4 py-2">{r.data}</td>
                    <td className="px-4 py-2">{r.ramal}</td>
                    <td className="px-4 py-2">{r.login}</td>
                    <td className="px-4 py-2">{r.logout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
