import { NextRequest, NextResponse } from "next/server";
import { getRelatorioTabulacoesPorTelefone } from "@/lib/nexusClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get("telefone");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  if (!telefone || !dataInicio || !dataFim) {
    return NextResponse.json(
      { ok: false, error: "Parâmetros telefone, dataInicio e dataFim são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const dados = await getRelatorioTabulacoesPorTelefone(dataInicio, dataFim, telefone);
    return NextResponse.json({ ok: true, dados });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
