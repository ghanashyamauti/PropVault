import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui-ext/EmptyState";
import { useApp } from "@/data/store";
import { orgScope, siteProgress } from "@/data/selectors";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Plus } from "lucide-react";

export const Route = createFileRoute("/app/sites/")({
  head: () => ({ meta: [{ title: "Sites — PropVault" }] }),
  component: Sites,
});

function Sites() {
  const orgId = useApp((s) => s.session?.org_id);
  const sites = useApp((s) => orgScope(s.sites, orgId));
  const plots = useApp((s) => orgScope(s.plots, orgId));

  return (
    <AppShell
      variant="tenant"
      title="Sites"
      subtitle="Portfolio"
      actions={
        <Button asChild className="bg-slate hover:bg-slate/90">
          <Link to="/app/sites/new">
            <Plus className="h-4 w-4" /> Add site
          </Link>
        </Button>
      }
    >
      {sites.length === 0 ? (
        <EmptyState
          title="No sites yet"
          description="Create your first site to start subdividing plots and running the sales pipeline."
          icon={<MapIcon className="h-6 w-6" />}
          cta={{ label: "Add site", to: "/app/sites/new" }}
        />
      ) : (
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
                  {s.photo_url ? (
                    <img
                      src={s.photo_url}
                      alt={s.name}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-slate/5 via-transparent to-gold/10" />
                      <div className="absolute inset-0 grid place-items-center font-display italic text-parchment-ink text-2xl font-semibold opacity-40 group-hover:scale-105 transition-transform text-center px-4">
                        {s.name}
                      </div>
                    </>
                  )}
                  <div className="absolute top-3 left-3 text-[10px] uppercase tracking-widest bg-white/80 backdrop-blur rounded-full px-2 py-1 font-semibold text-slate">
                    {s.area_unit === "SQFT" ? "sq ft" : "sq m"}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate">{s.name}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">{s.address}</p>
                    </div>
                    <span className="text-xs font-display font-semibold text-gold shrink-0">
                      {prog.pct}%
                    </span>
                  </div>
                  <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-slate" style={{ width: `${prog.pct}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-display font-semibold">{prog.total}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                        Plots
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-display font-semibold text-emerald">{prog.sold}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                        Sold
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-display font-semibold">{prog.available}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                        Available
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
