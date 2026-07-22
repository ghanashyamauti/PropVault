import Decimal from "decimal.js";
import { createWithEqualityFn } from "zustand/traditional";
import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { buildSeed, type SeedState } from "./seed";
import { api, isApiEnabled } from "@/lib/api-client";
import type {
  AuditEntry,
  Customer,
  InstallmentStage,
  Organization,
  PermissionMatrix,
  PermissionTemplate,
  Plot,
  Session,
  Site,
  SmtpConfig,
  Transaction,
  User,
  UUID,
} from "./types";

// -----------------------------------------------------------------------------
// Utility
// -----------------------------------------------------------------------------

const rid = (tag = "id") =>
  `${tag}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;

export const nowISO = () => new Date().toISOString();

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  label: string;
  at: string;
  snapshot: Partial<SeedState>;
}

export interface AppState extends SeedState {
  session: Session | null;
  clockOffsetDays: number; // demo: jump forward in time
  loginAttempts: Record<string, { count: number; lockedUntil: number | null }>;
  history: HistoryEntry[];

  // actions -----------------------------------------------------------------
  attemptLogin: (
    email: string,
    password: string,
  ) => { ok: true; user: User } | { ok: false; error: string };
  logout: () => void;
  changePassword: (userId: UUID, newPassword: string) => void;
  undoLast: () => { ok: true; label: string } | { ok: false };

  createOrganization: (input: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    admin_name: string;
    admin_email: string;
  }) => { org: Organization; admin: User; password: string };
  suspendOrg: (id: UUID) => void;
  reactivateOrg: (id: UUID) => void;
  deleteOrg: (id: UUID) => void;
  resetUserPassword: (userId: UUID) => string;

  createSite: (input: Omit<Site, "id" | "org_id" | "layout" | "created_at"> & { layout?: Site["layout"] }) => Site;
  updateSite: (id: UUID, patch: Partial<Site>) => void;
  deleteSite: (id: UUID) => void;
  saveSiteLayout: (id: UUID, layout: Site["layout"]) => void;

  createPlot: (input: Omit<Plot, "id" | "org_id" | "status"> & { status?: Plot["status"] }) => Plot;
  updatePlot: (id: UUID, patch: Partial<Plot>) => void;
  deletePlot: (id: UUID) => void;
  setPlotStatus: (id: UUID, status: Plot["status"]) => void;
  syncPlanPlotsToCRM: (siteId: UUID) => number;

  createCustomer: (input: Omit<Customer, "id" | "org_id" | "created_at">) => Customer;

  bookPlot: (input: {
    plot_id: UUID;
    customer_id: UUID;
    total_sale_price: string;
    stages: Array<{ name: string; amount: string; due_date: string }>;
  }) => void;

  recordPayment: (input: {
    direction: "IN" | "OUT";
    type: Transaction["type"];
    party_name: string;
    amount: string;
    payment_mode: Transaction["payment_mode"];
    transaction_date: string;
    booking_id?: UUID;
    stage_id?: UUID;
    plot_id?: UUID;
    customer_id?: UUID;
    notes?: string;
    idempotency_key: string;
    receipt_url?: string | null;
  }) => { ok: true } | { ok: false; reason: string };
  reverseTransaction: (id: UUID, note: string) => void;

  createStaff: (input: {
    full_name: string;
    email: string;
    reports_to: UUID | null;
    permissions: PermissionMatrix;
    template_id?: UUID | null;
  }) => { user: User; password: string };
  updateStaff: (id: UUID, patch: Partial<User>) => void;
  deleteStaff: (id: UUID) => void;

  createTemplate: (input: Omit<PermissionTemplate, "id" | "org_id" | "usage_count">) => PermissionTemplate;
  updateTemplate: (id: UUID, patch: Partial<PermissionTemplate>) => void;
  deleteTemplate: (id: UUID) => void;
  setDefaultTemplate: (id: UUID) => void;

  sendReminder: (stageId: UUID) => void;
  updateSmtp: (patch: Partial<SmtpConfig>) => void;
  updateOrg: (id: UUID, patch: Partial<Organization>) => void;
  createInquiry: (input: {
    plot_id: UUID;
    customer_name: string;
    phone: string;
    notes: string;
  }) => Inquiry;

  // demo controls
  advanceClock: (days: number) => void;
  reseed: () => void;
  loadEmptyOrg: () => void;
}

function pushAudit(state: AppState, entry: Omit<AuditEntry, "id" | "timestamp">) {
  state.audit = [
    { ...entry, id: rid("aud"), timestamp: nowISO() },
    ...state.audit,
  ].slice(0, 5000);
}

function generatePassword(): string {
  const words = ["Plot", "Vault", "Land", "Sky", "Site", "River", "Peak"];
  return `${words[Math.floor(Math.random() * words.length)]}@${Math.floor(1000 + Math.random() * 9000)}`;
}

const TRACKED_KEYS = [
  "plots",
  "bookings",
  "schedule",
  "transactions",
  "customers",
  "sites",
] as const;
type TrackedKey = (typeof TRACKED_KEYS)[number];

function snapshotOf(state: AppState, keys: readonly TrackedKey[]): Partial<SeedState> {
  const out: Partial<SeedState> = {};
  for (const k of keys) (out as Record<string, unknown>)[k] = state[k];
  return out;
}

/** Snapshot pre-mutation state and prepend a history entry. Use inside `set`. */
function withHistory(
  prev: AppState,
  patch: Partial<AppState>,
  label: string,
  keys: readonly TrackedKey[] = TRACKED_KEYS,
): AppState {
  const entry: HistoryEntry = {
    id: rid("hst"),
    label,
    at: nowISO(),
    snapshot: snapshotOf(prev, keys),
  };
  return {
    ...prev,
    ...patch,
    history: [entry, ...prev.history].slice(0, 25),
  } as AppState;
}




export const useApp = createWithEqualityFn<AppState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      session: null,
      clockOffsetDays: 0,
      loginAttempts: {},
      history: [],

      undoLast() {
        const s = get();
        const [last, ...rest] = s.history;
        if (!last) return { ok: false as const };
        set({ ...(last.snapshot as Partial<AppState>), history: rest } as Partial<AppState>);
        return { ok: true as const, label: last.label };
      },


      attemptLogin(email, password) {
        const s = get();
        const now = Date.now();
        const key = email.toLowerCase().trim();
        const attempt = s.loginAttempts[key];
        if (attempt?.lockedUntil && attempt.lockedUntil > now) {
          const mins = Math.ceil((attempt.lockedUntil - now) / 60000);
          return { ok: false, error: `Too many attempts. Try again in ${mins} min.` };
        }
        const user = s.users.find((u) => u.email.toLowerCase() === key);
        if (!user || user.password !== password) {
          const nextCount = (attempt?.count ?? 0) + 1;
          const locked = nextCount >= 5 ? now + 15 * 60 * 1000 : null;
          set({
            loginAttempts: {
              ...s.loginAttempts,
              [key]: { count: nextCount, lockedUntil: locked },
            },
          });
          return { ok: false, error: "Invalid email or password." };
        }
        if (user.org_id) {
          const org = s.organizations.find((o) => o.id === user.org_id);
          if (!org) return { ok: false, error: "Organization not found." };
          if (org.status === "SUSPENDED")
            return { ok: false, error: "Your organization has been suspended." };
        }
        set((prev) => {
          const nextUsers = prev.users.map((u) =>
            u.id === user.id ? { ...u, last_login_at: nowISO() } : u,
          );
          const nextAttempts = { ...prev.loginAttempts };
          delete nextAttempts[key];
          const next: AppState = {
            ...prev,
            users: nextUsers,
            loginAttempts: nextAttempts,
            session: {
              user_id: user.id,
              org_id: user.org_id,
              is_superadmin: user.is_superadmin,
              started_at: nowISO(),
            },
          };
          pushAudit(next, {
            org_id: user.org_id,
            actor_id: user.id,
            actor_name: user.full_name,
            action: "USER_LOGIN",
            entity_type: "user",
            entity_id: user.id,
            detail: "Signed in from web",
          });
          return next;
        });
        return { ok: true, user };
      },

      logout() {
        set({ session: null });
      },

      changePassword(userId, newPassword) {
        set((prev) => ({
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, password: newPassword, require_password_reset: false } : u,
          ),
        }));
      },

      createOrganization(input) {
        const orgId = rid("org");
        const adminId = rid("usr");
        const password = generatePassword();
        const org: Organization = {
          id: orgId,
          name: input.name,
          phone: input.phone,
          address: input.address,
          city: input.city,
          state: input.state,
          status: "ACTIVE",
          created_at: nowISO(),
        };
        const admin: User = {
          id: adminId,
          org_id: orgId,
          full_name: input.admin_name,
          email: input.admin_email,
          password,
          reports_to: null,
          is_superadmin: false,
          require_password_reset: true,
          permissions: {
            is_org_admin: true,
            view_team_data: true,
            entities: {},
          },
          permission_template_id: null,
          last_login_at: null,
        };
        set((prev) => {
          const next = {
            ...prev,
            organizations: [...prev.organizations, org],
            users: [...prev.users, admin],
          };
          pushAudit(next, {
            org_id: null,
            actor_id: prev.session?.user_id ?? null,
            actor_name: "Platform Super Admin",
            action: "ORG_CREATED",
            entity_type: "organization",
            entity_id: orgId,
            detail: `Created organization ${org.name}`,
          });
          return next;
        });
        return { org, admin, password };
      },

      suspendOrg(id) {
        set((prev) => ({
          organizations: prev.organizations.map((o) =>
            o.id === id ? { ...o, status: "SUSPENDED" } : o,
          ),
        }));
      },
      reactivateOrg(id) {
        set((prev) => ({
          organizations: prev.organizations.map((o) =>
            o.id === id ? { ...o, status: "ACTIVE" } : o,
          ),
        }));
      },
      deleteOrg(id) {
        set((prev) => ({
          organizations: prev.organizations.filter((o) => o.id !== id),
        }));
      },
      resetUserPassword(userId) {
        const password = generatePassword();
        set((prev) => ({
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, password, require_password_reset: true } : u,
          ),
        }));
        return password;
      },
      updateOrg(id, patch) {
        set((prev) => ({
          organizations: prev.organizations.map((o) =>
            o.id === id ? { ...o, ...patch } : o,
          ),
        }));
      },

      createSite(input) {
        const s = get();
        if (!s.session?.org_id) throw new Error("No org context");
        const site: Site = {
          id: rid("site"),
          org_id: s.session.org_id,
          name: input.name,
          address: input.address,
          area_unit: input.area_unit,
          photo_url: input.photo_url ?? null,
          layout: input.layout ?? { version: 1, bounds: { w: 220, h: 220 }, elements: [] },
          created_at: nowISO(),
        };
        set((prev) => {
          const next = { ...prev, sites: [...prev.sites, site] };
          pushAudit(next, {
            org_id: s.session!.org_id,
            actor_id: s.session!.user_id,
            actor_name: prev.users.find((u) => u.id === s.session!.user_id)?.full_name ?? "",
            action: "SITE_CREATED",
            entity_type: "site",
            entity_id: site.id,
            detail: `Created site ${site.name}`,
          });
          return next;
        });
        return site;
      },
      updateSite(id, patch) {
        set((prev) => ({
          sites: prev.sites.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
      },
      deleteSite(id) {
        set((prev) => ({
          sites: prev.sites.filter((s) => s.id !== id),
          plots: prev.plots.filter((p) => p.site_id !== id),
        }));
      },
      saveSiteLayout(id, layout) {
        set((prev) => ({
          sites: prev.sites.map((s) => (s.id === id ? { ...s, layout } : s)),
        }));
        if (isApiEnabled) {
          api.patch(`/sites/${id}`, { layout }).catch((err) => {
            console.warn("Failed to persist site layout to backend API:", err);
          });
        }
      },

      createPlot(input) {
        const s = get();
        if (!s.session?.org_id) throw new Error("No org context");
        const plot: Plot = {
          id: rid("plt"),
          org_id: s.session.org_id,
          status: input.status ?? "AVAILABLE",
          ...input,
        };
        set((prev) =>
          withHistory(prev, { plots: [...prev.plots, plot] }, `Create plot ${plot.plot_number}`, ["plots"]),
        );
        return plot;
      },
      updatePlot(id, patch) {
        set((prev) =>
          withHistory(
            prev,
            { plots: prev.plots.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
            `Edit plot`,
            ["plots"],
          ),
        );
      },
      deletePlot(id) {
        set((prev) =>
          withHistory(prev, { plots: prev.plots.filter((p) => p.id !== id) }, `Delete plot`, ["plots"]),
        );
      },
      setPlotStatus(id, status) {
        set((prev) => {
          const next = {
            ...prev,
            plots: prev.plots.map((p) => (p.id === id ? { ...p, status } : p)),
          };
          const plot = prev.plots.find((p) => p.id === id);
          pushAudit(next, {
            org_id: prev.session?.org_id ?? null,
            actor_id: prev.session?.user_id ?? null,
            actor_name:
              prev.users.find((u) => u.id === prev.session?.user_id)?.full_name ?? "System",
            action: "PLOT_STATUS_CHANGED",
            entity_type: "plot",
            entity_id: id,
            detail: `Marked plot ${plot?.plot_number ?? id} as ${status}`,
          });
          return next;
        });
      },

      syncPlanPlotsToCRM(siteId) {
        const s = get();
        const site = s.sites.find((x) => x.id === siteId);
        if (!site || !s.session?.org_id) return 0;
        let created = 0;
        const newPlots: Plot[] = [];
        const nextElements = site.layout.elements.map((el) => {
          if (el.type !== "plot" || el.plot_id) return el;
          // convert bounding box meters → site unit
          const lengthFt = Math.round(el.w * 3.28084);
          const widthFt = Math.round(el.h * 3.28084);
          const area = lengthFt * widthFt;
          const price = new Decimal(area).mul(4500).toFixed(0);
          const plot: Plot = {
            id: rid("plt"),
            org_id: s.session!.org_id!,
            site_id: siteId,
            plot_number: el.plot_number,
            length: site.area_unit === "SQFT" ? lengthFt : Math.round(el.w),
            width: site.area_unit === "SQFT" ? widthFt : Math.round(el.h),
            area:
              site.area_unit === "SQFT"
                ? area
                : Math.round(el.w * el.h),
            price,
            facing: "E",
            plot_type: "RESIDENTIAL",
            status: "AVAILABLE",
          };
          newPlots.push(plot);
          created += 1;
          return { ...el, plot_id: plot.id };
        });
        set((prev) => ({
          sites: prev.sites.map((x) =>
            x.id === siteId ? { ...x, layout: { ...x.layout, elements: nextElements } } : x,
          ),
          plots: [...prev.plots, ...newPlots],
        }));
        return created;
      },

      createCustomer(input) {
        const s = get();
        if (!s.session?.org_id) throw new Error("No org context");
        const c: Customer = {
          id: rid("cst"),
          org_id: s.session.org_id,
          created_at: nowISO(),
          ...input,
        };
        set((prev) => ({ customers: [...prev.customers, c] }));
        return c;
      },

      bookPlot(input) {
        const s = get();
        if (!s.session?.org_id) throw new Error("No org context");
        const bookingId = rid("bkg");
        const now = nowISO();
        const stages: InstallmentStage[] = input.stages.map((st, idx) => ({
          id: rid("stg"),
          booking_id: bookingId,
          stage_name: st.name,
          amount_due: new Decimal(st.amount).toFixed(0),
          due_date: st.due_date,
          paid_amount: "0",
          paid_date: null,
          status: "PENDING",
          sort_order: idx,
        }));
        set((prev) => {
          const next = withHistory(
            prev,
            {
              bookings: [
                ...prev.bookings,
                {
                  id: bookingId,
                  org_id: s.session!.org_id!,
                  plot_id: input.plot_id,
                  customer_id: input.customer_id,
                  total_sale_price: new Decimal(input.total_sale_price).toFixed(0),
                  booking_date: now,
                  cancelled_at: null,
                },
              ],
              schedule: [...prev.schedule, ...stages],
              plots: prev.plots.map((p) =>
                p.id === input.plot_id ? { ...p, status: "BOOKED" as const } : p,
              ),
            },
            `Book plot`,
            ["bookings", "schedule", "plots"],
          );
          pushAudit(next, {
            org_id: s.session!.org_id,
            actor_id: s.session!.user_id,
            actor_name:
              prev.users.find((u) => u.id === s.session!.user_id)?.full_name ?? "",
            action: "BOOKING_CREATED",
            entity_type: "booking",
            entity_id: bookingId,
            detail: `Booked plot with ${stages.length}-stage schedule`,
          });
          return next;
        });
      },

      recordPayment(input) {
        const s = get();
        if (!s.session?.org_id) return { ok: false, reason: "No org context" };
        const dup = s.transactions.find(
          (t) => t.idempotency_key === input.idempotency_key && t.org_id === s.session!.org_id,
        );
        if (dup) return { ok: false, reason: "Duplicate submission" };
        const tx: Transaction = {
          id: rid("txn"),
          org_id: s.session.org_id,
          receipt_url: input.receipt_url ?? null,
          ...input,
        };
        set((prev) => {
          let nextSchedule = prev.schedule;
          if (input.stage_id) {
            nextSchedule = prev.schedule.map((st) => {
              if (st.id !== input.stage_id) return st;
              const newPaid = new Decimal(st.paid_amount).plus(input.amount).toFixed(0);
              const remaining = new Decimal(st.amount_due).minus(newPaid);
              const status: InstallmentStage["status"] = remaining.lte(0)
                ? "PAID"
                : new Decimal(newPaid).gt(0)
                  ? "PARTIAL"
                  : st.status;
              return {
                ...st,
                paid_amount: newPaid,
                paid_date: remaining.lte(0) ? input.transaction_date : st.paid_date,
                status,
              };
            });
          }
          const next = withHistory(
            prev,
            {
              transactions: [tx, ...prev.transactions],
              schedule: nextSchedule,
            },
            `Record ${input.direction} ₹${input.amount}`,
            ["transactions", "schedule"],
          );
          pushAudit(next, {
            org_id: s.session!.org_id,
            actor_id: s.session!.user_id,
            actor_name:
              prev.users.find((u) => u.id === s.session!.user_id)?.full_name ?? "",
            action: "PAYMENT_RECORDED",
            entity_type: "transaction",
            entity_id: tx.id,
            detail: `${input.direction} ₹${input.amount} — ${input.party_name}`,
          });
          return next;
        });
        return { ok: true };
      },

      reverseTransaction(id, note) {
        const s = get();
        const original = s.transactions.find((t) => t.id === id);
        if (!original) return;
        const reversal: Transaction = {
          ...original,
          id: rid("txn"),
          direction: original.direction === "IN" ? "OUT" : "IN",
          idempotency_key: `rev-${original.id}-${Date.now()}`,
          reversal_of: original.id,
          notes: `Reversal: ${note}`,
          transaction_date: nowISO(),
        };
        set((prev) =>
          withHistory(prev, { transactions: [reversal, ...prev.transactions] }, `Reverse transaction`, ["transactions"]),
        );
      },

      createStaff(input) {
        const s = get();
        if (!s.session?.org_id) throw new Error("No org context");
        const password = generatePassword();
        const user: User = {
          id: rid("usr"),
          org_id: s.session.org_id,
          full_name: input.full_name,
          email: input.email,
          password,
          reports_to: input.reports_to,
          is_superadmin: false,
          require_password_reset: true,
          permissions: input.permissions,
          permission_template_id: input.template_id ?? null,
          last_login_at: null,
        };
        set((prev) => {
          const templates = prev.templates.map((t) =>
            t.id === input.template_id ? { ...t, usage_count: t.usage_count + 1 } : t,
          );
          return { ...prev, users: [...prev.users, user], templates };
        });
        return { user, password };
      },
      updateStaff(id, patch) {
        set((prev) => ({
          users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        }));
      },
      deleteStaff(id) {
        set((prev) => ({ users: prev.users.filter((u) => u.id !== id) }));
      },

      createTemplate(input) {
        const s = get();
        if (!s.session?.org_id) throw new Error("No org context");
        const tpl: PermissionTemplate = {
          id: rid("tpl"),
          org_id: s.session.org_id,
          usage_count: 0,
          ...input,
        };
        set((prev) => {
          const templates = input.is_default
            ? prev.templates.map((t) => ({ ...t, is_default: false }))
            : prev.templates;
          return { ...prev, templates: [...templates, tpl] };
        });
        return tpl;
      },
      updateTemplate(id, patch) {
        set((prev) => ({
          templates: prev.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },
      deleteTemplate(id) {
        set((prev) => ({ templates: prev.templates.filter((t) => t.id !== id) }));
      },
      setDefaultTemplate(id) {
        set((prev) => ({
          templates: prev.templates.map((t) => ({ ...t, is_default: t.id === id })),
        }));
      },

      sendReminder(stageId) {
        const s = get();
        if (!s.session?.org_id) return;
        const reminder = {
          id: rid("rmd"),
          org_id: s.session.org_id,
          stage_id: stageId,
          sent_at: nowISO(),
          channel: "EMAIL" as const,
          status: "SENT" as const,
        };
        set((prev) => ({ reminders: [reminder, ...prev.reminders] }));
      },

      updateSmtp(patch) {
        set((prev) => ({ smtp: { ...prev.smtp, ...patch } }));
      },

      advanceClock(days) {
        set((prev) => ({ clockOffsetDays: prev.clockOffsetDays + days }));
      },
      reseed() {
        const fresh = buildSeed();
        set((prev) => ({
          ...fresh,
          session: prev.session,
          clockOffsetDays: 0,
          loginAttempts: {},
        }));
      },
      loadEmptyOrg() {
        const s = get();
        if (!s.session?.org_id) return;
        const orgId = s.session.org_id;
        set((prev) => ({
          ...prev,
          sites: prev.sites.filter((x) => x.org_id !== orgId),
          plots: prev.plots.filter((x) => x.org_id !== orgId),
          customers: prev.customers.filter((x) => x.org_id !== orgId),
          bookings: prev.bookings.filter((x) => x.org_id !== orgId),
          schedule: prev.schedule.filter((st) =>
            prev.bookings.some((b) => b.id === st.booking_id && b.org_id === orgId)
              ? false
              : true,
          ),
          transactions: prev.transactions.filter((x) => x.org_id !== orgId),
          inquiries: prev.inquiries.filter((x) => x.org_id !== orgId),
        }));
      },
      createInquiry(input) {
        const s = get();
        if (!s.session?.org_id) throw new Error("No org context");
        const inq: Inquiry = {
          id: rid("inq"),
          org_id: s.session.org_id,
          plot_id: input.plot_id,
          customer_name: input.customer_name,
          phone: input.phone,
          notes: input.notes,
          created_at: nowISO(),
        };
        set((prev) => {
          const next = {
            ...prev,
            inquiries: [inq, ...prev.inquiries],
            plots: prev.plots.map((p) => p.id === input.plot_id ? { ...p, status: "INQUIRY" as const } : p),
          };
          pushAudit(next, {
            org_id: s.session!.org_id,
            actor_id: s.session!.user_id,
            actor_name: prev.users.find((u) => u.id === s.session!.user_id)?.full_name ?? "System",
            action: "INQUIRY_CREATED",
            entity_type: "inquiry",
            entity_id: inq.id,
            detail: `Created inquiry for plot ${prev.plots.find(p => p.id === input.plot_id)?.plot_number ?? ""}`,
          });
          return next;
        });
        return inq;
      },
    }),
    {
      name: "propvault.state.v3",
      version: 3,
    },
  ),
  shallow,
);

// Convenience helper for consumers that live outside React.
export const getState = () => useApp.getState();

/** "Today" respecting the demo clock offset. */
export function today(state = getState()): Date {
  return new Date(Date.now() + state.clockOffsetDays * 86400000);
}
