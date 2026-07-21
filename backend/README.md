# PropVault Backend — NestJS + Prisma + Postgres

Runs entirely locally. No Docker required.

## Prerequisites

Install these once on your machine:

- **Node.js 20+** and npm (or bun)
- **PostgreSQL 14+** running locally
  - macOS: `brew install postgresql@16 && brew services start postgresql@16`
  - Ubuntu/Debian: `sudo apt install postgresql && sudo service postgresql start`
  - Windows: install from https://www.postgresql.org/download/windows/

## One-time Postgres setup

Open `psql` (or pgAdmin) and create the database + user:

```sql
CREATE USER propvault WITH PASSWORD 'propvault';
CREATE DATABASE propvault OWNER propvault;
GRANT ALL PRIVILEGES ON DATABASE propvault TO propvault;
```

Confirm you can connect:

```bash
psql "postgresql://propvault:propvault@localhost:5432/propvault" -c "select 1;"
```

## Run the backend

```bash
cd backend
cp .env.example .env          # edit DATABASE_URL if your creds differ
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

Backend listens on `http://localhost:3001`.

## Point the frontend at it

In the project root, create `.env.local`:

```
VITE_API_URL=http://localhost:3001
```

Restart the frontend dev server. Login now hits Postgres via `/auth/login`.
Leave `VITE_API_URL` unset to keep using the in-browser demo store.

## Demo credentials (seeded)

| Email | Password | Role |
|---|---|---|
| `super@propvault.app` | `Super@123` | Superadmin |
| `admin@shreerealty.in` | `Admin@123` | Org admin |
| `vikram@shreerealty.in` | `Staff@123` | Staff |

New users you create through signup / staff invite start with an empty
org — no sample sites, plots, or customers. Use the "Load sample data"
button in the frontend to populate them if you want the demo data.

## API surface (all under Bearer JWT except `/auth/login`)

```
POST   /auth/login                { email, password }
POST   /auth/change-password      { new_password }

GET    /sites                     list
POST   /sites                     create
PATCH  /sites/:id                 update (incl. layout JSON)
DELETE /sites/:id                 delete

GET    /plots?site_id=...         list (filter by site)
POST   /plots                     create
PATCH  /plots/:id                 update
DELETE /plots/:id                 delete

GET    /customers                 list
POST   /customers                 create
PATCH  /customers/:id             update
DELETE /customers/:id             delete

GET    /bookings                  list w/ schedule + plot + customer
POST   /bookings                  atomic booking + schedule + plot status update

GET    /transactions?direction=IN|OUT&plot_id=...
POST   /transactions              idempotent via idempotency_key

GET    /inquiries?plot_id=...
POST   /inquiries

GET    /audit                     org's audit log
POST   /audit                     append entry
GET    /audit/export.csv          download CSV

POST   /uploads                   multipart/form-data field "file" → { url }
```

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:5432`** — Postgres isn't running. Start it
  (`brew services start postgresql@16` / `sudo service postgresql start`).
- **`password authentication failed`** — `DATABASE_URL` in `.env` doesn't
  match the user/password you created above. Edit `.env` to match.
- **`database "propvault" does not exist`** — run the `CREATE DATABASE`
  SQL from the setup step.
- **`prisma migrate` hangs** — some Postgres installs default to peer auth.
  Edit `pg_hba.conf` to `md5` for local connections, or use a different
  superuser in `DATABASE_URL`.

## CORS

Set `CORS_ORIGIN` in `.env` to a comma-separated list of frontend origins:

```
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
```
