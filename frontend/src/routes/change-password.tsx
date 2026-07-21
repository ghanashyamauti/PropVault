import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/data/store";
import { getState } from "@/data/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/change-password")({
  beforeLoad: () => {
    const s = getState();
    if (!s.session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [{ title: "Set a new password — PropVault" }, { name: "robots", content: "noindex" }],
  }),
  component: ChangePassword,
});

function ChangePassword() {
  const navigate = useNavigate();
  const session = useApp((s) => s.session);
  const user = useApp((s) => s.users.find((u) => u.id === s.session?.user_id) ?? null);
  const change = useApp((s) => s.changePassword);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p1.length < 8) return toast.error("Password must be at least 8 characters");
    if (p1 !== p2) return toast.error("Passwords don't match");
    change(user!.id, p1);
    toast.success("Password updated");
    if (session?.is_superadmin) navigate({ to: "/superadmin/dashboard" });
    else navigate({ to: "/app/dashboard" });
  };

  return (
    <div className="min-h-screen bg-surface grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          First time here
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Set your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {user?.email}. Choose a personal password to continue.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="p1">New password</Label>
            <Input
              id="p1"
              type="password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="p2">Confirm password</Label>
            <Input
              id="p2"
              type="password"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-slate hover:bg-slate/90">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
