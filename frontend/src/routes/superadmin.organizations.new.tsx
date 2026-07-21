import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/superadmin/organizations/new")({
  head: () => ({ meta: [{ title: "New organization — Platform" }] }),
  component: NewOrg,
});

function NewOrg() {
  const navigate = useNavigate();
  const create = useApp((s) => s.createOrganization);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    admin_name: "",
    admin_email: "",
  });
  const [result, setResult] = useState<{
    email: string;
    password: string;
    orgId: string;
  } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.admin_email.trim())
      return toast.error("Organization name and admin email required");
    const r = create(form);
    setResult({ email: r.admin.email, password: r.password, orgId: r.org.id });
    toast.success("Organization created");
  };

  if (result) {
    return (
      <AppShell variant="superadmin" title="Organization created" subtitle="Credentials shown once">
        <div className="max-w-md bg-white rounded-xl border border-border p-8">
          <div className="mx-auto size-10 rounded-full bg-emerald/10 grid place-items-center text-emerald mb-4">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            The admin must change this password on first sign-in.
          </p>
          <div className="mt-4 space-y-2">
            <div className="rounded-md bg-surface px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Login email
              </p>
              <p className="font-mono text-sm">{result.email}</p>
            </div>
            <div className="rounded-md bg-surface px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Temporary password
                </p>
                <p className="font-mono text-sm">{result.password}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.password);
                  toast.success("Copied");
                }}
                className="text-muted-foreground hover:text-slate"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              className="bg-slate hover:bg-slate/90"
              onClick={() =>
                navigate({
                  to: "/superadmin/organizations/$id",
                  params: { id: result.orgId },
                })
              }
            >
              Open organization
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/superadmin/organizations" })}>
              Back to directory
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="superadmin" title="New organization" subtitle="Onboarding">
      <div className="max-w-2xl bg-white rounded-xl border border-border p-8">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label>Organization name</Label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                className="mt-1"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                className="mt-1"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                className="mt-1"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-display text-lg font-semibold mb-3">First org admin</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Admin full name</Label>
                <Input
                  className="mt-1"
                  value={form.admin_name}
                  onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Admin email</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  required
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              A temporary password will be generated and shown once.
            </p>
          </div>

          <div className="pt-4 border-t border-border flex gap-3">
            <Button type="submit" className="bg-slate hover:bg-slate/90">
              Create organization
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/superadmin/organizations" })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
