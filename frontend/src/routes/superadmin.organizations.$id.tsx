import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { fmtDate } from "@/data/selectors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { Copy, ShieldCheck, Ban, Trash2 } from "lucide-react";

export const Route = createFileRoute("/superadmin/organizations/$id")({
  head: () => ({ meta: [{ title: "Organization — Platform" }] }),
  component: OrgDetail,
});

function OrgDetail() {
  const { id } = useParams({ from: "/superadmin/organizations/$id" });
  const navigate = useNavigate();
  const org = useApp((s) => s.organizations.find((o) => o.id === id));
  const users = useApp((s) => s.users.filter((u) => u.org_id === id));
  const audit = useApp((s) => s.audit.filter((a) => a.org_id === id).slice(0, 20));
  const suspend = useApp((s) => s.suspendOrg);
  const reactivate = useApp((s) => s.reactivateOrg);
  const del = useApp((s) => s.deleteOrg);
  const resetPw = useApp((s) => s.resetUserPassword);
  const [newPw, setNewPw] = useState<string | null>(null);

  if (!org) return <AppShell variant="superadmin" title="Not found">–</AppShell>;

  const admin = users.find((u) => u.permissions.is_org_admin);

  return (
    <AppShell
      variant="superadmin"
      title={org.name}
      subtitle="Organization detail"
      actions={
        <>
          {org.status === "ACTIVE" ? (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm(`Suspend ${org.name}? All users will be blocked.`)) {
                  suspend(id);
                  toast.success("Suspended");
                }
              }}
            >
              <Ban className="h-4 w-4" /> Suspend
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                reactivate(id);
                toast.success("Reactivated");
              }}
            >
              <ShieldCheck className="h-4 w-4" /> Reactivate
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              if (confirm(`Delete ${org.name}? This is irreversible.`)) {
                del(id);
                toast.success("Deleted");
                navigate({ to: "/superadmin/organizations" });
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Company info</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Phone" value={org.phone} />
              <Info label="Status" value={org.status} />
              <Info label="City" value={org.city} />
              <Info label="State" value={org.state} />
              <div className="col-span-2">
                <Info label="Address" value={org.address} />
              </div>
              <Info label="Created" value={fmtDate(org.created_at)} />
              <Info label="Staff" value={String(users.length)} />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Recent activity</h3>
            <div className="space-y-3">
              {audit.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {audit.map((a) => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                  <div className="size-8 rounded-full bg-slate/10 grid place-items-center font-display font-semibold text-slate text-xs">
                    {a.actor_name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{a.actor_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{fmtDate(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {admin && (
            <section className="bg-white rounded-xl border border-border p-6">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Organization admin
              </p>
              <p className="font-display text-lg font-semibold">{admin.full_name}</p>
              <p className="text-xs text-muted-foreground">{admin.email}</p>
              <Button
                className="mt-4 w-full bg-slate hover:bg-slate/90"
                onClick={() => {
                  const p = resetPw(admin.id);
                  setNewPw(p);
                }}
              >
                Reset admin password
              </Button>
              {newPw && (
                <div className="mt-3 rounded-md bg-surface px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-xs">{newPw}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newPw);
                      toast.success("Copied");
                    }}
                    className="text-muted-foreground hover:text-slate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value || "—"}</p>
    </div>
  );
}
