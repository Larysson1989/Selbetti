"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RadialGauge from "./RadialGauge";
import LiveDot from "./LiveDot";

type SafeResult<T> =
  | { label: string; ok: true; data: T }
  | { label: string; ok: false; error: string };

interface AlvoRestante {
  idintegracao: number;
  nome: string;
  ativa: any;
  restantes: number | null;
  agendamentos: number | null;
  erro: string | null;
}

interface KpiResponse {
  geradoEm: string;
  statusCC: SafeResult<any>;
  ramais: SafeResult<any[]>;
  filasVoz: SafeResult<any[]>;
  filasChat: SafeResult<any[]>;
  campanhas: SafeResult<any[]>;
  statusDiscador: SafeResult<any>;
  alvosRestantes: AlvoRestante[];
}

const REFRESH_MS = 30000;

function toArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function normalizeStatusCC(raw: any) {
  if (!raw || typeof raw !== "object") {
    return { filas: [] as any[], agentes: [] as any[] };
  }
  const source = raw.response ?? raw;
  return {
    filas: toArray(source.filas ?? source.Filas),
    agentes: toArray(source.agentes ?? source.Agentes),
  };
}

export default function Dashboard() {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kpis", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(`Falha ao carregar indicadores (HTTP ${res.status})`);
      const json = (await res.json()) as KpiResponse;
      setData(json);
      setError(null);
      setLastFetch(new Date());
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar indicadores.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const statusCC = normalizeStatusCC(
    data?.statusCC.ok ? data.statusCC.data : null
  );

  const ramaisCount = data?.ramais.ok ? toArray(data.ramais.data).length : null;
  const filasVozList = data?.filasVoz.ok ? toArray(data.filasVoz.data) : [];
  const filasChatList = data?.filasChat.ok ? toArray(data.filasChat.data) : [];
  const campanhasList = data?.campanhas.ok ? toArray(data.campanhas.data) : [];
  const campanhasAtivas = data?.campanhas.ok
    ? campanhasList.filter((c: any) => Number(c.ativa) === 1).length
    : null;
  const totalAlvosRestantes = data
    ? data.alvosRestantes.reduce((acc, c) => acc + (c.restantes ?? 0), 0)
    : null;
  const discadorLigado = data?.statusDiscador.ok
    ? Number(data.statusDiscador.data) === 1
    : null;

  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <p className="font-mono text-xs tracking-[0.25em] text-muted uppercase mb-1">
            Selbetti
          </p>
          <h1 className="font-display text-3xl md:text-4xl">Painel de Operações</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <LiveDot ok={!error} />
            <p className="text-xs text-muted mt-1 font-mono">
              {lastFetch
                ? `atualizado ${lastFetch.toLocaleTimeString("pt-BR")}`
                : "carregando…"}
            </p>
          </div>
          <button
            onClick={load}
            className="text-xs font-mono uppercase tracking-wider border border-panel-border rounded-md px-3 py-2 hover:border-amber hover:text-amber transition-colors"
          >
            Atualizar
          </button>
          <button
            onClick={handleLogout}
            className="text-xs font-mono uppercase tracking-wider text-muted hover:text-red transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-8 rounded-md border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="font-mono text-sm text-muted">Carregando indicadores…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            <KpiCard label="Ramais" value={ramaisCount} />
            <KpiCard label="Filas de voz" value={filasVozList.length} />
            <KpiCard label="Filas de chat" value={filasChatList.length} />
            <KpiCard label="Campanhas ativas" value={campanhasAtivas} />
            <KpiCard label="Alvos restantes" value={totalAlvosRestantes} />
            <KpiCard
              label="Discador"
              value={null}
              display={
                discadorLigado == null ? "—" : discadorLigado ? "Ligado" : "Parado"
              }
              tone={
                discadorLigado == null ? "muted" : discadorLigado ? "green" : "red"
              }
            />
          </section>

          <section className="mb-12">
            <SectionHeader
              title="Filas — nível de serviço em tempo real"
              subtitle="Fonte experimental (statusCC) — pode variar conforme a versão do Nexus"
            />
            {statusCC.filas.length > 0 ? (
              <div className="flex flex-wrap gap-8 bg-panel border border-panel-border rounded-lg p-6">
                {statusCC.filas.map((fila: any, i: number) => (
                  <RadialGauge
                    key={i}
                    label={fila.nome ?? `Fila ${i + 1}`}
                    value={
                      fila.nivel_de_servico != null
                        ? Number(fila.nivel_de_servico)
                        : null
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState text="Sem dados de nível de serviço em tempo real disponíveis nesta consulta." />
            )}
          </section>

          <section className="mb-12">
            <SectionHeader
              title="Filas cadastradas"
              subtitle="Voz e chat — lista completa"
            />
            <div className="grid md:grid-cols-2 gap-4">
              <FilasTable titulo="Voz" filas={filasVozList} tipo="voz" />
              <FilasTable titulo="Chat" filas={filasChatList} tipo="chat" />
            </div>
          </section>

          <section className="mb-12">
            <SectionHeader
              title="Campanhas"
              subtitle="Alvos restantes e agendamentos"
            />
            {data && data.alvosRestantes.length > 0 ? (
              <div className="bg-panel border border-panel-border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-panel-border">
                      <th className="px-4 py-3 font-normal">Campanha</th>
                      <th className="px-4 py-3 font-normal text-right">Restantes</th>
                      <th className="px-4 py-3 font-normal text-right">
                        Agendamentos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {data.alvosRestantes.map((c) => (
                      <tr
                        key={c.idintegracao}
                        className="border-b border-panel-border last:border-0"
                      >
                        <td className="px-4 py-3 font-sans">
                          {c.nome ?? c.idintegracao}
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
            ) : (
              <EmptyState text="Nenhuma campanha ativa retornada pela API neste momento." />
            )}
          </section>
        </>
      )}
    </main>
  );
}

function KpiCard({
  label,
  value,
  display,
  tone = "paper",
}: {
  label: string;
  value: number | null;
  display?: string;
  tone?: "paper" | "green" | "red" | "muted";
}) {
  const toneClass =
    tone === "green"
      ? "text-green"
      : tone === "red"
      ? "text-red"
      : tone === "muted"
      ? "text-muted"
      : "text-paper";
  return (
    <div className="bg-panel border border-panel-border rounded-lg px-4 py-5">
      <p className="text-xs uppercase tracking-wider text-muted mb-2">{label}</p>
      <p className={`font-mono text-2xl ${toneClass}`}>
        {display ?? (value ?? "—")}
      </p>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-panel border border-dashed border-panel-border rounded-lg px-6 py-10 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function FilasTable({
  titulo,
  filas,
  tipo,
}: {
  titulo: string;
  filas: any[];
  tipo: "voz" | "chat";
}) {
  return (
    <div className="bg-panel border border-panel-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-panel-border">
        <p className="text-xs uppercase tracking-wider text-muted">{titulo}</p>
      </div>
      {filas.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted text-center">
          Nenhuma fila retornada.
        </div>
      ) : (
        <table className="w-full text-sm">
          <tbody className="font-mono">
            {filas.map((f: any, i: number) => (
              <tr key={i} className="border-b border-panel-border last:border-0">
                <td className="px-4 py-2.5 font-sans">
                  {f.nome ?? f.idFila ?? `#${i + 1}`}
                </td>
                <td className="px-4 py-2.5 text-right text-muted text-xs">
                  {tipo === "voz" ? f.piloto ?? "" : f.entrada ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
