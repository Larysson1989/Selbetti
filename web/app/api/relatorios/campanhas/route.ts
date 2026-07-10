import { NextResponse } from "next/server";
import { getCampanhas } from "@/lib/nexusClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const campanhas = await getCampanhas();
    return NextResponse.json({ ok: true, data: campanhas });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
