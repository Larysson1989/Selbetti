export default function LiveDot({ ok = true }: { ok?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-green" : "bg-red"} animate-pulse`}
        style={{
          boxShadow: ok
            ? "0 0 10px 2px rgba(63,191,131,0.6)"
            : "0 0 10px 2px rgba(229,72,77,0.6)",
        }}
      />
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {ok ? "ao vivo" : "instável"}
      </span>
    </span>
  );
}
