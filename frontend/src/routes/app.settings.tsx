import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { currentUser } from "@/data/selectors";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — PropVault" }] }),
  component: Settings,
});

function Settings() {
  const user = useApp(currentUser);
  const org = useApp((s) =>
    s.session?.org_id ? s.organizations.find((o) => o.id === s.session!.org_id) ?? null : null,
  );
  const smtp = useApp((s) => s.smtp);
  const updateOrg = useApp((s) => s.updateOrg);
  const updateSmtp = useApp((s) => s.updateSmtp);
  const changePassword = useApp((s) => s.changePassword);
  const updateStaff = useApp((s) => s.updateStaff);

  const [orgForm, setOrgForm] = useState(org ?? { name: "", phone: "", address: "", city: "", state: "" });
  const [smtpForm, setSmtpForm] = useState(smtp);
  const [profile, setProfile] = useState({
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  if (!user) return <AppShell variant="tenant" title="Settings">–</AppShell>;

  return (
    <AppShell variant="tenant" title="Settings" subtitle="Workspace, profile & email">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-6xl">
        {/* Org */}
        {org && user.permissions.is_org_admin && (
          <section className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Organization profile</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input
                  className="mt-1"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  className="mt-1"
                  value={orgForm.phone}
                  onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  className="mt-1"
                  value={orgForm.city}
                  onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  className="mt-1"
                  value={orgForm.state}
                  onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="mt-4 bg-slate hover:bg-slate/90"
              onClick={() => {
                updateOrg(org.id, orgForm);
                toast.success("Organization updated");
              }}
            >
              Save changes
            </Button>
          </section>
        )}

        {/* Profile */}
        <section className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-display text-lg font-semibold mb-4">My profile</h3>
          <div className="space-y-4">
            <div>
              <Label>Full name</Label>
              <Input
                className="mt-1"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
          </div>
          <Button
            className="mt-4 bg-slate hover:bg-slate/90"
            onClick={() => {
              updateStaff(user.id, profile);
              toast.success("Profile updated");
            }}
          >
            Save profile
          </Button>
        </section>

        {/* Password */}
        <section className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Change password</h3>
          <div className="space-y-4">
            <div>
              <Label>Current</Label>
              <Input
                type="password"
                className="mt-1"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
              />
            </div>
            <div>
              <Label>New password</Label>
              <Input
                type="password"
                className="mt-1"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
              />
            </div>
            <div>
              <Label>Confirm</Label>
              <Input
                type="password"
                className="mt-1"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              />
            </div>
          </div>
          <Button
            className="mt-4 bg-slate hover:bg-slate/90"
            onClick={() => {
              if (pw.current !== user.password) return toast.error("Current password wrong");
              if (pw.next.length < 8) return toast.error("Min 8 characters");
              if (pw.next !== pw.confirm) return toast.error("Passwords don't match");
              changePassword(user.id, pw.next);
              setPw({ current: "", next: "", confirm: "" });
              toast.success("Password changed");
            }}
          >
            Update password
          </Button>
        </section>

        {/* SMTP */}
        {user.permissions.is_org_admin && (
          <section className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">SMTP settings</h3>
              <span className="text-[10px] uppercase tracking-widest bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">
                Demo — not sending
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Host</Label>
                <Input
                  className="mt-1"
                  value={smtpForm.host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={smtpForm.port}
                  onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>User</Label>
                <Input
                  className="mt-1"
                  value={smtpForm.user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                />
              </div>
              <div>
                <Label>From name</Label>
                <Input
                  className="mt-1"
                  value={smtpForm.from_name}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                />
              </div>
              <div>
                <Label>From email</Label>
                <Input
                  className="mt-1"
                  value={smtpForm.from_email}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="mt-4 bg-slate hover:bg-slate/90"
              onClick={() => {
                updateSmtp(smtpForm);
                toast.success("SMTP settings saved");
              }}
            >
              Save SMTP
            </Button>
          </section>
        )}

        {/* Audit log export */}
        <section className="bg-white rounded-xl border border-border p-6 xl:col-span-2">
          <h3 className="font-display text-lg font-semibold mb-2">Audit log</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Download the full audit trail as CSV. Includes every mutation
            (bookings, payments, plot edits, staff changes) with actor and timestamp.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const rows = useApp.getState().audit;
              const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
              const csv = ["timestamp,actor,action,entity_type,entity_id,detail"]
                .concat(
                  rows.map((r) =>
                    [r.timestamp, r.actor_name, r.action, r.entity_type, r.entity_id ?? "", r.detail]
                      .map(esc)
                      .join(","),
                  ),
                )
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `propvault-audit-${Date.now()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${rows.length} audit entries`);
            }}
          >
            Download audit CSV
          </Button>
        </section>
      </div>

    </AppShell>
  );
}
