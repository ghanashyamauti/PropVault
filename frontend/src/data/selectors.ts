import Decimal from "decimal.js";
import type {
  AppState,
} from "./store";
import type {
  Booking,
  Customer,
  InstallmentStage,
  PermissionAction,
  PermissionEntity,
  PermissionMatrix,
  Plot,
  Site,
  Transaction,
  User,
  UUID,
} from "./types";

// -----------------------------------------------------------------------------
// Money & formatting
// -----------------------------------------------------------------------------

const inrFmt = new Intl.NumberFormat("en-IN");

export function money(amount: string | number): string {
  const d = new Decimal(amount || 0);
  return `₹${inrFmt.format(Number(d.toFixed(0)))}`;
}

/** Compact rupee for large numbers. 4500000 -> ₹45L, 12500000 -> ₹1.25Cr. */
export function moneyCompact(amount: string | number): string {
  const n = Number(new Decimal(amount || 0).toFixed(0));
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return money(amount);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function relativeDate(iso: string, now = new Date()): string {
  const days = Math.round((new Date(iso).getTime() - now.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// -----------------------------------------------------------------------------
// Area conversion
// -----------------------------------------------------------------------------

export function areaLabel(unit: "SQFT" | "SQM"): string {
  return unit === "SQFT" ? "sq ft" : "sq m";
}

export function toSqft(area: number, unit: "SQFT" | "SQM"): number {
  return unit === "SQFT" ? area : Math.round(area * 10.7639);
}

// -----------------------------------------------------------------------------
// Customer derived status
// -----------------------------------------------------------------------------

export type CustomerStatus =
  | "TOKEN_ONLY"
  | "ON_TRACK"
  | "OVERDUE"
  | "FULLY_PAID";

export function customerStatus(
  schedule: InstallmentStage[],
  now: Date,
): CustomerStatus {
  if (schedule.length === 0) return "TOKEN_ONLY";
  const allPaid = schedule.every((s) => s.status === "PAID");
  if (allPaid) return "FULLY_PAID";
  const anyOverdue = schedule.some(
    (s) =>
      s.status !== "PAID" && new Date(s.due_date).getTime() < now.getTime(),
  );
  if (anyOverdue) return "OVERDUE";
  const paidCount = schedule.filter((s) => s.status === "PAID").length;
  if (paidCount <= 1) return "TOKEN_ONLY";
  return "ON_TRACK";
}

// Live schedule status considering today
export function effectiveStageStatus(
  stage: InstallmentStage,
  now: Date,
): InstallmentStage["status"] {
  if (stage.status === "PAID") return "PAID";
  if (stage.status === "PARTIAL") return "PARTIAL";
  return new Date(stage.due_date).getTime() < now.getTime() ? "OVERDUE" : "PENDING";
}

// -----------------------------------------------------------------------------
// Permissions
// -----------------------------------------------------------------------------

export function can(
  perms: PermissionMatrix | undefined,
  entity: PermissionEntity,
  action: PermissionAction,
): boolean {
  if (!perms) return false;
  if (perms.is_org_admin) return true;
  return Boolean(perms.entities?.[entity]?.[action]);
}

// -----------------------------------------------------------------------------
// Selectors for the current org
// -----------------------------------------------------------------------------

export function orgScope<T extends { org_id: string | null }>(
  rows: T[],
  orgId: string | null | undefined,
): T[] {
  if (!orgId) return [];
  return rows.filter((r) => r.org_id === orgId);
}

export function scopedForUser<T extends { org_id: string | null }>(
  rows: T[],
  state: AppState,
): T[] {
  return orgScope(rows, state.session?.org_id ?? null);
}

// -----------------------------------------------------------------------------
// KPIs
// -----------------------------------------------------------------------------

export interface OrgKPIs {
  collected: string;
  pending: string;
  payable: string;
  net: string;
  monthlyIn: number[];
  monthlyOut: number[];
  labels: string[];
}

export function computeOrgKPIs(state: AppState, orgId: string): OrgKPIs {
  const txs = state.transactions.filter((t) => t.org_id === orgId);
  const collected = txs
    .filter((t) => t.direction === "IN")
    .reduce((d, t) => d.plus(t.amount), new Decimal(0));
  const paidOut = txs
    .filter((t) => t.direction === "OUT")
    .reduce((d, t) => d.plus(t.amount), new Decimal(0));

  const bookingIds = new Set(
    state.bookings.filter((b) => b.org_id === orgId).map((b) => b.id),
  );
  const pending = state.schedule
    .filter((s) => bookingIds.has(s.booking_id))
    .reduce((d, s) => {
      const remaining = new Decimal(s.amount_due).minus(s.paid_amount);
      return remaining.gt(0) ? d.plus(remaining) : d;
    }, new Decimal(0));

  // Monthly aggregation for the last 6 months
  const now = new Date(Date.now() + state.clockOffsetDays * 86400000);
  const labels: string[] = [];
  const monthlyIn: number[] = [];
  const monthlyOut: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    labels.push(d.toLocaleString("en-IN", { month: "short" }));
    let inSum = 0;
    let outSum = 0;
    for (const t of txs) {
      const td = new Date(t.transaction_date);
      if (td >= d && td < nextMonth) {
        if (t.direction === "IN") inSum += Number(t.amount);
        else outSum += Number(t.amount);
      }
    }
    monthlyIn.push(inSum);
    monthlyOut.push(outSum);
  }

  return {
    collected: collected.toFixed(0),
    pending: pending.toFixed(0),
    payable: paidOut.toFixed(0),
    net: collected.minus(paidOut).toFixed(0),
    monthlyIn,
    monthlyOut,
    labels,
  };
}

// -----------------------------------------------------------------------------
// Site progress
// -----------------------------------------------------------------------------

export function siteProgress(
  site: Site,
  plots: Plot[],
): { total: number; sold: number; booked: number; available: number; pct: number } {
  const sitePlots = plots.filter((p) => p.site_id === site.id);
  const total = sitePlots.length;
  const sold = sitePlots.filter((p) => p.status === "SOLD").length;
  const booked = sitePlots.filter((p) => p.status === "BOOKED").length;
  const available = sitePlots.filter((p) => p.status === "AVAILABLE").length;
  const pct = total === 0 ? 0 : Math.round(((sold + booked) / total) * 100);
  return { total, sold, booked, available, pct };
}

// -----------------------------------------------------------------------------
// "Collected" on a plot
// -----------------------------------------------------------------------------

export function plotCollected(plotId: UUID, state: AppState): string {
  const txs = state.transactions.filter(
    (t) => t.plot_id === plotId && t.direction === "IN",
  );
  const sum = txs.reduce((d, t) => d.plus(t.amount), new Decimal(0));
  return sum.toFixed(0);
}

export function upcomingInstallments(
  state: AppState,
  orgId: string,
  now: Date,
  limit = 8,
): Array<{
  stage: InstallmentStage;
  booking: Booking;
  customer: Customer | undefined;
  plot: Plot | undefined;
}> {
  const bookings = state.bookings.filter((b) => b.org_id === orgId && !b.cancelled_at);
  const bMap = new Map(bookings.map((b) => [b.id, b]));
  const pending = state.schedule
    .filter((s) => bMap.has(s.booking_id) && s.status !== "PAID")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, limit);
  return pending.map((stage) => {
    const booking = bMap.get(stage.booking_id)!;
    return {
      stage,
      booking,
      customer: state.customers.find((c) => c.id === booking.customer_id),
      plot: state.plots.find((p) => p.id === booking.plot_id),
    };
  });
}

export function currentUser(state: AppState): User | null {
  if (!state.session) return null;
  return state.users.find((u) => u.id === state.session!.user_id) ?? null;
}
