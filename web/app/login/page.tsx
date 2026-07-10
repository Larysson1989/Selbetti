"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.4 5.5A9.9 9.9 0 0 1 12 5c5 0 9 4 10 7-.4 1.2-1.2 2.5-2.3 3.6M6.2 6.7C4.4 8 3 9.9 2 12c1 3 5 7 10 7 1.3 0 2.6-.3 3.7-.7" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IlustracaoGrafico() {
  return (
    <svg width="180" height="90" viewBox="0 0 180 90" fill="none">
      <polyline
        points="6,60 40,45 74,58 108,30 142,38 174,12"
        stroke="#1B3B8C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {[
        [6, 60],
        [40, 45],
        [74, 58],
        [108, 30],
        [142, 38],
        [174, 12],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i === 5 ? 4 : 3} fill={i === 5 ? "#F7B500" : "#1B3B8C"} opacity={i === 5 ? 1 : 0.6} />
      ))}
      <rect x="60" y="66" width="14" height="18" rx="2" fill="#1B3B8C" opacity="0.12" />
      <rect x="82" y="56" width="14" height="28" rx="2" fill="#1B3B8C" opacity="0.16" />
      <rect x="104" y="46" width="14" height="38" rx="2" fill="#1B3B8C" opacity="0.22" />
      <rect x="126" y="34" width="14" height="50" rx="2" fill="#F7B500" opacity="0.3" />
    </svg>
  );
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden bg-ink">
      {/* Decorativo: manchas de cor ao fundo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 -right-20 w-96 h-96 rounded-full bg-amber/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-blue/10 blur-3xl" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-4xl bg-panel rounded-3xl shadow-xl shadow-blue/5 border border-panel-border overflow-hidden"
      >
        <div className="grid md:grid-cols-2">
          {/* Coluna esquerda: marca */}
          <div className="p-8 md:p-10 flex flex-col justify-between gap-10 relative overflow-hidden bg-gradient-to-br from-white to-ink">
            <div
              aria-hidden
              className="absolute top-6 right-6 grid grid-cols-4 gap-1.5 opacity-70"
            >
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber/50" />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {/* Coloque os arquivos reais em: public/logo-pequeno-principe.png e public/logo-selbetti.png */}
              <img
                src="/logo-pequeno-principe.png"
                alt="Hospital Pequeno Príncipe"
                className="h-20 md:h-24 w-auto object-contain"
              />
              <span className="w-px h-16 md:h-20 bg-panel-border" />
              <img
                src="/logo-selbetti.png"
                alt="Selbetti"
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>

            <IlustracaoGrafico />
          </div>

          {/* Coluna direita: formulário */}
          <div className="p-8 md:p-10 flex flex-col justify-center border-t md:border-t-0 md:border-l border-panel-border">
            <h1 className="font-display text-3xl text-blue mb-2">Indicadores CT</h1>
            <span className="block w-10 h-1 rounded-full bg-amber mb-8" />

            <div className="flex items-center gap-2 text-blue mb-2">
              <LockIcon />
              <span className="text-sm font-medium">Senha</span>
            </div>

            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-ink border border-panel-border rounded-xl px-4 py-3 pr-11 text-paper outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-blue transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>

            {error && <p className="text-sm text-red mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue text-white font-semibold rounded-xl py-3 hover:brightness-110 transition disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Acessar"}
            </button>

            <p className="flex items-center gap-2 justify-center text-xs text-muted mt-6">
              <ShieldIcon /> Acesso restrito. Uso exclusivo.
            </p>
          </div>
        </div>
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
