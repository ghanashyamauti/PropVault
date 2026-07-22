import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { orgScope, currentUser, can } from "@/data/selectors";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { Star, Trash2, Copy, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/templates/")({
  head: () => ({ meta: [{ title: "Permission templates — PropertyWala" }] }),
  component: Templates,
});

function Templates() {
  const me = useApp(currentUser);
  const orgId = useApp((s) => s.session?.org_id);
  const templates = useApp((s) => orgScope(s.templates, orgId));
  const setDefault = useApp((s) => s.setDefaultTemplate);
  const del = useApp((s) => s.deleteTemplate);
  const create = useApp((s) => s.createTemplate);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const isAdmin = me?.permissions?.is_org_admin;
  const canView = isAdmin || can(me?.permissions, "templates", "view");
  const canEdit = isAdmin || can(me?.permissions, "templates", "edit");

  if (!canView) {
    return (
      <AppShell variant="tenant" title="Permission templates" subtitle="Access restricted">
        <div className="max-w-md bg-white rounded-xl border border-border p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view or manage permission templates.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      variant="tenant"
      title="Permission templates"
      subtitle="Presets"
      actions={
        canEdit ? (
          <Button className="bg-slate hover:bg-slate/90" onClick={() => setOpen(true)}>
            New template
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => {
          const entries = Object.entries(t.permissions.entities ?? {});
          const totalGranted = entries.reduce(
            (sum, [_e, actions]) =>
              sum + Object.values(actions ?? {}).filter(Boolean).length,
            0,
          );
          return (
            <div key={t.id} className="rounded-xl border border-border bg-white p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                    Used by {t.usage_count} staff
                  </p>
                </div>
                {t.is_default && <StatusPill kind="gold">Default</StatusPill>}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {t.permissions.is_org_admin && (
                  <p className="text-slate font-semibold">Organization admin</p>
                )}
                {t.permissions.view_team_data && <p>Sees team data</p>}
                <p>{totalGranted} granted permissions across {entries.length} entities</p>
              </div>
              <div className="mt-4 flex gap-2">
                {!t.is_default && (
                  <button
                    onClick={() => {
                      setDefault(t.id);
                      toast.success(`${t.name} set as default`);
                    }}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-slate hover:text-gold"
                  >
                    <Star className="h-3 w-3" /> Make default
                  </button>
                )}
                <button
                  onClick={() => {
                    create({
                      name: `${t.name} (copy)`,
                      is_default: false,
                      permissions: JSON.parse(JSON.stringify(t.permissions)),
                    });
                    toast.success("Duplicated");
                  }}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-slate hover:text-gold"
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                {t.usage_count === 0 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete template "${t.name}"?`)) {
                        del(t.id);
                        toast.success("Deleted");
                      }
                    }}
                    className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            <p className="mt-3 text-xs text-muted-foreground">
              Empty by default. Edit permissions later via the staff wizard.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-slate hover:bg-slate/90"
              onClick={() => {
                if (!name.trim()) return toast.error("Name required");
                create({
                  name,
                  is_default: false,
                  permissions: { is_org_admin: false, view_team_data: false, entities: {} },
                });
                setName("");
                setOpen(false);
                toast.success("Template created");
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
