import { Link, useRouterState } from "@tanstack/react-router";
import { useApp } from "@/data/store";
import { currentUser, can } from "@/data/selectors";
import type { PermissionEntity } from "@/data/types";
import {
  LayoutDashboard,
  Map as MapIcon,
  Users,
  Wallet,
  UserCog,
  Settings,
  ShieldCheck,
  LogOut,
  Building2,
  Command,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { CommandPalette } from "./CommandPalette";
import { NotificationsTray } from "./NotificationsTray";
import { DemoControls } from "./DemoControls";
import { useEffect, useState } from "react";

const tenantNav: Array<{
  to: string;
  label: string;
  icon: any;
  entity?: PermissionEntity;
}> = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/sites", label: "Sites", icon: MapIcon, entity: "sites" },
  { to: "/app/customers", label: "Customers", icon: Users, entity: "customers" },
  { to: "/app/payments", label: "Payments", icon: Wallet, entity: "payments" },
  { to: "/app/inquiries", label: "Inquiries", icon: MessageSquare, entity: "customers" },
  { to: "/app/staff", label: "Staff", icon: UserCog, entity: "staff" },
  { to: "/app/templates", label: "Templates", icon: ShieldCheck, entity: "templates" },
  { to: "/app/settings", label: "Settings", icon: Settings, entity: "settings" },
];

const superAdminNav = [
  { to: "/superadmin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/superadmin/organizations", label: "Organizations", icon: Building2 },
] as const;

interface AppShellProps {
  variant: "tenant" | "superadmin";
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ variant, title, subtitle, actions, children }: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useApp(currentUser);
  const rawNav = variant === "tenant" ? tenantNav : superAdminNav;
  const nav = rawNav.filter((item) => {
    if (variant === "superadmin") return true;
    if (user?.permissions?.is_org_admin) return true;
    return can(user?.permissions, item.entity, "view");
  });
  const org = useApp((s) =>
    variant === "tenant" && s.session?.org_id
      ? s.organizations.find((o) => o.id === s.session!.org_id)
      : null,
  );
  const logout = useApp((s) => s.logout);
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-surface text-slate">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="w-60 shrink-0 border-r border-border bg-white hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 pb-8">
          <Link to={variant === "tenant" ? "/app/dashboard" : "/superadmin/dashboard"} className="block group">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="PropVault Logo"
                className="h-7 w-7 object-contain group-hover:rotate-12 transition-transform duration-300"
              />
              <div className="font-display italic text-2xl font-semibold tracking-tight text-slate">
                PropVault
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1.5 pl-9">
              {variant === "tenant" ? "Developer Edition" : "Platform Console"}
            </p>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/app/dashboard" &&
                item.to !== "/superadmin/dashboard" &&
                pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-slate/5 text-slate"
                    : "text-slate/50 hover:text-slate hover:bg-slate/[0.03]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-3 mb-3 flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Command className="h-3 w-3" />
          <span>Quick nav</span>
          <span className="ml-auto text-[10px] font-mono">⌘K</span>
        </button>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="size-9 shrink-0 rounded-full bg-slate/10 grid place-items-center font-display font-semibold text-slate text-sm">
              {user?.full_name.slice(0, 1) ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user?.full_name ?? "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {org?.name ?? (user?.is_superadmin ? "PropVault Platform" : "")}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-slate p-1"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col border-r border-border transition-transform duration-300 transform md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link to={variant === "tenant" ? "/app/dashboard" : "/superadmin/dashboard"} className="flex items-center gap-2">
            <img src="/logo.png" alt="PropVault Logo" className="h-7 w-7" />
            <span className="font-display italic text-xl font-semibold text-slate">PropVault</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 text-slate/50 hover:text-slate rounded-md"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/app/dashboard" &&
                item.to !== "/superadmin/dashboard" &&
                pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-slate/5 text-slate"
                    : "text-slate/50 hover:text-slate hover:bg-slate/[0.03]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => {
            setMobileMenuOpen(false);
            setPaletteOpen(true);
          }}
          className="mx-3 mb-3 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Command className="h-3 w-3" />
          <span>Quick nav</span>
          <span className="ml-auto text-[10px] font-mono">⌘K</span>
        </button>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="size-9 shrink-0 rounded-full bg-slate/10 grid place-items-center font-display font-semibold text-slate text-sm">
              {user?.full_name.slice(0, 1) ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user?.full_name ?? "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {org?.name ?? (user?.is_superadmin ? "PropVault Platform" : "")}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-slate p-1"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-20 border-b border-border bg-white/60 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 md:hidden text-slate/50 hover:text-slate rounded-md -ml-2"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              {subtitle && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
              <h1 className="font-display text-lg md:text-2xl font-semibold truncate">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {actions}
            {variant === "tenant" && <NotificationsTray />}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} variant={variant} />
      {variant === "tenant" && <DemoControls />}
    </div>
  );
}
