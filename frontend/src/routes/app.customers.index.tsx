import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp, today } from "@/data/store";
import {
  customerStatus,
  effectiveStageStatus,
  fmtDate,
  money,
  moneyCompact,
  orgScope,
  plotCollected,
  currentUser,
  can,
} from "@/data/selectors";
import { StatusPill, customerStatusKind } from "@/components/ui-ext/StatusPill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Bell, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/customers/")({
  head: () => ({ meta: [{ title: "Customers — PropVault" }] }),
  component: Customers,
});

function Customers() {
  const state = useApp();
  const me = useApp(currentUser);
  const orgId = state.session?.org_id;
  const customers = orgScope(state.customers, orgId);
  const bookings = orgScope(state.bookings, orgId);
  const now = today(state);
  const sendReminder = useApp((s) => s.sendReminder);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ON_TRACK" | "OVERDUE" | "FULLY_PAID" | "TOKEN_ONLY">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = me?.permissions?.is_org_admin;
  const canView = isAdmin || can(me?.permissions, "customers", "view");

  if (!canView) {
    return (
      <AppShell variant="tenant" title="Customers" subtitle="Access restricted">
        <div className="max-w-md bg-white rounded-xl border border-border p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view customer profiles.
          </p>
        </div>
      </AppShell>
    );
  }

  const withStatus = customers.map((c) => {
    const booking = bookings.find((b) => b.customer_id === c.id && !b.cancelled_at);
    const stages = booking
      ? state.schedule.filter((s) => s.booking_id === booking.id).sort((a, b) => a.sort_order - b.sort_order)
      : [];
    const status = customerStatus(stages, now);
    return { customer: c, booking, stages, status };
  });

  const counters = {
    ON_TRACK: withStatus.filter((x) => x.status === "ON_TRACK").length,
    OVERDUE: withStatus.filter((x) => x.status === "OVERDUE").length,
    FULLY_PAID: withStatus.filter((x) => x.status === "FULLY_PAID").length,
    TOKEN_ONLY: withStatus.filter((x) => x.status === "TOKEN_ONLY").length,
  };

  const filtered = withStatus.filter((x) => {
    if (filter !== "ALL" && x.status !== filter) return false;
    if (q === "") return true;
    const needle = q.toLowerCase();
    const plotNum = x.booking
      ? state.plots.find((p) => p.id === x.booking!.plot_id)?.plot_number ?? ""
      : "";
    return (
      x.customer.full_name.toLowerCase().includes(needle) ||
      x.customer.phone.includes(q) ||
      (x.customer.email ?? "").toLowerCase().includes(needle) ||
      plotNum.toLowerCase().includes(needle)
    );
  });

  return (
    <AppShell variant="tenant" title="Customers" subtitle="Directory">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "On track", v: counters.ON_TRACK, k: "success" },
          { l: "Overdue", v: counters.OVERDUE, k: "danger" },
          { l: "Fully paid", v: counters.FULLY_PAID, k: "gold" },
          { l: "Token only", v: counters.TOKEN_ONLY, k: "neutral" },
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-white p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {c.l}
            </p>
            <p className="mt-1 text-3xl font-display font-semibold tabular">{c.v}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1">
          {(["ALL", "ON_TRACK", "OVERDUE", "FULLY_PAID", "TOKEN_ONLY"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors",
                filter === f
                  ? "bg-slate text-white border-slate"
                  : "bg-white border-border text-muted-foreground hover:text-slate",
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email, plot…" className="w-72" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-semibold">Customer</th>
              <th className="px-6 py-3 font-semibold">Phone</th>
              <th className="px-6 py-3 font-semibold">Plot</th>
              <th className="px-6 py-3 font-semibold text-right">Paid</th>
              <th className="px-6 py-3 font-semibold text-right">Balance</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(({ customer, booking, stages, status }) => {
              const plot = booking ? state.plots.find((p) => p.id === booking.plot_id) : null;
              const paid = booking ? plotCollected(booking.plot_id, state) : "0";
              const balance = booking
                ? String(Math.max(0, Number(booking.total_sale_price) - Number(paid)))
                : "0";
              const isOpen = expanded === customer.id;
              return (
                <Fragment key={customer.id}>
                  <tr className="hover:bg-surface/40">
                    <td className="px-6 py-3">
                      <button
                        onClick={() => setExpanded(isOpen ? null : customer.id)}
                        className="flex items-center gap-2 text-sm font-semibold"
                      >
                        {stages.length > 0 &&
                          (isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          ))}
                        {customer.full_name}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{customer.phone}</td>
                    <td className="px-6 py-3 text-sm">{plot ? plot.plot_number : "—"}</td>
                    <td className="px-6 py-3 text-right font-display tabular">
                      {moneyCompact(paid)}
                    </td>
                    <td className="px-6 py-3 text-right font-display tabular text-muted-foreground">
                      {moneyCompact(balance)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusPill kind={customerStatusKind(status)}>
                        {status.replace("_", " ")}
                      </StatusPill>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to="/app/customers/$id"
                        params={{ id: customer.id }}
                        className="text-xs font-medium text-slate hover:text-gold"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                  {isOpen && stages.length > 0 && (
                    <tr className="bg-surface/30">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="space-y-2">
                          {stages.map((s) => {
                            const st = effectiveStageStatus(s, now);
                            return (
                              <div
                                key={s.id}
                                className="flex items-center justify-between rounded-md bg-white px-3 py-2 border border-border"
                              >
                                <div>
                                  <p className="text-xs font-semibold">{s.stage_name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Due {fmtDate(s.due_date)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-display font-semibold tabular">
                                    {money(s.amount_due)}
                                  </span>
                                  <StatusPill
                                    kind={
                                      st === "PAID"
                                        ? "success"
                                        : st === "OVERDUE"
                                          ? "danger"
                                          : st === "PARTIAL"
                                            ? "warning"
                                            : "neutral"
                                    }
                                  >
                                    {st}
                                  </StatusPill>
                                  {st !== "PAID" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        sendReminder(s.id);
                                        toast.success(`Reminder sent to ${customer.full_name}`);
                                      }}
                                    >
                                      <Bell className="h-3 w-3" /> Remind
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No customers match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
