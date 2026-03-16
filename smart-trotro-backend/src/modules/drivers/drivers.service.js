'use strict';

const db = require('../../config/db');

// ── Get driver stats for dashboard ───────────────────────────────────────────
async function getDriverStats(driverId) {
  const [trips, parcels, earnings, active] = await Promise.all([
    db.query(
      `SELECT COUNT(*) FROM trips
       WHERE driver_id = $1 AND status = 'completed'
         AND start_time::date = CURRENT_DATE`,
      [driverId]
    ),
    db.query(
      `SELECT COUNT(*) FROM parcels
       WHERE driver_id = $1 AND status = 'delivered'
         AND updated_at::date = CURRENT_DATE`,
      [driverId]
    ),
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND status = 'completed'`,
      [driverId]
    ),
    db.query(
      `SELECT t.id, r.route_name
       FROM trips t
       JOIN routes r ON r.id = t.route_id
       WHERE t.driver_id = $1 AND t.status = 'running'
       LIMIT 1`,
      [driverId]
    ),
  ]);

  return {
    todayTrips:       parseInt(trips.rows[0].count, 10),
    parcelDeliveries: parseInt(parcels.rows[0].count, 10),
    totalEarnings:    parseFloat(earnings.rows[0].total).toFixed(2),
    activeRoute:      active.rows[0]?.route_name || null,
    activeTrip:       active.rows[0]?.id || null,
  };
}

// ── Get all online drivers (for admin map view) ───────────────────────────────
async function getOnlineDrivers() {
  const result = await db.query(
    `SELECT u.id, u.first_name || ' ' || u.last_name AS name,
            dp.vehicle_number, dp.is_online,
            r.route_name AS current_route,
            vl.latitude, vl.longitude, vl.updated_at
     FROM users u
     JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN trips t  ON t.driver_id = u.id AND t.status = 'running'
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN vehicle_locations vl ON vl.driver_id = u.id
     WHERE dp.is_online = TRUE AND u.status = 'active'`
  );
  return result.rows;
}

module.exports = { getDriverStats, getOnlineDrivers };
