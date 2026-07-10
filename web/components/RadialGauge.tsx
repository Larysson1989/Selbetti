"use client";

interface RadialGaugeProps {
  label: string;
  value: number | null; // 0-100
  size?: number;
}

function colorFor(value: number): string {
  if (value >= 80) return "#3FBF83";
  if (value >= 50) return "#F2A93B";
  return "#E5484D";
}

export default function RadialGauge({ label, value, size = 96 }: RadialGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circumference;
  const color = value == null ? "#8B93A1" : colorFor(pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#262D38"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg text-paper">
            {value == null ? "—" : `${Math.round(pct)}%`}
          </span>
        </div>
      </div>
      <span
        className="text-xs text-muted text-center max-w-[8rem] truncate"
        title={label}
      >
        {label}
      </span>
    </div>
  );
}
