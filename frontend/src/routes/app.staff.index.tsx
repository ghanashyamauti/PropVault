import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { fmtDate, orgScope } from "@/data/selectors";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/staff/")({
  head: () => ({ meta: [{ title: "Staff — PropVault" }] }),
  component: StaffPage,
});

function StaffPage() {
  const orgId = useApp((s) => s.session?.org_id);
  const users = useApp((s) => orgScope(s.users, orgId));
  const templates = useApp((s) => orgScope(s.templates, orgId));
  const resetPw = useApp((s) => s.resetUserPassword);
  const deleteStaff = useApp((s) => s.deleteStaff);

  const roots = users.filter((u) => !u.reports_to);
  const kids = (parentId: string) => users.filter((u) => u.reports_to === parentId);

  const renderRow = (u: (typeof users)[number], depth = 0) => {
    const tpl = templates.find((t) => t.id === u.permission_template_id);
    const label = u.permissions.is_org_admin
      ? "Org Admin"
      : tpl
        ? tpl.name
        : "Custom";
    return (
      <div key={u.id}>
        <div
          className="flex items-center justify-between border-b border-border py-3 hover:bg-surface/40"
          style={{ paddingLeft: 16 + depth * 24 }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-full bg-slate/10 grid place-items-center font-display font-semibold text-slate text-sm">
              {u.full_name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{u.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill kind={u.permissions.is_org_admin ? "gold" : u.permissions.view_team_data ? "info" : "neutral"}>
              {label}
            </StatusPill>
            <span className="text-[10px] text-muted-foreground w-24 text-right">
              {u.last_login_at ? `Active ${fmtDate(u.last_login_at)}` : "Never signed in"}
            </span>
            <div className="flex gap-2 pr-4">
              <Link
                to="/app/staff/$id"
                params={{ id: u.id }}
                className="text-[10px] uppercase tracking-widest font-semibold text-slate hover:text-gold"
              >
                Edit
              </Link>
              <button
                className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-slate"
                onClick={() => {
                  const p = resetPw(u.id);
                  toast.success(`New password: ${p}`, { duration: 8000 });
                }}
              >
                Reset PW
              </button>
              {!u.permissions.is_org_admin && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${u.full_name}?`)) {
                      deleteStaff(u.id);
                      toast.success("Removed");
                    }
                  }}
                  className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        {kids(u.id).map((k) => renderRow(k, depth + 1))}
      </div>
    );
  };

  return (
    <AppShell
      variant="tenant"
      title="Staff"
      subtitle={`Hierarchy · ${users.length} member${users.length === 1 ? "" : "s"}`}
      actions={
        <Button asChild className="bg-slate hover:bg-slate/90">
          <Link to="/app/staff/new">
            <Plus className="h-4 w-4" /> Invite staff
          </Link>
        </Button>
      }
    >
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {roots.map((r) => renderRow(r))}
      </div>
    </AppShell>
  );
}
