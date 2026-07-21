import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

interface KPIProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { pct: number; label: string };
  variant?: "default" | "primary" | "warning";
  sparkline?: number[];
}

export function KPICard({ label, value, hint, delta, variant = "default", sparkline }: KPIProps) {
  const isDark = variant === "primary";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 flex flex-col justify-between h-40",
        isDark
          ? "bg-slate text-white border-slate"
          : variant === "warning"
            ? "bg-white border-border"
            : "bg-white border-border",
      )}
    >
      <p
        className={cn(
          "text-[10px] uppercase tracking-widest",
          isDark ? "text-white/50" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <div>
        <p className={cn("font-display text-3xl font-semibold tabular", isDark && "text-white")}>
          {value}
        </p>
        {delta && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1.5 text-xs font-medium",
              delta.pct >= 0
                ? isDark
                  ? "text-emerald-300"
                  : "text-emerald"
                : "text-destructive",
            )}
          >
            {delta.pct >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {delta.pct >= 0 ? "+" : ""}
              {delta.pct.toFixed(1)}%
            </span>
            <span className={cn(isDark ? "text-white/40" : "text-muted-foreground", "font-normal")}>
              {delta.label}
            </span>
          </div>
        )}
        {!delta && hint && (
          <div
            className={cn(
              "mt-2 text-xs",
              variant === "warning" ? "text-gold" : "text-muted-foreground",
            )}
          >
            {hint}
          </div>
        )}
      </div>
      {sparkline && sparkline.length > 1 && (
        <Sparkline data={sparkline} color={isDark ? "#f5efe0" : "#92400e"} />
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute bottom-0 right-0 h-12 w-24 opacity-40"
    >
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
