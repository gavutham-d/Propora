import { pool } from '../../../database/config.js';

export async function listProperties(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM properties ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getProperty(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createProperty(req, res, next) {
  try {
    const { address, city, units, rent } = req.body;
    const result = await pool.query(
      `INSERT INTO properties (address, city, units, rent, occupancy)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING *`,
      [address, city, units, rent || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateProperty(req, res, next) {
  try {
    const { id } = req.params;
    const { address, city, units, rent, occupancy } = req.body;
    const result = await pool.query(
      `UPDATE properties
       SET address = COALESCE($1, address),
           city = COALESCE($2, city),
           units = COALESCE($3, units),
           rent = COALESCE($4, rent),
           occupancy = COALESCE($5, occupancy)
       WHERE id = $6
       RETURNING *`,
      [address, city, units, rent, occupancy, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteProperty(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM properties WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
