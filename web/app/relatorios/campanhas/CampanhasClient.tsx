"use client";

import { useEffect, useState } from "react";

interface CampanhaAlvo {
  idintegracao: number;
  nome: string;
  ativa: number | string;
  restantes: number | null;
  agendamentos: number | null;
  erro: string | null;
}

export default function CampanhasClient() {
  const [campanhas, setCampanhas] = useState<CampanhaAlvo[] | null>(null);
  const [loadingLista, setLoadingLista] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [idMailing, setIdMailing] = useState("");
  const [tipoRelatorio, setTipoRelatorio] = useState<"resumo" | "detalhado">("resumo");
  const [resumo, setResumo] = useState<any>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [erroResumo, setErroResumo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/relatorios/campanhas-alvos", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setCampanhas(json.data);
        else setErroLista(json.error);
      })
      .catch((err) => setErroLista(err?.message || "Erro ao carregar campanhas."))
      .finally(() => setLoadingLista(false));
  }, []);

  async function buscarResumo() {
    if (!idMailing.trim()) {
      setErroResumo("Informe um ID de Mailing.");
      return;
    }
    setLoadingResumo(true);
    setErroResumo(null);
    setResumo(null);
    try {
      const res = await fetch(
        `/api/relatorios/campanha-resumo?idMailing=${encodeURIComponent(
          idMailing.trim()
        )}&tipoRelatorio=${tipoRelatorio}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResumo(json.dados);
    } catch (err: any) {
      setErroResumo(err?.message || "Erro ao buscar resumo.");
    } finally {
      setLoadingResumo(false);
    }
  }

  return (
    <div>
      <div className="mb-10">
        <div className="mb-4">
          <h2 className="font-display text-xl mb-1">Campanhas — visão geral</h2>
          <p className="text-sm text-muted">
            Alvos restantes e agendamentos (instantâneo, não filtrado por período).
          </p>
        </div>

        {loadingLista && (
          <p className="text-sm text-muted font-mono">Carregando…</p>
        )}
        {erroLista && (
          <div className="rounded-md border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
            {erroLista}
          </div>
        )}
        {campanhas && campanhas.length === 0 && !erroLista && (
          <div className="bg-panel border border-dashed border-panel-border rounded-lg px-6 py-10 text-center text-sm text-muted">
            Nenhuma campanha de integração encontrada. Isso costuma significar
            que as campanhas de discador não estão cadastradas com &quot;Tipo
            de Integração&quot; no Nexus.
          </div>
        )}
        {campanhas && campanhas.length > 0 && (
          <div className="bg-panel border border-panel-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-panel-border">
                  <th className="px-4 py-3 font-normal">Campanha</th>
                  <th className="px-4 py-3 font-normal text-right">Restantes</th>
                  <th className="px-4 py-3 font-normal text-right">Agendamentos</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {campanhas.map((c) => (
                  <tr key={c.idintegracao} className="border-b border-panel-border last:border-0">
                    <td className="px-4 py-3 font-sans">
                      {c.nome}{" "}
                      {Number(c.ativa) !== 1 && (
                        <span className="text-xs text-muted">(inativa)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.erro ? "—" : c.restantes ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.erro ? "—" : c.agendamentos ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4">
          <h2 className="font-display text-xl mb-1">Resumo por Mailing</h2>
          <p className="text-sm text-muted max-w-2xl">
            Consulta avançada: informe o ID de um Mailing específico para ver o
            resumo de resultados do disparo (efetivados, finalizados, etc).
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-2">
              ID do Mailing
            </label>
            <input
              value={idMailing}
              onChange={(e) => setIdMailing(e.target.value)}
              placeholder="ex: 9999"
              className="bg-panel border border-panel-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-amber w-32"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-2">
              Tipo
            </label>
            <select
              value={tipoRelatorio}
              onChange={(e) => setTipoRelatorio(e.target.value as "resumo" | "detalhado")}
              className="bg-panel border border-panel-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-amber"
            >
              <option value="resumo">Resumo</option>
              <option value="detalhado">Detalhado</option>
            </select>
          </div>
          <button
            onClick={buscarResumo}
            disabled={loadingResumo}
            className="bg-amber text-ink font-semibold rounded-md px-5 py-2.5 text-sm hover:brightness-110 transition disabled:opacity-50"
          >
            {loadingResumo ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {erroResumo && (
          <div className="mb-6 rounded-md border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
            {erroResumo}
          </div>
        )}

        {resumo && (
          <div className="bg-panel border border-panel-border rounded-lg overflow-x-auto">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(resumo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
