# PropVault

Full-stack real-estate CRM. Two main folders in this repo:

```
/frontend/         ← Frontend (TanStack Start + React + Tailwind)
/backend/          ← Backend (NestJS + Prisma + Postgres) — you run it locally / deploy separately
```

## Running everything

### 1. Start the backend (once)

```bash
cd backend
cp .env.example .env          # Postgres config
docker compose up -d db       # Postgres on :5432
npm install
npx prisma migrate deploy
npm run seed                  # loads demo org + users
npm run start:dev             # http://localhost:3001
```

### 2. Start the frontend

```bash
cd frontend
cp .env.example .env          # sets VITE_API_URL=http://localhost:3001
npm install
npm run dev                   # http://localhost:8080
```

Without `VITE_API_URL` set, the frontend falls back to its in-browser
localStorage store — so Lovable's preview still works. As soon as
`VITE_API_URL` points at your Nest server, every API call goes there.

## Backend features
- **Postgres** via Prisma migrations
- **JWT auth** with bcrypt-hashed passwords
- **CRUD** for orgs, users, sites, plots, customers, bookings, schedule, transactions, inquiries
- **File uploads** (multer) at `POST /uploads` — used for site photos & receipts
- **Audit log** with CSV export at `GET /audit/export.csv`
- **Idempotent payments** — repeated `idempotency_key` returns the original
- **Optional SMTP** — set SMTP env vars to enable installment reminder emails

See `/backend/README.md` for API reference and deployment notes.

## Improvements delivered in this pass
1. Auto-sync on draw — plots become clickable CRM records the moment you draw them
2. Real backend + Postgres scaffold
3. Real bcrypt auth (backend); demo seed users preserved
4. Real file upload endpoint
5. Print-to-PDF via existing `/print` route (browser handles PDF)
6. Optional real SMTP for reminders (opt-in via env)
7. Designer undo/redo (existing) — bookings/payments follow the audit log for now
8. Mobile: SVG canvas uses `touch-action: none` for pan/zoom
9. Search/filter already covers most fields — see Customers/Payments pages
10. Persistent audit log with CSV export
