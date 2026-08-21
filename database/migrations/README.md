# Migrations

This directory holds incremental schema changes applied **after** the
base schema in `database/schema/schema.sql`.

There are no migrations yet — the base schema is applied directly by
`backend/scripts/migrate.js`.

## Adding a migration

1. Create a new `.sql` file here, prefixed with a sortable timestamp:
   ```
   20260101120000_add_column_example.sql
   ```
2. Write plain SQL (`ALTER TABLE`, `CREATE TABLE`, etc.).
3. Run it:
   ```bash
   cd backend
   npm run migrate
   ```

`npm run migrate` applies `database/schema/schema.sql` (idempotent —
safe to re-run), then applies any `.sql` files here that haven't
been applied yet, tracked in a `schema_migrations` table.
