'use strict';

const db = require('../../config/db');
const { writeLog } = require('../../middleware/logger');

async function getAll({ status } = {}) {
  const cond   = status ? `WHERE r.status = $1` : `WHERE r.status = 'active'`;
  const params = status ? [status] : [];
  const result = await db.query(
    `SELECT r.id, r.route_name, r.start_location, r.end_location, r.status, r.created_at,
            u.first_name || ' ' || u.last_name AS created_by_name,
            fr.base_fare, fr.per_km_rate
     FROM routes r
     LEFT JOIN users u ON u.id = r.created_by
     LEFT JOIN fare_rules fr ON fr.route_id = r.id
     ${cond}
     ORDER BY r.created_at DESC`,
    params
  );
  return result.rows;
}

async function getById(id) {
  const result = await db.query(
    `SELECT r.*, fr.base_fare, fr.per_km_rate
     FROM routes r
     LEFT JOIN fare_rules fr ON fr.route_id = r.id
     WHERE r.id = $1`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Route not found'); err.status = 404; throw err;
  }
  return result.rows[0];
}

async function create({ routeName, startLocation, endLocation, baseFare, perKmRate, createdBy }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const routeResult = await client.query(
      `INSERT INTO routes (route_name, start_location, end_location, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [routeName, startLocation, endLocation, createdBy]
    );
    const route = routeResult.rows[0];

    if (baseFare !== undefined || perKmRate !== undefined) {
      await client.query(
        `INSERT INTO fare_rules (route_id, base_fare, per_km_rate) VALUES ($1, $2, $3)`,
        [route.id, baseFare || 0, perKmRate || 0]
      );
    }
    await client.query('COMMIT');
    await writeLog({ userId: createdBy, level: 'success', action: `Route created: ${routeName}` });
    return route;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(id, { routeName, startLocation, endLocation, status, baseFare, perKmRate }, adminId) {
  const result = await db.query(
    `UPDATE routes SET
       route_name     = COALESCE($1, route_name),
       start_location = COALESCE($2, start_location),
       end_location   = COALESCE($3, end_location),
       status         = COALESCE($4, status),
       updated_at     = NOW()
     WHERE id = $5 RETURNING *`,
    [routeName, startLocation, endLocation, status, id]
  );
  if (!result.rows.length) {
    const err = new Error('Route not found'); err.status = 404; throw err;
  }
  if (baseFare !== undefined || perKmRate !== undefined) {
    await db.query(
      `INSERT INTO fare_rules (route_id, base_fare, per_km_rate) VALUES ($1, $2, $3)
       ON CONFLICT (route_id) DO UPDATE SET base_fare = $2, per_km_rate = $3, updated_at = NOW()`,
      [id, baseFare || 0, perKmRate || 0]
    );
  }
  await writeLog({ userId: adminId, level: 'info', action: `Route updated: ${id}` });
  return result.rows[0];
}

async function remove(id, adminId) {
  const result = await db.query(`DELETE FROM routes WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows.length) {
    const err = new Error('Route not found'); err.status = 404; throw err;
  }
  await writeLog({ userId: adminId, level: 'warning', action: `Route deleted: ${id}` });
}

module.exports = { getAll, getById, create, update, remove };
