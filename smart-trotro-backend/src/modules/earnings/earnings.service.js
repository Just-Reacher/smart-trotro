'use strict';

const db = require('../../config/db');

// ── Driver earnings summary + breakdown ───────────────────────────────────────
async function getEarnings(driverId, { limit = 50, offset = 0 } = {}) {

  // Summary: today / week / month
  const summary = await db.query(
    `SELECT
       COALESCE(SUM(t.amount) FILTER (
         WHERE t.created_at::date = CURRENT_DATE
       ), 0)                                        AS today,
       COALESCE(SUM(t.amount) FILTER (
         WHERE t.created_at >= date_trunc('week', NOW())
       ), 0)                                        AS week,
       COALESCE(SUM(t.amount) FILTER (
         WHERE t.created_at >= date_trunc('month', NOW())
       ), 0)                                        AS month,
       COALESCE(SUM(t.amount), 0)                   AS lifetime
     FROM transactions t
     WHERE t.user_id = $1 AND t.status = 'completed'`,
    [driverId]
  );

  // Breakdown per trip
  const breakdown = await db.query(
    `SELECT
       tr.id AS trip_id,
       r.route_name,
       tr.passenger_count                          AS passengers,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'parcel_delivery'), 0) AS parcel_earnings,
       COALESCE(SUM(t.amount), 0)                  AS total_amount,
       tr.start_time::date                         AS date
     FROM trips tr
     JOIN routes r ON r.id = tr.route_id
     LEFT JOIN transactions t ON t.trip_id = tr.id AND t.status = 'completed'
     WHERE tr.driver_id = $1 AND tr.status = 'completed'
     GROUP BY tr.id, r.route_name
     ORDER BY tr.start_time DESC
     LIMIT $2 OFFSET $3`,
    [driverId, limit, offset]
  );

  return {
    summary: {
      today:    parseFloat(summary.rows[0].today).toFixed(2),
      week:     parseFloat(summary.rows[0].week).toFixed(2),
      month:    parseFloat(summary.rows[0].month).toFixed(2),
      lifetime: parseFloat(summary.rows[0].lifetime).toFixed(2),
    },
    breakdown: breakdown.rows,
  };
}

module.exports = { getEarnings };
