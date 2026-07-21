import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useApp } from "@/data/store";
import { orgScope } from "@/data/selectors";
import {
  Building2,
  LayoutDashboard,
  Map as MapIcon,
  Users,
  Wallet,
  UserCog,
  Settings,
  ShieldCheck,
  Plus,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "tenant" | "superadmin";
}

export function CommandPalette({ open, onOpenChange, variant }: Props) {
  const navigate = useNavigate();
  const orgId = useApp((s) => s.session?.org_id);
  const sites = useApp((s) => orgScope(s.sites, orgId));
  const plots = useApp((s) => orgScope(s.plots, orgId));
  const customers = useApp((s) => orgScope(s.customers, orgId));
  const orgs = useApp((s) => s.organizations);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search sites, plots, customers, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {variant === "tenant" && (
          <>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go("/app/dashboard")}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </CommandItem>
              <CommandItem onSelect={() => go("/app/sites")}>
                <MapIcon className="h-4 w-4" /> Sites
              </CommandItem>
              <CommandItem onSelect={() => go("/app/customers")}>
                <Users className="h-4 w-4" /> Customers
              </CommandItem>
              <CommandItem onSelect={() => go("/app/payments")}>
                <Wallet className="h-4 w-4" /> Payments
              </CommandItem>
              <CommandItem onSelect={() => go("/app/staff")}>
                <UserCog className="h-4 w-4" /> Staff
              </CommandItem>
              <CommandItem onSelect={() => go("/app/templates")}>
                <ShieldCheck className="h-4 w-4" /> Permission Templates
              </CommandItem>
              <CommandItem onSelect={() => go("/app/settings")}>
                <Settings className="h-4 w-4" /> Settings
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go("/app/sites/new")}>
                <Plus className="h-4 w-4" /> Add site
              </CommandItem>
              <CommandItem onSelect={() => go("/app/payments/new")}>
                <Plus className="h-4 w-4" /> Record payment
              </CommandItem>
              <CommandItem onSelect={() => go("/app/staff/new")}>
                <Plus className="h-4 w-4" /> Invite staff
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {sites.length > 0 && (
              <CommandGroup heading="Sites">
                {sites.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => go(`/app/sites/${s.id}`)}
                    value={`site ${s.name} ${s.address}`}
                  >
                    <MapIcon className="h-4 w-4" /> {s.name}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {s.address}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {plots.length > 0 && (
              <CommandGroup heading="Plots">
                {plots.slice(0, 20).map((p) => {
                  const site = sites.find((s) => s.id === p.site_id);
                  return (
                    <CommandItem
                      key={p.id}
                      onSelect={() => go(`/app/sites/${p.site_id}?plot=${p.id}`)}
                      value={`plot ${p.plot_number} ${site?.name ?? ""}`}
                    >
                      Plot {p.plot_number}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {site?.name}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {customers.length > 0 && (
              <CommandGroup heading="Customers">
                {customers.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => go(`/app/customers/${c.id}`)}
                    value={`customer ${c.full_name} ${c.phone} ${c.email}`}
                  >
                    <Users className="h-4 w-4" /> {c.full_name}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {c.phone}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {variant === "superadmin" && (
          <>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go("/superadmin/dashboard")}>
                <LayoutDashboard className="h-4 w-4" /> Overview
              </CommandItem>
              <CommandItem onSelect={() => go("/superadmin/organizations")}>
                <Building2 className="h-4 w-4" /> Organizations
              </CommandItem>
              <CommandItem onSelect={() => go("/superadmin/organizations/new")}>
                <Plus className="h-4 w-4" /> Create organization
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Organizations">
              {orgs.map((o) => (
                <CommandItem
                  key={o.id}
                  onSelect={() => go(`/superadmin/organizations/${o.id}`)}
                  value={`org ${o.name} ${o.city}`}
                >
                  <Building2 className="h-4 w-4" /> {o.name}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {o.city}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
