import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { KPICard } from "@/components/ui-ext/KPICard";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { useApp, today } from "@/data/store";
import {
  computeOrgKPIs,
  fmtDate,
  fmtShortDate,
  money,
  moneyCompact,
  orgScope,
  relativeDate,
  siteProgress,
  upcomingInstallments,
} from "@/data/selectors";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — PropVault" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useApp();
  const orgId = state.session!.org_id!;
  const now = today(state);
  const kpi = computeOrgKPIs(state, orgId);
  const sites = orgScope(state.sites, orgId);
  const plots = orgScope(state.plots, orgId);
  const upcoming = upcomingInstallments(state, orgId, now, 5);
  const recent = orgScope(state.transactions, orgId).slice(0, 6);
  const sendReminder = useApp((s) => s.sendReminder);

  const inMonth = kpi.monthlyIn[kpi.monthlyIn.length - 1] || 0;
  const inPrev = kpi.monthlyIn[kpi.monthlyIn.length - 2] || 0;
  const delta = inPrev > 0 ? ((inMonth - inPrev) / inPrev) * 100 : 0;

  return (
    <AppShell
      variant="tenant"
      title="Executive Overview"
      subtitle={`Live · ${fmtDate(now.toISOString())}`}
      actions={
        <>
          <Button asChild variant="outline" className="border-border">
            <Link to="/app/payments">View ledger</Link>
          </Button>
          <Button asChild className="bg-slate hover:bg-slate/90">
            <Link to="/app/payments/new">
              <Plus className="h-4 w-4" />
              New transaction
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        {/* KPI grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            label="Collected"
            value={moneyCompact(kpi.collected)}
            delta={{ pct: delta, label: "vs last month" }}
            sparkline={kpi.monthlyIn}
          />
          <KPICard
            label="Pending"
            value={moneyCompact(kpi.pending)}
            hint={
              <>
                {
                  upcomingInstallments(state, orgId, now, 100).filter(
                    (u) => new Date(u.stage.due_date) < now,
                  ).length
                }{" "}
                overdue · reminders available
              </>
            }
            variant="warning"
          />
          <KPICard
            label="Payable"
            value={moneyCompact(kpi.payable)}
            hint="Landowner & vendor outflows"
          />
          <KPICard
            label="Net cash flow"
            value={moneyCompact(kpi.net)}
            hint={
              <span className="text-white/60">
                {Number(kpi.net) > 0 ? "Healthy liquidity" : "Attention required"}
              </span>
            }
            variant="primary"
            sparkline={kpi.monthlyIn.map((v, i) => v - (kpi.monthlyOut[i] || 0))}
          />
        </section>

        {/* Chart + Upcoming */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-xl border border-border p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg font-semibold">Cash flow trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last 6 months, in vs out
                </p>
              </div>
              <div className="flex gap-4 text-[10px] uppercase font-bold tracking-tighter">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate" /> Inflow
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-gold/60" /> Outflow
                </span>
              </div>
            </div>
            <CashFlowChart
              labels={kpi.labels}
              inflow={kpi.monthlyIn}
              outflow={kpi.monthlyOut}
            />
          </div>

          <div className="bg-white rounded-xl border border-border p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-semibold">Upcoming installments</h3>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending installments.</p>
            ) : (
              <div className="space-y-5">
                {upcoming.map((u) => (
                  <div key={u.stage.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        Plot {u.plot?.plot_number} · {u.customer?.full_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {u.stage.stage_name} · {relativeDate(u.stage.due_date, now)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-display font-semibold tabular">
                        {moneyCompact(u.stage.amount_due)}
                      </p>
                      <button
                        onClick={() => {
                          sendReminder(u.stage.id);
                          toast.success(`Reminder sent to ${u.customer?.full_name}`);
                        }}
                        className="text-[10px] uppercase tracking-widest text-gold hover:underline font-semibold mt-0.5"
                      >
                        Send reminder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              to="/app/customers"
              className="mt-6 block text-center py-2 rounded-md border border-border text-xs font-medium hover:bg-secondary transition-colors"
            >
              View full schedule
            </Link>
          </div>
        </section>

        {/* Recent transactions */}
        <section className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-8 py-6 border-b border-border flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Recent transactions</h3>
            <Link to="/app/payments" className="text-xs font-medium text-muted-foreground hover:text-slate">
              View all →
            </Link>
          </div>
          <table className="w-full text-left">
            <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-8 py-4 font-semibold">Date</th>
                <th className="px-8 py-4 font-semibold">Party</th>
                <th className="px-8 py-4 font-semibold">Reference</th>
                <th className="px-8 py-4 font-semibold">Type</th>
                <th className="px-8 py-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((t) => (
                <tr key={t.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-8 py-4 text-sm">{fmtShortDate(t.transaction_date)}</td>
                  <td className="px-8 py-4 text-sm font-medium">{t.party_name}</td>
                  <td className="px-8 py-4 text-[10px] font-mono text-muted-foreground uppercase">
                    {t.type}
                  </td>
                  <td className="px-8 py-4">
                    {t.direction === "IN" ? (
                      <StatusPill kind="success">
                        <ArrowDownLeft className="h-2.5 w-2.5 inline mr-0.5" />
                        Inflow
                      </StatusPill>
                    ) : (
                      <StatusPill kind="warning">
                        <ArrowUpRight className="h-2.5 w-2.5 inline mr-0.5" />
                        Outflow
                      </StatusPill>
                    )}
                  </td>
                  <td className="px-8 py-4 text-right font-display font-semibold tabular">
                    {money(t.amount)}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Sites */}
        {sites.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">My sites</h3>
              <Link to="/app/sites" className="text-xs font-medium text-muted-foreground hover:text-slate">
                All sites →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((s) => {
                const prog = siteProgress(s, plots);
                return (
                  <Link
                    key={s.id}
                    to="/app/sites/$id"
                    params={{ id: s.id }}
                    className="group bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-[16/9] bg-parchment relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate/5 via-transparent to-gold/10" />
                      <div className="absolute inset-0 grid place-items-center font-display text-parchment-ink italic text-2xl font-semibold opacity-40 group-hover:scale-105 transition-transform">
                        {s.name}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate">{s.name}</h4>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {s.address}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-gold shrink-0">
                          {prog.pct}%
                        </span>
                      </div>
                      <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate"
                          style={{ width: `${prog.pct}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
                        <span>{prog.total} plots</span>
                        <span>·</span>
                        <span>{prog.sold} sold</span>
                        <span>·</span>
                        <span>{prog.available} avail</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
