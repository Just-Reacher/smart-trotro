'use strict';

const db = require('../../config/db');

// ── Driver updates their live GPS location ────────────────────────────────────
async function updateLocation(driverId, { latitude, longitude, tripId }) {
  // Upsert — one row per driver (always latest location)
  const result = await db.query(
    `INSERT INTO vehicle_locations (driver_id, trip_id, latitude, longitude, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (driver_id)
     DO UPDATE SET
       trip_id    = EXCLUDED.trip_id,
       latitude   = EXCLUDED.latitude,
       longitude  = EXCLUDED.longitude,
       updated_at = NOW()
     RETURNING *`,
    [driverId, tripId || null, latitude, longitude]
  );
  return result.rows[0];
}

// ── Get all live vehicles on a given route ────────────────────────────────────
async function getVehiclesOnRoute(routeId) {
  const result = await db.query(
    `SELECT vl.driver_id, vl.latitude, vl.longitude, vl.updated_at,
            u.first_name || ' ' || u.last_name AS driver_name,
            dp.vehicle_number,
            t.id AS trip_id
     FROM vehicle_locations vl
     JOIN users            u  ON u.id  = vl.driver_id
     JOIN driver_profiles  dp ON dp.user_id = vl.driver_id
     JOIN trips            t  ON t.id  = vl.trip_id
     WHERE t.route_id = $1 AND t.status = 'running'
       AND vl.updated_at > NOW() - INTERVAL '5 minutes'`,
    [routeId]
  );
  return result.rows;
}

// ── Get a single driver's latest location ─────────────────────────────────────
async function getDriverLocation(driverId) {
  const result = await db.query(
    `SELECT vl.latitude, vl.longitude, vl.updated_at,
            r.route_name, r.end_location AS destination
     FROM vehicle_locations vl
     LEFT JOIN trips  t ON t.id = vl.trip_id
     LEFT JOIN routes r ON r.id = t.route_id
     WHERE vl.driver_id = $1
     ORDER BY vl.updated_at DESC
     LIMIT 1`,
    [driverId]
  );
  if (!result.rows.length) {
    const err = new Error('No location data for this driver'); err.status = 404; throw err;
  }
  return result.rows[0];
}

module.exports = { updateLocation, getVehiclesOnRoute, getDriverLocation };
