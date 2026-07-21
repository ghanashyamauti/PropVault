
# PropVault — Frontend Build Plan

A frontend-only, production-quality demo of the full PropVault brief. No backend, no DB. All state runs on a seeded fixture layered with a `localStorage` overlay so every action (drawing plots, recording payments, booking, staff edits, designer changes) persists across reloads and can be reset from Settings.

Visual system locked to your chosen "Architectural minimalism" direction: warm off-white surface (`#f8fafc`), deep slate ink (`#0f172a`), single restrained gold accent (`#92400e`), emerald for IN, gold for OUT/warnings, Playfair Display for display numbers/headings, Inter for UI, tabular-nums throughout money.

## Suggested improvements over the brief

Before building I want to flag these — you can accept or reject each; defaults shown:

1. **Command palette (⌘K)** across the app — jump to any site, plot, customer, or action. Serious operator tool. *(default: yes)*
2. **Global filter chips in the top bar** — active site, active fiscal year — carried across Dashboard/Customers/Payments so numbers stay coherent. *(default: yes)*
3. **Empty-state coaching** on every module (Sites, Customers, Payments, Staff) with a one-click "Load sample data" so the demo never feels blank. *(default: yes, since we always seed anyway)*
4. **Keyboard shortcuts in the designer** — V select, P plot, R road, G garden, T tree, Del delete, Ctrl+Z/Y, +/- zoom, F fit, Space+drag pan. *(default: yes)*
5. **Print/Export view for the master plan** — clean parchment SVG with title block, legend, north arrow, scale bar; opens in a new tab, browser prints it as a real brochure. *(default: yes)*
6. **Customer statement PDF-look page** — one screen per customer with schedule, payments, arrears — print-ready. Not real PDF gen; browser print. *(default: yes)*
7. **Booking wizard as a 4-step modal** (Plot → Customer → Pricing → Schedule preview) with atomic commit — feels much more premium than a single form. *(default: yes)*
8. **Audit log drawer** visible from every entity (who changed what, when) — pulled from the same in-memory audit stream. *(default: yes)*
9. **"Demo controls" floating tab** — reset data, jump 30 days forward (so overdues appear), reseed. Removes the friction of testing time-based flows without a backend. *(default: yes)*
10. **Notifications tray** in top bar — overdue installments, new inquiries, staff activity. Wired to seeded events. *(default: yes)*

I'll include all 10 unless you say otherwise.

## Stack (frontend only)

TanStack Start template as-is (Vite + React 19 + TanStack Router + Query + Tailwind v4). No backend, no server functions, no DB. All data flows through a `store` layer:

- `src/data/seed.ts` — deterministic seed (org, users, sites, plots, customers, bookings, schedule, transactions, inquiries, templates, audit).
- `src/data/store.ts` — Zustand store with `persist` middleware (localStorage key `propvault.state.v1`). Every mutation is a pure reducer; append-only ledger; derived customer status computed from schedule.
- `src/data/selectors.ts` — memoized selectors (KPIs, overdue, area math, permission checks).
- `src/data/reset.ts` — full reset + "jump N days" (shifts `today` reference so overdues appear).

This mirrors the real backend's shape 1:1, so swapping to the NestJS API later means replacing `store.ts` with an API client — no UI rewrite.

## Routes (all under TanStack file-based routing)

```text
/login                                    universal login, role-routed
/change-password                          forced first-login flow

/superadmin/
  dashboard                               platform KPIs
  organizations                           directory
  organizations/new                       create wizard
  organizations/$id                       detail + actions

/app/
  dashboard                               tenant home
  sites                                   photo card grid
  sites/new · sites/$id                   detail (map/list, filters, add plot)
  sites/$id/designer                      the drag-and-drop centerpiece
  sites/$id/print                         printable master plan
  customers                               directory + expandable schedules
  customers/$id                           statement view
  payments                                money in/out ledger
  payments/new                            record payment/payout modal
  staff                                   hierarchy directory
  staff/new · staff/$id                   2-step wizard w/ permission matrix
  templates                               permission templates CRUD
  settings                                org + profile + reset demo data
```

## Universal login behavior

Seeded creds only, JWT simulated by a `session` object in the store:

- `super@propvault.app / Super@123` → `/superadmin/dashboard`
- `admin@shreerealty.in / Admin@123` → `/app/dashboard` (first login: `/change-password`)
- `vikram@shreerealty.in / Staff@123` → `/app/dashboard` (limited perms)

5-attempt / 15-min lockout implemented in-memory. Suspended-org users blocked with correct error message. Route guards deny-by-default based on the `permissions` JSONB matrix (same shape as the real backend).

## Designer (the centerpiece)

Custom SVG canvas, no third-party CAD lib. Coordinate space in meters, rendered responsively. All interactions from the brief:

- Left palette: Plot, Road, Garden, Tree, Gate, Water Tank, Clubhouse, Parking, DP Box, Text Label — labeled tiles with hover hint per tool.
- Parchment canvas (`#f5efe0`), faint 0.5m grid, double-amber boundary wall, N compass, scale bar, status legend.
- Plot: drag rectangle → auto-numbered; corner handles reshape into polygon; + on edges adds a corner; Alt+click removes one; drag body to move; area recomputes live in site unit.
- Road: drop segment; drag round points to bend into curves (Catmull-Rom → smooth SVG path); + handles add bends; width slider 3–24 m; dashed centerline; road name flows along the curve.
- Right inspector: only the selected element's fields.
- Right summary card: counts, total value, real collected from linked CRM transactions (never estimated when linked).
- Controls: pan (drag empty), wheel-zoom at cursor, Fit, snap-to-grid (~0.5 m), Delete, Ctrl+D duplicate, Ctrl+Z/Y (30-step history), Edit/View toggle, status filter chips with dimming.
- Details modal: click plot → status pill, area, price, buyer; Edit mode shows Mark-as buttons (never silent cycling). CRM-linked plots deep-link to the full Plot Drawer.
- Persistence: `sites[id].layout` JSONB in store + `propvault.siteplan.<siteId>` autosave draft, restored on mount, cleared on Save.
- Extras: SVG export ("Print/Export" opens a clean parchment page), Share (copy URL), "Start from sample layout", "Add drawn plots to CRM" (creates plot rows from bounding box + polygon area).
- Same renderer powers the read-only Map view on Site Detail (`interactive={false}` prop).

## Modules — production polish, everything wired

**SuperAdmin:** overview KPIs, orgs directory with status tabs + search, create-org wizard with generated password shown once, org detail with reset-password, suspend/reactivate/delete, activity log.

**Tenant Dashboard:** 4 KPIs (Collected / Pending / Payable / Net) with sparklines and deltas, cash-flow area chart (SVG, no Recharts dep needed for the demo — cleaner), Upcoming Installments with Send Reminder (opens SMTP-style modal), Recent Transactions with IN/OUT pills, My Sites cards with progress bars.

**Sites & Site Detail:** photo card grid, add/edit with image upload (base64 to store), Site Detail with filter chips + search, Map/List toggle, +Add/Edit Plot with length × width → auto-area (overridable) + price/facing/type/status, Open Designer.

**Plot Drawer:** info, customer with `tel:` / `wa.me/` deep links, payment timeline with progress, inquiries thread, Record Payment (partial + idempotency key), Book Plot atomic 4-step wizard, Mark-as buttons.

**Customers:** 4 counters, search/filters, derived-status pills (On Track / Fully Paid / Overdue / Token Only — computed, never stored), expandable schedule rows with per-stage reminder, statement view.

**Payments:** Money In / Money Out tabs, 4 metric cards each, filters, append-only ledger (edits/deletes disabled; corrections are reversal rows), receipt upload/download (base64), Record Payment/Payout with idempotency key.

**Staff:** hierarchy-indented directory, 2-step wizard (details → permission matrix with View/Add/Edit/Delete + View-Team's-Data), quick presets (Field Agent / Team Manager / Full Access), Save-as-Template, generated password shown once.

**Permission Templates:** cards, default flag, usage counts, CRUD.

**Settings:** org profile, my profile, change password, SMTP config UI (stored but non-functional — clearly labeled "demo"), **Demo Controls** (Reset all data, Reseed, Jump 30 days forward, Load empty state).

## Technical implementation notes

- **Money**: strings in store, parsed with `decimal.js` for math, formatted with `Intl.NumberFormat('en-IN')` at the view. No floats.
- **IDs**: `crypto.randomUUID()`.
- **Area unit**: site's `area_unit` drives every label + conversion.
- **Derived customer status**: pure function `getCustomerStatus(schedule, today)`.
- **Idempotency**: `Record Payment` requires a UUID key; store dedupes by `(org, key)`.
- **Audit**: every mutation appends to `audit_log`; drawer reads latest 100 for the entity.
- **Reminders**: "Send Reminder" opens a modal showing the composed email body (no SMTP call), logs the reminder event.
- **Routing**: TanStack file-based; `_authenticated` layout for `/app/*`, `_superadmin` for `/superadmin/*`, both gated on session + permission matrix.
- **Component library**: shadcn (already installed on template) + custom primitives for the designer, KPI card, ledger table, status pill.
- **Fonts**: Playfair Display + Inter via `<link>` in `__root.tsx` (Tailwind v4 rule).
- **Theme tokens**: extend `src/styles.css` with `--color-brand-slate / -gold / -emerald / -surface / -parchment` in `@theme`.
- **Portability**: designer + plan renderer are pure presentational components taking `layout` JSON + plot rows as props.

## Delivery shape

Single-pass build, all screens, all polish, seeded data ready — you log in at `/login` and can click through every flow end-to-end without any placeholder pages. This is a large scope; expect a substantial build. When you approve, I'll switch to build mode and execute in one pass.

Reply "approved" (or edit any of the 10 improvements above) and I'll start building.
