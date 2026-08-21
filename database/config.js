import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Central PostgreSQL connection pool used by the backend
// (controllers, migration script, seed script).
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'propora'
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export default pool;
