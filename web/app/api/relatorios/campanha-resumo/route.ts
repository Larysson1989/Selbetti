import { NextRequest, NextResponse } from "next/server";
import { getRelatorioCampanhaResumo } from "@/lib/nexusClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idMailing = Number(searchParams.get("idMailing"));
  const tipoRelatorio =
    (searchParams.get("tipoRelatorio") as "resumo" | "detalhado") || "resumo";

  if (!idMailing) {
    return NextResponse.json(
      { ok: false, error: "Parâmetro idMailing é obrigatório." },
      { status: 400 }
    );
  }

  try {
    const dados = await getRelatorioCampanhaResumo(idMailing, tipoRelatorio);
    return NextResponse.json({ ok: true, dados });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
