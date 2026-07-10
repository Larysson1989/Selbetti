"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const dest = params.get("from") || "/";
        router.push(dest);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível entrar.");
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full bg-amber animate-pulse"
            style={{ boxShadow: "0 0 12px 2px rgba(242,169,59,0.6)" }}
          />
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
            Painel de Operações
          </p>
        </div>

        <h1 className="font-display text-3xl mb-1">Selbetti</h1>
        <p className="text-muted text-sm mb-8">
          Entre com a senha de acesso para ver os indicadores ao vivo.
        </p>

        <label
          className="block text-xs uppercase tracking-wider text-muted mb-2"
          htmlFor="password"
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-panel border border-panel-border rounded-md px-4 py-3 text-paper font-mono tracking-wide outline-none focus:border-amber focus:ring-1 focus:ring-amber transition-colors"
          autoFocus
          required
        />

        {error && <p className="mt-3 text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-amber text-ink font-semibold rounded-md py-3 hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
