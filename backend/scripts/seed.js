import 'dotenv/config';
import { pool } from '../../database/config.js';

// Sample data mirrors the mock data originally used in the frontend
// (frontend/src/App.jsx) so the app looks the same when wired to the DB.
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('TRUNCATE payments, maintenance, tenants, properties RESTART IDENTITY CASCADE');

    const propertiesResult = await client.query(`
      INSERT INTO properties (address, city, units, rent, occupancy) VALUES
        ('1205 Oak Street', 'Portland, OR', 2, 3200, 100),
        ('342 Maple Avenue', 'Portland, OR', 1, 1800, 100)
      RETURNING id, address
    `);
    const [property1, property2] = propertiesResult.rows;

    const tenantsResult = await client.query(
      `
      INSERT INTO tenants (name, email, phone, property_id, unit, rent, move_in_date) VALUES
        ('Sarah Mitchell', 'sarah.m@email.com', '555-0101', $1, '201', 1600, '2023-06-15'),
        ('Marcus Johnson', 'mjohnson@email.com', '555-0102', $1, '202', 1600, '2024-01-10'),
        ('Emily Chen', 'emily.chen@email.com', '555-0103', $2, 'Full', 1800, '2022-11-20')
      RETURNING id, name
      `,
      [property1.id, property2.id]
    );
    const [tenant1, tenant2, tenant3] = tenantsResult.rows;

    await client.query(
      `
      INSERT INTO payments (tenant_id, amount, due_date, paid_date, status) VALUES
        ($1, 1600, '2025-09-01', '2025-08-28', 'Paid'),
        ($2, 1600, '2025-09-01', NULL, 'Pending'),
        ($3, 1800, '2025-09-05', NULL, 'Pending')
      `,
      [tenant1.id, tenant2.id, tenant3.id]
    );

    await client.query(
      `
      INSERT INTO maintenance (property_id, unit, title, description, priority, status, submitted, assigned_to, cost) VALUES
        ($1, '201', 'Leaky kitchen faucet', 'Water dripping from under sink', 'Medium', 'In Progress', '2025-08-20', $3, 150),
        ($1, '202', 'Bedroom light fixture broken', 'Not turning on', 'Low', 'Submitted', '2025-08-22', NULL, 75),
        ($2, 'Full', 'HVAC annual service', 'Quarterly maintenance', 'High', 'Completed', '2025-08-01', $4, 250)
      `,
      [property1.id, property2.id, "Mike's Plumbing", 'CoolAir HVAC']
    );

    await client.query('COMMIT');
    console.log('Seed data loaded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
