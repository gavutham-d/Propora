import { pool } from '../../../database/config.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const [properties, tenants, pendingPayments, pendingMaintenance] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(rent), 0) AS total_revenue, COUNT(*) AS property_count FROM properties'),
      pool.query('SELECT COUNT(*) AS tenant_count FROM tenants'),
      pool.query("SELECT COUNT(*) AS pending_count, COALESCE(SUM(amount), 0) AS pending_amount FROM payments WHERE status = 'Pending'"),
      pool.query("SELECT COUNT(*) AS pending_count FROM maintenance WHERE status != 'Completed'")
    ]);

    res.json({
      totalRevenue: Number(properties.rows[0].total_revenue),
      propertyCount: Number(properties.rows[0].property_count),
      tenantCount: Number(tenants.rows[0].tenant_count),
      pendingPayments: Number(pendingPayments.rows[0].pending_count),
      pendingPaymentsAmount: Number(pendingPayments.rows[0].pending_amount),
      pendingMaintenance: Number(pendingMaintenance.rows[0].pending_count)
    });
  } catch (err) {
    next(err);
  }
}
