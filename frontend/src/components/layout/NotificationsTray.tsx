import { useApp, today } from "@/data/store";
import { orgScope, upcomingInstallments, moneyCompact, fmtShortDate } from "@/data/selectors";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";

export function NotificationsTray() {
  const orgId = useApp((s) => s.session?.org_id);
  const state = useApp();
  if (!orgId) return null;

  const now = today(state);
  const overdue = upcomingInstallments(state, orgId, now, 20).filter(
    (u) => new Date(u.stage.due_date) < now,
  );
  const inquiries = orgScope(state.inquiries, orgId).slice(0, 5);
  const total = overdue.length + inquiries.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative rounded-full border border-border bg-white p-2 hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4 text-slate" strokeWidth={1.75} />
          {total > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold text-[10px] text-white font-semibold grid place-items-center">
              {total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-4 border-b border-border">
          <p className="font-display text-lg font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">
            Overdue installments & fresh inquiries.
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {overdue.length === 0 && inquiries.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nothing pending. You're all caught up.
            </div>
          )}
          {overdue.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-2">
                Overdue ({overdue.length})
              </p>
              {overdue.slice(0, 5).map((u) => (
                <Link
                  key={u.stage.id}
                  to="/app/customers/$id"
                  params={{ id: u.customer?.id ?? "" }}
                  className="block px-2 py-2 rounded-md hover:bg-secondary"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{u.customer?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {u.stage.stage_name} · Due {fmtShortDate(u.stage.due_date)}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-destructive tabular">
                      {moneyCompact(u.stage.amount_due)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {inquiries.length > 0 && (
            <div className="p-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-2">
                Inquiries ({inquiries.length})
              </p>
              {inquiries.map((iq) => {
                const plot = state.plots.find((p) => p.id === iq.plot_id);
                return (
                  <Link
                    key={iq.id}
                    to="/app/sites/$id"
                    params={{ id: plot?.site_id ?? "" }}
                    className="block px-2 py-2 rounded-md hover:bg-secondary"
                  >
                    <p className="text-xs font-semibold">{iq.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Plot {plot?.plot_number} · {iq.notes}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
