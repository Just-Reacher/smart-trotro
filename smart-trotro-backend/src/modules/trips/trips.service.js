'use strict';

const db = require('../../config/db');
const { writeLog } = require('../../middleware/logger');

// ── Start a trip session ──────────────────────────────────────────────────────
async function startTrip(driverId, routeId) {
  // Ensure driver has no running trip already
  const existing = await db.query(
    `SELECT id FROM trips WHERE driver_id = $1 AND status = 'running' LIMIT 1`,
    [driverId]
  );
  if (existing.rows.length) {
    const err = new Error('You already have an active trip. Stop it first.');
    err.status = 409;
    throw err;
  }

  // Verify route exists
  const route = await db.query(`SELECT id, route_name FROM routes WHERE id = $1`, [routeId]);
  if (!route.rows.length) {
    const err = new Error('Route not found'); err.status = 404; throw err;
  }

  // Mark driver online
  await db.query(
    `UPDATE driver_profiles SET is_online = TRUE, updated_at = NOW() WHERE user_id = $1`,
    [driverId]
  );

  const result = await db.query(
    `INSERT INTO trips (driver_id, route_id, status) VALUES ($1, $2, 'running') RETURNING *`,
    [driverId, routeId]
  );

  await writeLog({
    userId: driverId,
    level:  'info',
    action: `Driver started trip on route: ${route.rows[0].route_name}`,
  });

  return { trip: result.rows[0], routeName: route.rows[0].route_name };
}

// ── Stop a trip session ───────────────────────────────────────────────────────
async function stopTrip(driverId) {
  const result = await db.query(
    `UPDATE trips SET status = 'completed', end_time = NOW()
     WHERE driver_id = $1 AND status = 'running'
     RETURNING *`,
    [driverId]
  );
  if (!result.rows.length) {
    const err = new Error('No active trip found'); err.status = 404; throw err;
  }

  // Mark driver offline
  await db.query(
    `UPDATE driver_profiles SET is_online = FALSE, updated_at = NOW() WHERE user_id = $1`,
    [driverId]
  );

  await writeLog({ userId: driverId, level: 'info', action: `Driver stopped trip: ${result.rows[0].id}` });
  return result.rows[0];
}

// ── Get driver trip history ───────────────────────────────────────────────────
async function getDriverHistory(driverId, { limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT t.id, t.start_time, t.end_time, t.passenger_count, t.status,
            r.route_name,
            COUNT(p.id) FILTER (WHERE p.status = 'delivered') AS parcels_delivered,
            COALESCE(SUM(tr.amount), 0) AS total_earnings
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     LEFT JOIN parcels p ON p.trip_id = t.id
     LEFT JOIN transactions tr ON tr.trip_id = t.id AND tr.status = 'completed'
     WHERE t.driver_id = $1
     GROUP BY t.id, r.route_name
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [driverId, limit, offset]
  );
  return result.rows;
}

// ── Get active trip for a driver ──────────────────────────────────────────────
async function getActiveTrip(driverId) {
  const result = await db.query(
    `SELECT t.*, r.route_name, r.start_location, r.end_location
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     WHERE t.driver_id = $1 AND t.status = 'running'
     LIMIT 1`,
    [driverId]
  );
  return result.rows[0] || null;
}

// ── Admin: all trips ──────────────────────────────────────────────────────────
async function getAllTrips({ limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT t.id, t.start_time, t.end_time, t.passenger_count, t.status, t.created_at,
            r.route_name,
            u.first_name || ' ' || u.last_name AS driver_name
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     JOIN users  u ON u.id = t.driver_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

module.exports = { startTrip, stopTrip, getDriverHistory, getActiveTrip, getAllTrips };
