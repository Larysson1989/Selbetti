import { NextRequest, NextResponse } from "next/server";
import { getRelatorioDiscador } from "@/lib/nexusClient";
import { parseSemicolonCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idExterno = Number(searchParams.get("idExterno"));
  const dataIni = searchParams.get("dataIni");
  const dataFim = searchParams.get("dataFim");

  if (!idExterno || !dataIni || !dataFim) {
    return NextResponse.json(
      { ok: false, error: "Parâmetros idExterno, dataIni e dataFim são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const dados = await getRelatorioDiscador(idExterno, dataIni, dataFim);
    const parsed = parseSemicolonCsv(dados);
    return NextResponse.json({ ok: true, parsed });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
