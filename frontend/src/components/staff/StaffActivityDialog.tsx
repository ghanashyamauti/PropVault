import { useState } from "react";
import { useApp } from "@/data/store";
import { orgScope, fmtDate } from "@/data/selectors";
import type { User, AuditEntry, Plot } from "@/data/types";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Activity,
  CreditCard,
  FileCheck,
  Tag,
  UserCheck,
  Shield,
  Filter,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPlot?: (plotId: string) => void;
}

export function StaffActivityDialog({ user, open, onOpenChange, onOpenPlot }: Props) {
  const orgId = useApp((s) => s.session?.org_id);
  const auditLogs = useApp((s) => orgScope(s.audit, orgId));
  const templates = useApp((s) => orgScope(s.templates, orgId));
  const plots = useApp((s) => orgScope(s.plots, orgId));
  const bookings = useApp((s) => orgScope(s.bookings, orgId));
  const transactions = useApp((s) => orgScope(s.transactions, orgId));

  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "BOOKING" | "PAYMENT" | "PLOT" | "LOGIN"
  >("ALL");

  if (!user) return null;

  const tpl = templates.find((t) => t.id === user.permission_template_id);
  const roleLabel = user.permissions.is_org_admin
    ? "Org Admin"
    : tpl
      ? tpl.name
      : "Custom Role";

  // Filter audit records matching this staff member
  const userAudits = auditLogs
    .filter(
      (a) =>
        a.actor_id === user.id ||
        (a.actor_name &&
          a.actor_name.toLowerCase() === user.full_name.toLowerCase()),
    )
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  const bookingCount = userAudits.filter((a) => a.action === "BOOKING_CREATED").length;
  const paymentCount = userAudits.filter((a) => a.action === "PAYMENT_RECORDED").length;
  const plotCount = userAudits.filter(
    (a) =>
      a.action === "PLOT_STATUS_CHANGED" ||
      a.action === "PLOT_CREATED" ||
      a.action === "PLOT_UPDATED",
  ).length;

  const filteredLogs = userAudits.filter((a) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "BOOKING") return a.action.includes("BOOKING");
    if (activeFilter === "PAYMENT") return a.action.includes("PAYMENT");
    if (activeFilter === "PLOT") return a.action.includes("PLOT");
    if (activeFilter === "LOGIN") return a.action.includes("LOGIN") || a.action.includes("USER");
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes("BOOKING")) {
      return { label: "Booking", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: FileCheck };
    }
    if (action.includes("PAYMENT")) {
      return { label: "Payment", color: "bg-blue-50 text-blue-700 border-blue-200", icon: CreditCard };
    }
    if (action.includes("PLOT")) {
      return { label: "Plot Action", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Tag };
    }
    if (action.includes("LOGIN")) {
      return { label: "Session", color: "bg-slate-50 text-slate-700 border-slate-200", icon: UserCheck };
    }
    return { label: action.replace(/_/g, " "), color: "bg-purple-50 text-purple-700 border-purple-200", icon: Activity };
  };

  const resolvePlotForLog = (log: AuditEntry): Plot | null => {
    if (log.entity_type === "plot" && log.entity_id) {
      const p = plots.find((x) => x.id === log.entity_id);
      if (p) return p;
    }
    if (log.entity_type === "booking" && log.entity_id) {
      const b = bookings.find((x) => x.id === log.entity_id);
      if (b) {
        const p = plots.find((x) => x.id === b.plot_id);
        if (p) return p;
      }
    }
    if (log.entity_type === "transaction" && log.entity_id) {
      const tx = transactions.find((x) => x.id === log.entity_id);
      if (tx?.plot_id) {
        const p = plots.find((x) => x.id === tx.plot_id);
        if (p) return p;
      }
    }
    if (log.detail) {
      return (
        plots.find(
          (p) =>
            log.detail.toLowerCase().includes(`plot ${p.plot_number.toLowerCase()}`) ||
            log.detail.toLowerCase().includes(`plot #${p.plot_number.toLowerCase()}`),
        ) ?? null
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border">
        {/* Header card */}
        <div className="bg-slate text-white p-6 shrink-0 relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-full bg-white/10 border border-white/20 grid place-items-center font-display font-semibold text-white text-lg">
                {user.full_name.slice(0, 1)}
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">{user.full_name}</h2>
                <p className="text-xs text-white/70">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gold text-slate">
                    <Shield className="h-3 w-3" />
                    {roleLabel}
                  </span>
                  <span className="text-[11px] text-white/60">
                    {user.last_login_at
                      ? `Last active ${fmtDate(user.last_login_at)}`
                      : "Never signed in"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick summary metric cards */}
          <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10 text-center">
            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <p className="text-[9px] uppercase tracking-widest text-white/60">Total Activity</p>
              <p className="text-lg font-bold font-display mt-0.5">{userAudits.length}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <p className="text-[9px] uppercase tracking-widest text-white/60">Bookings</p>
              <p className="text-lg font-bold font-display mt-0.5 text-emerald-400">{bookingCount}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <p className="text-[9px] uppercase tracking-widest text-white/60">Payments</p>
              <p className="text-lg font-bold font-display mt-0.5 text-blue-400">{paymentCount}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <p className="text-[9px] uppercase tracking-widest text-white/60">Plot Actions</p>
              <p className="text-lg font-bold font-display mt-0.5 text-amber-400">{plotCount}</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-border bg-surface flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Activity:</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: "ALL", label: `All (${userAudits.length})` },
                { id: "BOOKING", label: `Bookings (${bookingCount})` },
                { id: "PAYMENT", label: `Payments (${paymentCount})` },
                { id: "PLOT", label: `Plots (${plotCount})` },
                { id: "LOGIN", label: "Sessions" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer border",
                  activeFilter === f.id
                    ? "bg-slate text-white border-slate"
                    : "bg-white border-border text-muted-foreground hover:bg-slate-50",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chronological Activity Feed */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No activity records found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Actions performed by {user.full_name.split(" ")[0]} will automatically log here.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const Icon = badge.icon;
              const targetPlot = resolvePlotForLog(log);

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border border-border/80 bg-white p-3.5 shadow-sm hover:border-slate/30 transition-colors group"
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg border shrink-0 mt-0.5",
                      badge.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate truncate">
                        {log.detail}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                        {fmtDate(log.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border",
                            badge.color,
                          )}
                        >
                          {badge.label}
                        </span>
                        {log.entity_type && (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {log.entity_type}
                          </span>
                        )}
                      </div>

                      {/* Clickable Plot Button */}
                      {targetPlot && onOpenPlot && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenPlot(targetPlot.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                          title={`Click to open details for Plot ${targetPlot.plot_number}`}
                        >
                          <MapPin className="h-3 w-3 text-amber-600" />
                          <span>Plot {targetPlot.plot_number}</span>
                          <ExternalLink className="h-2.5 w-2.5 text-amber-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
