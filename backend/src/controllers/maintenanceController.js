import { pool } from '../../../database/config.js';

const MAINTENANCE_COLUMNS = `
  id,
  property_id AS "propertyId",
  unit, title, description, priority, status, submitted,
  assigned_to AS "assignedTo",
  cost
`;

export async function listMaintenance(req, res, next) {
  try {
    const { propertyId } = req.query;
    const result = propertyId
      ? await pool.query(`SELECT ${MAINTENANCE_COLUMNS} FROM maintenance WHERE property_id = $1 ORDER BY submitted DESC`, [propertyId])
      : await pool.query(`SELECT ${MAINTENANCE_COLUMNS} FROM maintenance ORDER BY submitted DESC`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createMaintenance(req, res, next) {
  try {
    const { propertyId, unit, title, description, priority, cost } = req.body;
    const result = await pool.query(
      `INSERT INTO maintenance (property_id, unit, title, description, priority, status, submitted, assigned_to, cost)
       VALUES ($1, $2, $3, $4, $5, 'Submitted', CURRENT_DATE, NULL, $6)
       RETURNING ${MAINTENANCE_COLUMNS}`,
      [propertyId, unit, title, description || '', priority || 'Medium', cost || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateMaintenanceStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    const result = await pool.query(
      `UPDATE maintenance
       SET status = COALESCE($1, status),
           assigned_to = COALESCE($2, assigned_to)
       WHERE id = $3
       RETURNING ${MAINTENANCE_COLUMNS}`,
      [status, assignedTo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteMaintenance(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM maintenance WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
