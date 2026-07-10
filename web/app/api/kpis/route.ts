import { NextResponse } from "next/server";
import {
  getStatusCallCenter,
  getRamais,
  getFilasVoz,
  getFilasChat,
  getCampanhas,
  getAlvosRestantes,
  getStatusDiscador,
} from "@/lib/nexusClient";

export const dynamic = "force-dynamic";

type SafeResult<T> =
  | { label: string; ok: true; data: T }
  | { label: string; ok: false; error: string };

async function safe<T>(label: string, fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { label, ok: true, data };
  } catch (err: any) {
    return { label, ok: false, error: err?.message || String(err) };
  }
}

export async function GET() {
  const [statusCC, ramais, filasVoz, filasChat, campanhas, statusDiscador] =
    await Promise.all([
      safe("status_call_center", getStatusCallCenter),
      safe("ramais", getRamais),
      safe("filas_voz", getFilasVoz),
      safe("filas_chat", getFilasChat),
      safe("campanhas", getCampanhas),
      safe("status_discador", getStatusDiscador),
    ]);

  let alvosRestantes: Array<{
    idintegracao: number;
    nome: string;
    ativa: any;
    restantes: number | null;
    agendamentos: number | null;
    erro: string | null;
  }> = [];

  if (campanhas.ok && Array.isArray(campanhas.data)) {
    alvosRestantes = await Promise.all(
      campanhas.data
        .filter((c: any) => c.idintegracao != null)
        .map(async (c: any) => {
          const r = await safe(`alvos_${c.idintegracao}`, () =>
            getAlvosRestantes(c.idintegracao)
          );
          return {
            idintegracao: c.idintegracao,
            nome: c.nome,
            ativa: c.ativa,
            restantes: r.ok ? r.data?.restantes ?? null : null,
            agendamentos: r.ok ? r.data?.agendamentos ?? null : null,
            erro: r.ok ? null : r.error,
          };
        })
    );
  }

  return NextResponse.json({
    geradoEm: new Date().toISOString(),
    statusCC,
    ramais,
    filasVoz,
    filasChat,
    campanhas,
    statusDiscador,
    alvosRestantes,
  });
}
