import { NextRequest, NextResponse } from "next/server";
import { getRelatorioLoginLogoff } from "@/lib/nexusClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idExterno = Number(searchParams.get("idExterno"));
  const dataIni = searchParams.get("dataIni");
  const dataFim = searchParams.get("dataFim");
  const todosOsRegistros = searchParams.get("todosOsRegistros") === "1" ? 1 : 0;

  if (!idExterno || !dataIni || !dataFim) {
    return NextResponse.json(
      { ok: false, error: "Parâmetros idExterno, dataIni e dataFim são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const dados = await getRelatorioLoginLogoff(idExterno, dataIni, dataFim, todosOsRegistros);
    return NextResponse.json({ ok: true, dados });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
