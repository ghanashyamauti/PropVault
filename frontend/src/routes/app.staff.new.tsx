import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { orgScope, currentUser, can } from "@/data/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import type {
  PermissionAction,
  PermissionEntity,
  PermissionMatrix,
} from "@/data/types";
import { toast } from "sonner";
import { Copy, ShieldAlert } from "lucide-react";

const entities: { id: PermissionEntity; label: string }[] = [
  { id: "sites", label: "Sites" },
  { id: "plots", label: "Plots" },
  { id: "customers", label: "Customers" },
  { id: "bookings", label: "Bookings" },
  { id: "payments", label: "Payments" },
  { id: "staff", label: "Staff" },
  { id: "templates", label: "Templates" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];
const actions: PermissionAction[] = ["view", "add", "edit", "delete"];

interface Props {
  mode: "create" | "edit";
  userId?: string;
}

function StaffFormComponent({ mode, userId }: Props) {
  const navigate = useNavigate();
  const me = useApp(currentUser);
  const orgId = useApp((s) => s.session?.org_id);
  const users = useApp((s) => orgScope(s.users, orgId));
  const templates = useApp((s) => orgScope(s.templates, orgId));
  const existing = useApp((s) => (userId ? s.users.find((u) => u.id === userId) : null));
  const createStaff = useApp((s) => s.createStaff);
  const updateStaff = useApp((s) => s.updateStaff);
  const createTemplate = useApp((s) => s.createTemplate);

  const isMeAdmin = me?.permissions?.is_org_admin;
  const canAccess = isMeAdmin || can(me?.permissions, "staff", mode === "create" ? "add" : "edit");

  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState(existing?.full_name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [reportsTo, setReportsTo] = useState<string | null>(existing?.reports_to ?? null);
  const [templateId, setTemplateId] = useState<string | null>(existing?.permission_template_id ?? null);
  const [perms, setPerms] = useState<PermissionMatrix>(
    existing?.permissions ?? {
      is_org_admin: false,
      view_team_data: false,
      entities: {},
    },
  );
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  if (!canAccess) {
    return (
      <AppShell variant="tenant" title="Staff" subtitle="Access restricted">
        <div className="max-w-md bg-white rounded-xl border border-border p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            You do not have permission to {mode === "create" ? "add" : "edit"} staff members.
          </p>
        </div>
      </AppShell>
    );
  }

  useEffect(() => {
    if (!templateId) return;
    const t = templates.find((x) => x.id === templateId);
    if (t) setPerms(JSON.parse(JSON.stringify(t.permissions)));
  }, [templateId]);

  const togglePerm = (e: PermissionEntity, a: PermissionAction) => {
    setPerms((prev) => {
      const cur = { ...(prev.entities[e] ?? {}) };
      cur[a] = !cur[a];
      return { ...prev, entities: { ...prev.entities, [e]: cur } };
    });
  };

  const submit = () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email required");
    if (mode === "create") {
      const { user, password } = createStaff({
        full_name: name,
        email,
        reports_to: reportsTo,
        permissions: perms,
        template_id: templateId,
      });
      if (saveTemplateName.trim()) {
        createTemplate({
          name: saveTemplateName,
          is_default: false,
          permissions: perms,
        });
      }
      setCreatedPassword(password);
      toast.success(`Created ${user.full_name}`);
    } else if (existing) {
      updateStaff(existing.id, {
        full_name: name,
        email,
        reports_to: reportsTo,
        permissions: perms,
        permission_template_id: templateId,
      });
      toast.success("Staff updated");
      navigate({ to: "/app/staff" });
    }
  };

  if (createdPassword) {
    return (
      <AppShell variant="tenant" title="Staff invited" subtitle="Share credentials">
        <div className="max-w-md bg-white rounded-xl border border-border p-8">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Credentials shown once — copy them now.
          </p>
          <div className="mt-4 space-y-2">
            <div className="rounded-md bg-surface px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Email
              </p>
              <p className="font-mono text-sm">{email}</p>
            </div>
            <div className="rounded-md bg-surface px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Temporary password
                </p>
                <p className="font-mono text-sm">{createdPassword}</p>
              </div>
              <button
                className="text-muted-foreground hover:text-slate"
                onClick={() => {
                  navigator.clipboard.writeText(createdPassword);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button
            className="mt-6 bg-slate hover:bg-slate/90"
            onClick={() => navigate({ to: "/app/staff" })}
          >
            Back to staff
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      variant="tenant"
      title={mode === "create" ? "Invite staff" : `Edit ${existing?.full_name ?? ""}`}
      subtitle="Staff · 2 steps"
    >
      <div className="max-w-3xl bg-white rounded-xl border border-border p-8">
        <div className="mb-6 flex gap-3">
          {["Details", "Permissions"].map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-2 text-xs font-semibold ${
                i === step ? "text-slate" : "text-muted-foreground"
              }`}
            >
              <span
                className={`size-5 rounded-full grid place-items-center text-[10px] ${
                  i === step ? "bg-slate text-white" : "bg-secondary"
                }`}
              >
                {i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Reports to</Label>
              <Select
                value={reportsTo ?? "none"}
                onValueChange={(v) => setReportsTo(v === "none" ? null : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {users
                    .filter((u) => u.id !== userId)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => navigate({ to: "/app/staff" })}>
                Cancel
              </Button>
              <Button className="bg-slate hover:bg-slate/90" onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label>Start from template</Label>
              <Select
                value={templateId ?? "custom"}
                onValueChange={(v) => setTemplateId(v === "custom" ? null : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom (blank)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md bg-surface p-4">
              <div>
                <p className="font-semibold text-sm">Organization admin</p>
                <p className="text-xs text-muted-foreground">
                  Overrides the matrix — grants access to everything.
                </p>
              </div>
              <Switch
                checked={perms.is_org_admin}
                disabled={!isMeAdmin}
                onCheckedChange={(c) => setPerms({ ...perms, is_org_admin: c })}
              />
            </div>

            <div className="flex items-center justify-between rounded-md bg-surface p-4">
              <div>
                <p className="font-semibold text-sm">View team data</p>
                <p className="text-xs text-muted-foreground">
                  Can see records owned by direct reports.
                </p>
              </div>
              <Switch
                checked={perms.view_team_data}
                onCheckedChange={(c) => setPerms({ ...perms, view_team_data: c })}
              />
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Entity</th>
                    {actions.map((a) => (
                      <th key={a} className="px-4 py-2 text-center font-semibold">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entities.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 font-medium">{e.label}</td>
                      {actions.map((a) => (
                        <td key={a} className="px-4 py-2 text-center">
                          <Checkbox
                            checked={Boolean(perms.entities[e.id]?.[a])}
                            onCheckedChange={() => togglePerm(e.id, a)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <Label>Save as template (optional)</Label>
              <Input
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                className="mt-1"
                placeholder="e.g. Junior Sales"
              />
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button className="bg-gold hover:bg-gold/90 text-white" onClick={submit}>
                {mode === "create" ? "Create staff" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/app/staff/new")({
  head: () => ({ meta: [{ title: "Invite staff — PropVault" }] }),
  component: () => <StaffFormComponent mode="create" />,
});
export { StaffFormComponent };
