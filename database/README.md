# Propora Database

PostgreSQL database for Propora.

## Structure

- `schema/schema.sql` — full base schema (tables: `users`, `properties`,
  `tenants`, `payments`, `maintenance`). Idempotent — safe to re-run.
- `migrations/` — incremental changes applied after the base schema.
  See `migrations/README.md`.
- `seeds/` — development sample data. See `seeds/README.md`.
- `config.js` — shared `pg` connection pool, imported by the backend
  (controllers, migration script, seed script).

## Setup

```bash
# 1. Create the database
psql postgres -c "CREATE DATABASE propora;"

# 2. Apply the schema (and any migrations)
cd backend
npm run migrate

# 3. (optional, development only) load sample data
npm run seed
```

## Connection

Connection settings are read from environment variables (see
`.env.example` at the project root):

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=propora
```
