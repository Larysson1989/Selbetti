import "server-only";

const BASE_URL = process.env.NEXUS_BASE_URL?.replace(/\/+$/, "");
const TOKEN = process.env.NEXUS_TOKEN;

export class NexusConfigError extends Error {}

function assertConfigured(): void {
  if (!BASE_URL || !TOKEN) {
    throw new NexusConfigError(
      "NEXUS_BASE_URL e/ou NEXUS_TOKEN não configurados nas variáveis de ambiente do Vercel."
    );
  }
}

interface NexusFetchOptions extends RequestInit {
  timeoutMs?: number;
}

async function nexusFetch(path: string, init?: NexusFetchOptions): Promise<any> {
  assertConfigured();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Token: TOKEN as string,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // resposta não é JSON (ex: HTML de erro) — segue com json = null
    }

    if (!res.ok) {
      const message =
        (json && typeof json === "object" && json.message) ||
        `HTTP ${res.status} ao chamar ${path}`;
      throw new Error(message);
    }

    if (json && typeof json === "object" && json.status === false) {
      throw new Error(json.message || "Erro desconhecido na API Nexus");
    }

    return json ?? text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getStatusCallCenter(): Promise<any> {
  return nexusFetch("/ncall/servicos/statusCC.php", { method: "GET" });
}

export async function getRamais(): Promise<any[]> {
  const r = await nexusFetch("/ncall/api/v1/nexus/ramais", { method: "GET" });
  return r?.response ?? [];
}

export async function getFilasVoz(): Promise<any[]> {
  const r = await nexusFetch("/ncall/api/v1/filas/lista", { method: "GET" });
  return r?.response ?? [];
}

export async function getFilasChat(): Promise<any[]> {
  const r = await nexusFetch("/ncall/api/v1/chat/filas", { method: "GET" });
  return r?.response ?? [];
}

export async function getCampanhas(): Promise<any[]> {
  const r = await nexusFetch("/ncall/api/v1/campanhas/lista", { method: "GET" });
  return r?.response ?? [];
}

export async function getAlvosRestantes(idIntegracao: number): Promise<any> {
  const r = await nexusFetch(
    `/ncall/api/v1/campanhas/${idIntegracao}/alvosRestantes`,
    { method: "GET" }
  );
  return r?.response ?? null;
}

export async function getStatusDiscador(): Promise<any> {
  const r = await nexusFetch("/ncall/api/v1/nexus/statusDiscador", {
    method: "GET",
  });
  return r?.response ?? null;
}
