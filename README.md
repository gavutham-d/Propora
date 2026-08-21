# Propora — Property Management Platform

Propora is a property management application for landlords: track
properties, tenants, rent payments, and maintenance requests from a
single dashboard.

## Monorepo structure

```
propora/
├── frontend/     # React 18 + Vite UI
├── backend/      # Node.js + Express API
├── database/     # PostgreSQL schema, migrations, seeds
├── .env.example
└── .gitignore
```

## Tech stack

- **Frontend**: React 18, Vite, lucide-react
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (via `pg`)

## Prerequisites (Linux)

- Node.js 18+ and npm 9+
- PostgreSQL 12+

```bash
node --version
npm --version
psql --version
```

## Install dependencies

```bash
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

## Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL credentials and a `JWT_SECRET`.
Both the backend and the database config (`database/config.js`) read
from this same root `.env` file.

## Set up the database

```bash
# create the database
psql postgres -c "CREATE DATABASE propora;"

# apply the schema
cd backend
npm run migrate

# (optional, development only) load sample data
npm run seed
```

## Run the app

**Terminal 1 — backend**
```bash
cd backend
npm run dev
```
Runs on http://localhost:5000 (health check: `/api/health`).

**Terminal 2 — frontend**
```bash
cd frontend
npm run dev
```
Runs on http://localhost:3000 and proxies `/api` requests to the
backend (see `frontend/vite.config.js`).

Open http://localhost:3000 in your browser.

## Development notes

- Frontend source: `frontend/src/App.jsx` (hot-reloads via Vite). The
  frontend loads properties, tenants, payments, and maintenance from
  the backend API on startup (`/api/properties`, `/api/tenants`,
  `/api/payments`, `/api/maintenance`) and every add/delete/status
  action calls the corresponding endpoint — nothing is hardcoded
  client-side anymore. The backend must be running (and seeded) for
  the frontend to show data.
- Backend source: `backend/src/` (`routes/`, `controllers/`,
  `middleware/`) — restarts automatically via `node --watch`. API
  responses use camelCase field names (e.g. `propertyId`,
  `moveInDate`) matching the frontend, even though the underlying
  Postgres columns are snake_case.
- Database changes: add a `.sql` file to `database/migrations/`, then
  run `npm run migrate` from `backend/`

## Git

```bash
git init
git add .
git commit -m "Initial commit"
```
