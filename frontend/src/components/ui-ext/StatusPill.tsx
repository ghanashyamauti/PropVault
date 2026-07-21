import { cn } from "@/lib/utils";

type StatusKind = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

const styles: Record<StatusKind, string> = {
  success: "bg-emerald/10 text-emerald",
  warning: "bg-gold/10 text-gold",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-slate/10 text-slate",
  neutral: "bg-secondary text-muted-foreground",
  gold: "bg-gold text-white",
};

export function StatusPill({
  kind,
  children,
  className,
}: {
  kind: StatusKind;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter",
        styles[kind],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function plotStatusKind(status: string): StatusKind {
  return status === "SOLD"
    ? "gold"
    : status === "BOOKED"
      ? "info"
      : status === "INQUIRY"
        ? "warning"
        : "neutral";
}

export function customerStatusKind(status: string): StatusKind {
  return status === "FULLY_PAID"
    ? "success"
    : status === "OVERDUE"
      ? "danger"
      : status === "ON_TRACK"
        ? "info"
        : "neutral";
}
