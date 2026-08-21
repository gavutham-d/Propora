import { pool } from '../../../database/config.js';

const TENANT_COLUMNS = `
  id, name, email, phone,
  property_id AS "propertyId",
  unit, rent,
  move_in_date AS "moveInDate"
`;

export async function listTenants(req, res, next) {
  try {
    const { propertyId } = req.query;
    const result = propertyId
      ? await pool.query(`SELECT ${TENANT_COLUMNS} FROM tenants WHERE property_id = $1 ORDER BY id`, [propertyId])
      : await pool.query(`SELECT ${TENANT_COLUMNS} FROM tenants ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getTenant(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT ${TENANT_COLUMNS} FROM tenants WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createTenant(req, res, next) {
  try {
    const { name, email, phone, propertyId, unit, rent, moveInDate } = req.body;
    const result = await pool.query(
      `INSERT INTO tenants (name, email, phone, property_id, unit, rent, move_in_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${TENANT_COLUMNS}`,
      [name, email, phone || null, propertyId, unit, rent, moveInDate || new Date().toISOString().split('T')[0]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateTenant(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, phone, unit, rent } = req.body;
    const result = await pool.query(
      `UPDATE tenants
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           unit = COALESCE($4, unit),
           rent = COALESCE($5, rent)
       WHERE id = $6
       RETURNING ${TENANT_COLUMNS}`,
      [name, email, phone, unit, rent, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteTenant(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
