import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { fmtDate, orgScope, currentUser, can } from "@/data/selectors";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { Button } from "@/components/ui/button";
import { Plus, ShieldAlert, Activity } from "lucide-react";
import { toast } from "sonner";
import { StaffActivityDialog } from "@/components/staff/StaffActivityDialog";
import { PlotDrawer } from "@/components/plots/PlotDrawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { User } from "@/data/types";

export const Route = createFileRoute("/app/staff/")({
  head: () => ({ meta: [{ title: "Staff — PropertyWala" }] }),
  component: StaffPage,
});

function StaffPage() {
  const me = useApp(currentUser);
  const orgId = useApp((s) => s.session?.org_id);
  const users = useApp((s) => orgScope(s.users, orgId));
  const templates = useApp((s) => orgScope(s.templates, orgId));
  const resetPw = useApp((s) => s.resetUserPassword);
  const deleteStaff = useApp((s) => s.deleteStaff);

  const [activityUser, setActivityUser] = useState<User | null>(null);
  const [openPlotId, setOpenPlotId] = useState<string | null>(null);

  const isAdmin = me?.permissions?.is_org_admin;
  const canView = isAdmin || can(me?.permissions, "staff", "view");
  const canAdd = isAdmin || can(me?.permissions, "staff", "add");
  const canEdit = isAdmin || can(me?.permissions, "staff", "edit");
  const canDelete = isAdmin || can(me?.permissions, "staff", "delete");

  if (!canView) {
    return (
      <AppShell variant="tenant" title="Staff" subtitle="Access restricted">
        <div className="max-w-md bg-white rounded-xl border border-border p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view staff members. Please contact your organization administrator.
          </p>
        </div>
      </AppShell>
    );
  }

  const roots = users.filter((u) => !u.reports_to);
  const kids = (parentId: string) => users.filter((u) => u.reports_to === parentId);

  const renderRow = (u: (typeof users)[number], depth = 0) => {
    const tpl = templates.find((t) => t.id === u.permission_template_id);
    const label = u.permissions.is_org_admin
      ? "Org Admin"
      : tpl
        ? tpl.name
        : "Custom";

    const isTargetAdmin = u.permissions.is_org_admin;
    const canResetThisUser = isAdmin || (canEdit && !isTargetAdmin);
    const canEditThisUser = isAdmin || (canEdit && !isTargetAdmin);
    const canDeleteThisUser = isAdmin || (canDelete && !isTargetAdmin && me?.id !== u.id);

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
            <div className="flex items-center gap-2 pr-4">
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-slate/80 hover:text-slate bg-slate/5 hover:bg-slate/10 px-2 py-1 rounded transition-colors"
                onClick={() => setActivityUser(u)}
                title="View full staff activity trail"
              >
                <Activity className="h-3 w-3 text-gold" />
                <span>Activity</span>
              </button>

              {canEditThisUser && (
                <Link
                  to="/app/staff/$id"
                  params={{ id: u.id }}
                  className="text-[10px] uppercase tracking-widest font-semibold text-slate hover:text-gold"
                >
                  Edit
                </Link>
              )}
              {canResetThisUser && (
                <button
                  className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-slate"
                  onClick={() => {
                    const p = resetPw(u.id);
                    toast.success(`New password: ${p}`, { duration: 8000 });
                  }}
                >
                  Reset PW
                </button>
              )}
              {canDeleteThisUser && (
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
        canAdd ? (
          <Button asChild className="bg-slate hover:bg-slate/90">
            <Link to="/app/staff/new">
              <Plus className="h-4 w-4" /> Invite staff
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {roots.map((u) => renderRow(u, 0))}
      </div>

      <StaffActivityDialog
        user={activityUser}
        open={!!activityUser}
        onOpenChange={(open) => !open && setActivityUser(null)}
        onOpenPlot={(plotId) => setOpenPlotId(plotId)}
      />

      <Sheet open={!!openPlotId} onOpenChange={(o) => !o && setOpenPlotId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto p-0">
          {openPlotId && <PlotDrawer plotId={openPlotId} onClose={() => setOpenPlotId(null)} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
