export default function LiveDot({ ok = true }: { ok?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-green" : "bg-red"}`} />
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {ok ? "ao vivo" : "instável"}
      </span>
    </span>
  );
}
