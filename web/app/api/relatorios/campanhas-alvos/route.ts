import { NextResponse } from "next/server";
import { getCampanhas, getAlvosRestantes } from "@/lib/nexusClient";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const campanhas = await getCampanhas();

    const withAlvos = await Promise.all(
      campanhas
        .filter((c: any) => c.idintegracao != null)
        .map(async (c: any) => {
          try {
            const alvos = await getAlvosRestantes(c.idintegracao);
            return {
              idintegracao: c.idintegracao,
              nome: c.nome,
              ativa: c.ativa,
              restantes: alvos?.restantes ?? null,
              agendamentos: alvos?.agendamentos ?? null,
              erro: null as string | null,
            };
          } catch (err: any) {
            return {
              idintegracao: c.idintegracao,
              nome: c.nome,
              ativa: c.ativa,
              restantes: null,
              agendamentos: null,
              erro: err?.message || String(err),
            };
          }
        })
    );

    return NextResponse.json({ ok: true, data: withAlvos });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
