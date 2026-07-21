import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getState } from "@/data/store";

export const Route = createFileRoute("/superadmin")({
  beforeLoad: () => {
    const s = getState();
    if (!s.session) throw redirect({ to: "/login" });
    if (!s.session.is_superadmin) throw redirect({ to: "/app/dashboard" });
  },
  component: () => <Outlet />,
});
