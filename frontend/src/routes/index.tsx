import { createFileRoute, redirect } from "@tanstack/react-router";
import { getState } from "@/data/store";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const s = getState();
    if (!s.session) throw redirect({ to: "/login" });
    if (s.session.is_superadmin) throw redirect({ to: "/superadmin/dashboard" });
    const user = s.users.find((u) => u.id === s.session!.user_id);
    if (user?.require_password_reset) throw redirect({ to: "/change-password" });
    throw redirect({ to: "/app/dashboard" });
  },
  component: () => null,
});
