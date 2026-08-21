# Seeds

Development-only sample data lives in `backend/scripts/seed.js`. It
mirrors the mock data originally used directly in the frontend
(`frontend/src/App.jsx`) so the app looks populated once wired to the
database.

## Running seeds

```bash
cd backend
npm run seed
```

This truncates `properties`, `tenants`, `payments`, and `maintenance`
and reloads the sample records. Do not run this against a production
database.
