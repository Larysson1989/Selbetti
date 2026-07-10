"use client";

import { useEffect, useState } from "react";

interface Campanha {
  idintegracao: number;
  nome: string;
  ativa: number | string;
}

export default function CampanhaSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (idExterno: number | null, nome: string | null) => void;
}) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/relatorios/campanhas", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelado) return;
        if (json.ok) {
          setCampanhas(json.data);
          if (json.data.length > 0) {
            onChange(json.data[0].idintegracao, json.data[0].nome);
          }
        } else {
          setError(json.error);
        }
      })
      .catch((err) => {
        if (!cancelado) setError(err?.message || "Erro ao carregar campanhas.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <p className="text-sm text-muted font-mono">Carregando campanhas…</p>;
  }

  if (error) {
    return <p className="text-sm text-red">{error}</p>;
  }

  if (campanhas.length === 0) {
    return (
      <p className="text-sm text-muted max-w-md">
        Nenhuma campanha de integração encontrada. Isso costuma significar que
        as campanhas de discador não estão cadastradas com &quot;Tipo de
        Integração&quot; no Nexus — confirme isso com o administrador do
        sistema.
      </p>
    );
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const id = Number(e.target.value);
        const camp = campanhas.find((c) => c.idintegracao === id);
        onChange(id, camp?.nome ?? null);
      }}
      className="bg-panel border border-panel-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-amber min-w-[12rem]"
    >
      {campanhas.map((c) => (
        <option key={c.idintegracao} value={c.idintegracao}>
          {c.nome} {Number(c.ativa) === 1 ? "" : "(inativa)"}
        </option>
      ))}
    </select>
  );
}
