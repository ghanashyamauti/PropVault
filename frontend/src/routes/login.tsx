import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/data/store";
import { api, isApiEnabled } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — PropertyWala" },
      { name: "description", content: "Sign in to your PropertyWala workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const attempt = useApp((s) => s.attemptLogin);
  const [email, setEmail] = useState("admin@shreerealty.in");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // When VITE_API_URL is set, try the NestJS backend first.
    if (isApiEnabled) {
      try {
        const r = await api.login(email, password);
        toast.success(`Welcome back, ${r.user.full_name.split(" ")[0]}!`);

        // Synchronize backend user and session into Zustand store
        // and map any existing local state org IDs to match the backend org ID
        useApp.setState((prev) => {
          const backendOrgId = r.user.org_id;
          const localOrg = prev.organizations.find((o) => o.id !== backendOrgId);
          const localOrgId = localOrg?.id;

          const mapOrg = <T extends { org_id: string | null }>(items: T[]): T[] => {
            if (!localOrgId || !backendOrgId) return items;
            return items.map((item) => {
              if (item.org_id === localOrgId) {
                return { ...item, org_id: backendOrgId };
              }
              return item;
            });
          };

          const nextOrgs = prev.organizations.map((o) => {
            if (localOrgId && backendOrgId && o.id === localOrgId) {
              return { ...o, id: backendOrgId };
            }
            return o;
          });

          const exists = prev.users.some((u) => u.id === r.user.id);
          const nextUsers = exists
            ? prev.users.map((u) => (u.id === r.user.id ? { ...u, ...r.user } : u))
            : [...prev.users, r.user];

          return {
            organizations: nextOrgs,
            users: mapOrg(nextUsers),
            templates: mapOrg(prev.templates),
            sites: mapOrg(prev.sites),
            plots: mapOrg(prev.plots),
            customers: mapOrg(prev.customers),
            bookings: mapOrg(prev.bookings),
            transactions: mapOrg(prev.transactions),
            inquiries: mapOrg(prev.inquiries),
            audit: mapOrg(prev.audit),
            session: {
              user_id: r.user.id,
              org_id: backendOrgId,
              is_superadmin: r.user.is_superadmin,
              started_at: new Date().toISOString(),
            },
          };
        });

        if (r.user.is_superadmin) {
          navigate({ to: "/superadmin/dashboard" });
        } else if (r.user.require_password_reset) {
          navigate({ to: "/change-password" });
        } else {
          navigate({ to: "/app/dashboard" });
        }
        return;
      } catch (err) {
        // fall through to local demo auth
        console.warn("Backend login failed, falling back to local:", err);
      }
    }

    const result = attempt(email, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    toast.success(`Welcome back, ${result.user.full_name.split(" ")[0]}`);
    if (result.user.is_superadmin) {
      navigate({ to: "/superadmin/dashboard" });
    } else if (result.user.require_password_reset) {
      navigate({ to: "/change-password" });
    } else {
      navigate({ to: "/app/dashboard" });
    }
  };

  return (
    <div className="min-h-screen bg-surface grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-14 bg-slate text-white relative overflow-hidden">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="PropertyWala Logo"
            className="h-10 w-10 object-contain invert brightness-0"
          />
          <div>
            <p className="font-display italic text-3xl font-semibold">PropertyWala</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">
              Developer Edition
            </p>
          </div>
        </div>
        <div>
          <p className="font-display text-4xl leading-tight font-semibold text-balance max-w-md">
            Every plot. Every payment.<br />
            <span className="italic text-gold">Under one roof.</span>
          </p>
          <p className="mt-6 text-sm text-white/60 max-w-md leading-relaxed">
            Master-plan designer, plot sales pipeline, installment ledger, staff hierarchy,
            and cash flow — for developers who've outgrown spreadsheets.
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-white/30">
          © {new Date().getFullYear()} PropertyWala Platform
        </div>

        {/* Decorative parchment strip */}
        <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-b from-gold/30 to-transparent" />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Universal sign-in
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One login for platform admins, org admins, and staff.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {error && (
              <div className="text-xs rounded-md bg-destructive/10 text-destructive px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-slate hover:bg-slate/90">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-10 rounded-xl border border-border bg-white p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Demo credentials
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <span className="font-mono text-slate">super@propertywala.app</span> · Super@123
                <span className="text-muted-foreground"> — Platform admin</span>
              </li>
              <li>
                <span className="font-mono text-slate">admin@shreerealty.in</span> · Admin@123
                <span className="text-muted-foreground"> — Org admin</span>
              </li>
              <li>
                <span className="font-mono text-slate">vikram@shreerealty.in</span> · Staff@123
                <span className="text-muted-foreground"> — Team manager</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
