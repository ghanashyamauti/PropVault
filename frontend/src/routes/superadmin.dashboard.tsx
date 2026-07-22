import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { KPICard } from "@/components/ui-ext/KPICard";
import { useApp } from "@/data/store";
import { fmtDate } from "@/data/selectors";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/superadmin/dashboard")({
  head: () => ({ meta: [{ title: "Overview — PropertyWala Platform" }] }),
  component: SuperDashboard,
});

function SuperDashboard() {
  const orgs = useApp((s) => s.organizations);
  const users = useApp((s) => s.users.filter((u) => !u.is_superadmin));
  const active = orgs.filter((o) => o.status === "ACTIVE").length;
  const suspended = orgs.filter((o) => o.status === "SUSPENDED").length;
  const audit = useApp((s) => s.audit.slice(0, 10));

  return (
    <AppShell
      variant="superadmin"
      title="Platform overview"
      subtitle="PropertyWala"
      actions={
        <Button asChild className="bg-slate hover:bg-slate/90">
          <Link to="/superadmin/organizations/new">
            <Plus className="h-4 w-4" /> New organization
          </Link>
        </Button>
      }
    >
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard label="Total organizations" value={orgs.length} />
        <KPICard label="Active" value={active} hint="Serving customers" />
        <KPICard label="Suspended" value={suspended} variant="warning" hint="Access blocked" />
        <KPICard label="Total staff" value={users.length} variant="primary" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Recent organizations</h3>
            <Link to="/superadmin/organizations" className="text-xs text-muted-foreground hover:text-slate">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {orgs.slice(0, 5).map((o) => (
              <Link
                key={o.id}
                to="/superadmin/organizations/$id"
                params={{ id: o.id }}
                className="block rounded-md border border-border p-3 hover:bg-secondary/60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{o.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {o.city}, {o.state} · {fmtDate(o.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-tighter rounded-full px-2 py-0.5 ${
                      o.status === "ACTIVE"
                        ? "bg-emerald/10 text-emerald"
                        : o.status === "SUSPENDED"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Platform activity</h3>
          <div className="space-y-3">
            {audit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                <div className="size-8 rounded-full bg-slate/10 grid place-items-center font-display font-semibold text-slate text-xs">
                  {a.actor_name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{a.actor_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {a.detail}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {fmtDate(a.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
