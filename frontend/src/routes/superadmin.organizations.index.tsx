import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { fmtDate } from "@/data/selectors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgStatus } from "@/data/types";

export const Route = createFileRoute("/superadmin/organizations/")({
  head: () => ({ meta: [{ title: "Organizations — Platform" }] }),
  component: Orgs,
});

function Orgs() {
  const orgs = useApp((s) => s.organizations);
  const users = useApp((s) => s.users);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | OrgStatus>("ALL");

  const filtered = orgs.filter(
    (o) =>
      (filter === "ALL" || o.status === filter) &&
      (q === "" ||
        o.name.toLowerCase().includes(q.toLowerCase()) ||
        o.city.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AppShell
      variant="superadmin"
      title="Organizations"
      subtitle="Directory"
      actions={
        <Button asChild className="bg-slate hover:bg-slate/90">
          <Link to="/superadmin/organizations/new">
            <Plus className="h-4 w-4" /> New organization
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {(["ALL", "ACTIVE", "PENDING", "SUSPENDED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                filter === f
                  ? "bg-slate text-white border-slate"
                  : "bg-white border-border text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Input
          className="ml-auto w-72"
          placeholder="Search organizations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-semibold">Organization</th>
              <th className="px-6 py-3 font-semibold">Location</th>
              <th className="px-6 py-3 font-semibold">Staff</th>
              <th className="px-6 py-3 font-semibold">Created</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((o) => {
              const staff = users.filter((u) => u.org_id === o.id).length;
              return (
                <tr key={o.id} className="hover:bg-surface/40">
                  <td className="px-6 py-3">
                    <p className="text-sm font-semibold">{o.name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.phone}</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {o.city}, {o.state}
                  </td>
                  <td className="px-6 py-3 text-sm tabular">{staff}</td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {fmtDate(o.created_at)}
                  </td>
                  <td className="px-6 py-3">
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
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      to="/superadmin/organizations/$id"
                      params={{ id: o.id }}
                      className="text-xs font-medium text-slate hover:text-gold"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
