import { pool } from '../../../database/config.js';

const PAYMENT_COLUMNS = `
  id,
  tenant_id AS "tenantId",
  amount,
  due_date AS "dueDate",
  paid_date AS "paidDate",
  status
`;

export async function listPayments(req, res, next) {
  try {
    const { tenantId } = req.query;
    const result = tenantId
      ? await pool.query(`SELECT ${PAYMENT_COLUMNS} FROM payments WHERE tenant_id = $1 ORDER BY due_date`, [tenantId])
      : await pool.query(`SELECT ${PAYMENT_COLUMNS} FROM payments ORDER BY due_date`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createPayment(req, res, next) {
  try {
    const { tenantId, amount, dueDate, status } = req.body;
    const paidDate = status === 'Paid' ? new Date().toISOString().split('T')[0] : null;
    const result = await pool.query(
      `INSERT INTO payments (tenant_id, amount, due_date, paid_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PAYMENT_COLUMNS}`,
      [tenantId, amount, dueDate, paidDate, status || 'Pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updatePaymentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const paidDate = status === 'Paid' ? new Date().toISOString().split('T')[0] : null;
    const result = await pool.query(
      `UPDATE payments
       SET status = COALESCE($1, status),
           paid_date = $2
       WHERE id = $3
       RETURNING ${PAYMENT_COLUMNS}`,
      [status, paidDate, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
